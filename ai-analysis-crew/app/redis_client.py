"""
Redis client for ai-analysis-crew (Redis Labs or any Redis).
Set REDIS_URL or REDIS_HOST/PORT/USERNAME/PASSWORD.
Used for caching (dashboard/stats), Pub/Sub for real-time job updates, and optional job queue.
"""
import json
import os
import logging
import queue
import threading
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Channel for crew job status updates (publish from workers, subscribe in API to push to WebSockets)
CHANNEL_JOB_UPDATES = "crew_job_updates"

REDIS_URL = os.environ.get("REDIS_URL", "").strip()
REDIS_HOST = os.environ.get("REDIS_HOST", "").strip()
REDIS_PORT = os.environ.get("REDIS_PORT", "").strip()
REDIS_USERNAME = os.environ.get("REDIS_USERNAME", "default").strip() or "default"
REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", "").strip()

_redis_client: Optional[Any] = None

# Redis requires redis:// or rediss:// when using REDIS_URL
_VALID_SCHEMES = ("redis://", "rediss://")


def _has_valid_scheme(url: str) -> bool:
    return bool(url) and url.startswith(_VALID_SCHEMES)


def _has_host_port() -> bool:
    return bool(REDIS_HOST and REDIS_PORT)


def is_redis_configured() -> bool:
    return _has_valid_scheme(REDIS_URL) or _has_host_port()


def get_redis():
    """Return a Redis client. Uses REDIS_URL (redis://...) or REDIS_HOST/PORT/USERNAME/PASSWORD."""
    global _redis_client
    if not is_redis_configured():
        return None
    if _redis_client is not None:
        return _redis_client
    try:
        import redis
        if _has_valid_scheme(REDIS_URL):
            _redis_client = redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5,
            )
        else:
            _redis_client = redis.Redis(
                host=REDIS_HOST,
                port=int(REDIS_PORT),
                username=REDIS_USERNAME if REDIS_PASSWORD else None,
                password=REDIS_PASSWORD or None,
                decode_responses=True,
                socket_connect_timeout=5,
            )
        _redis_client.ping()
        logger.info("Redis connected")
        return _redis_client
    except Exception as e:
        logger.warning("Redis connection failed: %s", e)
        _redis_client = None
        return None


def cache_get(key: str) -> Optional[Any]:
    """Get a JSON value from Redis. Returns None if not found or Redis unavailable."""
    r = get_redis()
    if not r:
        return None
    try:
        raw = r.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as e:
        logger.debug("Redis cache_get error: %s", e)
        return None


def cache_set(key: str, value: Any, ttl_seconds: int = 60) -> bool:
    """Set a JSON value in Redis with TTL. Returns True if set, False if Redis unavailable."""
    r = get_redis()
    if not r:
        return False
    try:
        r.setex(key, ttl_seconds, json.dumps(value, default=str))
        return True
    except Exception as e:
        logger.debug("Redis cache_set error: %s", e)
        return False


def cache_delete(key: str) -> bool:
    """Delete a key from Redis. Returns True if deleted or Redis unavailable (no-op)."""
    r = get_redis()
    if not r:
        return True
    try:
        r.delete(key)
        return True
    except Exception as e:
        logger.debug("Redis cache_delete error: %s", e)
        return False


# --- Pub/Sub for real-time job updates ---


def publish_job_update(payload: dict) -> bool:
    """
    Publish a crew job update to Redis so subscribers (e.g. WebSocket broadcaster) can push to clients.
    payload should include: job_id, status, current_stage?, progress?, user_id?, error_message?
    """
    r = get_redis()
    if not r:
        return False
    try:
        msg = json.dumps(payload, default=str)
        r.publish(CHANNEL_JOB_UPDATES, msg)
        return True
    except Exception as e:
        logger.debug("Redis publish_job_update error: %s", e)
        return False


def start_job_updates_subscriber(message_queue: "queue.Queue[dict]") -> Optional[threading.Thread]:
    """
    Start a background thread that subscribes to crew_job_updates and puts each message (parsed JSON)
    into message_queue. Returns the thread so caller can keep a reference; thread is daemon.
    Returns None if Redis is not configured.
    """
    if not is_redis_configured():
        return None
    r = get_redis()
    if not r:
        return None
    try:
        pubsub = r.pubsub()
        pubsub.subscribe(CHANNEL_JOB_UPDATES)

        def listen():
            while True:
                try:
                    msg = pubsub.get_message(timeout=1.0)
                    if msg and msg.get("type") == "message" and msg.get("data"):
                        data = msg["data"]
                        if isinstance(data, str):
                            try:
                                message_queue.put(json.loads(data))
                            except json.JSONDecodeError:
                                pass
                except Exception as e:
                    logger.debug("Redis subscriber error: %s", e)

        t = threading.Thread(target=listen, daemon=True)
        t.start()
        logger.info("Redis Pub/Sub subscriber started for %s", CHANNEL_JOB_UPDATES)
        return t
    except Exception as e:
        logger.warning("Redis subscriber start failed: %s", e)
        return None
