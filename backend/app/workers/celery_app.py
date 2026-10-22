import asyncio
import os
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "pulsecloud_workers",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=60,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "check-endpoints-every-5-seconds": {
            "task": "app.workers.celery_app.check_all_due_endpoints_task",
            "schedule": 5.0,
        },
    }
)


@celery_app.task(name="app.workers.celery_app.run_endpoint_check_task")
def run_endpoint_check_task(endpoint_id: int):
    """Celery task to run health check for an individual endpoint."""
    from app.db.session import SessionLocal
    from app.models.endpoint import Endpoint
    from app.services.monitoring import execute_http_check
    from app.services.evaluator import evaluate_and_record_check

    db = SessionLocal()
    try:
        endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id, Endpoint.is_active == True).first()
        if not endpoint:
            return {"status": "not_found_or_inactive"}

        # Run async check in worker loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            check_data = loop.run_until_complete(execute_http_check(endpoint, source="scheduled_celery"))
        finally:
            loop.close()

        result = evaluate_and_record_check(db, endpoint, check_data)
        return {
            "endpoint_id": endpoint_id,
            "outcome": result.outcome,
            "status_code": result.status_code,
            "duration_ms": result.duration_ms
        }
    finally:
        db.close()


@celery_app.task(name="app.workers.celery_app.check_all_due_endpoints_task")
def check_all_due_endpoints_task():
    """Beat task that schedules due checks across Celery worker pool."""
    from datetime import datetime, timezone
    from app.db.session import SessionLocal
    from app.models.endpoint import Endpoint

    db = SessionLocal()
    try:
        active_endpoints = db.query(Endpoint).filter(Endpoint.is_active == True).all()
        now = datetime.now(timezone.utc)
        dispatched = 0

        for ep in active_endpoints:
            should_check = False
            if ep.last_checked_at is None:
                should_check = True
            else:
                last_c = ep.last_checked_at
                if last_c.tzinfo is None:
                    last_c = last_c.replace(tzinfo=timezone.utc)
                if (now - last_c).total_seconds() >= ep.check_interval_seconds:
                    should_check = True

            if should_check:
                run_endpoint_check_task.delay(ep.id)
                dispatched += 1

        return {"dispatched_count": dispatched}
    finally:
        db.close()
