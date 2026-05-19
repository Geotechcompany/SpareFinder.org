"""Crew kickoff with native streaming (CrewAI >= 1.6) or task callbacks as fallback."""



from __future__ import annotations



import logging

import os

import time

from typing import Any, Callable, Optional



from crewai import Crew



from .crew_job_cancel import (
    CrewJobCancelledError,
    ensure_not_cancelled,
    is_crew_job_cancelled,
)
from .database_storage import (
    extract_identified_part_label,
    update_crew_job_identified_part,
    update_crew_job_status,
)



logger = logging.getLogger(__name__)



# Sequential tasks in setup_crew: identify → research → supplier → report → email

# Stage keys must match History UI (CrewAnalysisProgress / CREW_STAGES).

_STREAM_TASK_STAGES: list[tuple[str, int, int]] = [

    ("part_identifier", 22, 38),

    ("research_agent", 38, 58),

    ("supplier_finder", 58, 72),

    ("report_generator", 72, 78),

    ("email_agent", 78, 82),

]



_AGENT_ROLE_TO_STAGE: dict[str, str] = {

    "Part Identifier": "part_identifier",

    "Technical Research Specialist": "research_agent",

    "Supplier Finder": "supplier_finder",

    "Report Compiler": "report_generator",

    "Completion Coordinator": "email_agent",

}





def _persist_stage(job_id: str, stage: str, progress: int) -> None:
    if is_crew_job_cancelled(job_id):
        return
    ok = update_crew_job_status(job_id, "processing", stage, progress)

    if ok:

        logger.info("Crew progress job=%s stage=%s progress=%s", job_id[:8], stage, progress)





def _finalize_crew_progress(job_id: str) -> None:

    """Mark agent pipeline done; post-crew PDF/email steps advance further in main.py."""

    _persist_stage(job_id, "report_generator", 78)





_DB_THROTTLE_SEC = 3.0





def crew_streaming_enabled() -> bool:

    flag = os.getenv("CREW_STREAMING", "true").strip().lower()

    return flag not in ("0", "false", "no", "off")





def _progress_for_task(task_index: int, *, bump: float = 0.0) -> tuple[str, int]:

    if 0 <= task_index < len(_STREAM_TASK_STAGES):

        stage, lo, hi = _STREAM_TASK_STAGES[task_index]

        if bump <= 0:

            return stage, lo

        span = max(1, hi - lo)

        pct = min(hi, lo + int(span * min(1.0, bump)))

        return stage, pct

    return "execution", 30





def _agent_role_from_output(output: Any) -> str:

    """Resolve agent role from CrewAI TaskOutput (role string or Agent object)."""

    agent = getattr(output, "agent", None)

    if agent is not None:

        role = getattr(agent, "role", None)

        if role:

            return str(role).strip()

        text = str(agent).strip()

        for known_role in _AGENT_ROLE_TO_STAGE:

            if known_role.lower() in text.lower():

                return known_role

        return text



    for attr in ("agent_role", "role"):

        value = getattr(output, attr, None)

        if value:

            return str(value).strip()

    return ""





def _task_output_text(output: Any) -> str:

    for attr in ("raw", "raw_output", "exported_output", "output"):

        value = getattr(output, attr, None)

        if value is not None and str(value).strip():

            return str(value)

    result_fn = getattr(output, "result", None)

    if callable(result_fn):

        try:

            return str(result_fn())

        except Exception:

            pass

    return str(output)





def _handle_task_completed(job_id: str, output: Any) -> None:

    role = _agent_role_from_output(output)

    stage = _AGENT_ROLE_TO_STAGE.get(role)

    if not stage:

        logger.warning("task_callback: unmapped agent role %r", role)

        return



    for idx, (stage_key, _lo, hi) in enumerate(_STREAM_TASK_STAGES):

        if stage_key != stage:

            continue

        _persist_stage(job_id, stage_key, hi)

        if stage_key == "part_identifier":

            label = extract_identified_part_label(_task_output_text(output))

            if label:

                update_crew_job_identified_part(job_id, label, stage_key, hi)

        if idx + 1 < len(_STREAM_TASK_STAGES):

            next_stage, next_lo, _ = _STREAM_TASK_STAGES[idx + 1]

            _persist_stage(job_id, next_stage, next_lo)

        break





def create_task_progress_callback(job_id: str) -> Callable[[Any], None]:

    """Called after each crew task completes — drives History stage updates."""



    completed: set[str] = set()



    def on_task_done(output: Any) -> None:

        role = _agent_role_from_output(output)

        stage = _AGENT_ROLE_TO_STAGE.get(role)

        if not stage or stage in completed:

            if not stage:

                logger.warning("task_callback: unmapped agent %r", role)

            return

        completed.add(stage)

        _handle_task_completed(job_id, output)



    return on_task_done





def run_crew_kickoff(crew: Crew, job_id: Optional[str] = None) -> Any:

    """

    Run crew.kickoff() and persist progress to crew_analysis_jobs.



    With stream=True (CrewAI >= 1.6), iterates streaming chunks for live updates.

    Otherwise uses task_callback on the Crew instance.

    """

    if not getattr(crew, "stream", False) or not job_id:
        if job_id:
            ensure_not_cancelled(job_id)

        result = crew.kickoff()

        if job_id:
            ensure_not_cancelled(job_id)
            _finalize_crew_progress(job_id)

        return result



    try:

        from crewai.types.streaming import StreamChunkType  # noqa: F401

    except ImportError:

        logger.warning("Crew streaming types unavailable; using plain kickoff()")

        if job_id:
            ensure_not_cancelled(job_id)

        result = crew.kickoff()

        if job_id:
            ensure_not_cancelled(job_id)
            _finalize_crew_progress(job_id)

        return result



    streaming = crew.kickoff()

    last_db_write = 0.0

    current_task_index = -1

    chunks_in_task = 0



    for chunk in streaming:
        if job_id:
            ensure_not_cancelled(job_id)

        idx = int(getattr(chunk, "task_index", -1))

        role = (getattr(chunk, "agent_role", "") or "").strip()

        stage = _AGENT_ROLE_TO_STAGE.get(role)



        if idx != current_task_index:

            current_task_index = idx

            chunks_in_task = 0

            if stage is None:

                stage, pct = _progress_for_task(idx)

            else:

                _, pct = _progress_for_task(idx)

            _persist_stage(job_id, stage, pct)

            last_db_write = time.monotonic()

            continue



        chunks_in_task += 1

        now = time.monotonic()

        if now - last_db_write < _DB_THROTTLE_SEC:

            continue



        if stage is None:

            stage, _ = _progress_for_task(idx)

        bump = min(0.9, chunks_in_task / 60.0)

        _, pct = _progress_for_task(idx, bump=bump)

        _persist_stage(job_id, stage, pct)

        last_db_write = now



    if job_id:

        _finalize_crew_progress(job_id)



    return streaming.result


