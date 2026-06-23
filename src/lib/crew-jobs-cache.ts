const CREW_JOBS_CACHE_PREFIX = "sparefinder:crew_jobs:";
const CREW_JOBS_CACHE_MAX = 50;

function crewJobsCacheKey(userId: string) {
  return `${CREW_JOBS_CACHE_PREFIX}${userId}`;
}

export function readCrewJobsCache(userId: string): any[] {
  try {
    const raw = sessionStorage.getItem(crewJobsCacheKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((j) => ({
      ...j,
      _uniqueCardKey: j.id ?? j._uniqueCardKey,
    }));
  } catch {
    return [];
  }
}

export function writeCrewJobsCache(userId: string, jobs: any[]) {
  try {
    const payload = jobs
      .filter((j) => j?.id)
      .slice(0, CREW_JOBS_CACHE_MAX)
      .map(({ _optimistic, ...rest }) => rest);
    sessionStorage.setItem(crewJobsCacheKey(userId), JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable
  }
}

export function removeCrewJobFromCache(userId: string, jobId: string) {
  if (!userId || !jobId) return;
  const cached = readCrewJobsCache(userId);
  writeCrewJobsCache(
    userId,
    cached.filter((j) => j.id !== jobId)
  );
}

export function prependCrewJobToCache(userId: string, job: any) {
  if (!userId || !job?.id) return;
  const cached = readCrewJobsCache(userId);
  const row = { ...job, _uniqueCardKey: job.id };
  writeCrewJobsCache(userId, [
    row,
    ...cached.filter((j) => j.id !== job.id),
  ]);
}
