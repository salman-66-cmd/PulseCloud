import asyncio
import logging
from datetime import datetime, timezone
from typing import Set
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.endpoint import Endpoint
from app.services.monitoring import execute_http_check
from app.services.evaluator import evaluate_and_record_check

logger = logging.getLogger("pulsecloud.scheduler")

# Concurrency & deduplication state
_in_flight_endpoints: Set[int] = set()
_scheduler_task: asyncio.Task = None
_stop_event = asyncio.Event()
_semaphore = asyncio.Semaphore(20)  # Bounded concurrency


async def _run_single_check(endpoint_id: int):
    """
    Executes a single check with bounded concurrency, deduplication, and error isolation.
    """
    if endpoint_id in _in_flight_endpoints:
        return
    _in_flight_endpoints.add(endpoint_id)

    async with _semaphore:
        db: Session = SessionLocal()
        try:
            endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id, Endpoint.is_active == True).first()
            if not endpoint:
                return

            check_data = await execute_http_check(endpoint, source="scheduled")
            evaluate_and_record_check(db, endpoint, check_data)
        except Exception as e:
            logger.error(f"Error executing scheduled check for endpoint {endpoint_id}: {e}", exc_info=True)
        finally:
            db.close()
            _in_flight_endpoints.discard(endpoint_id)


async def scheduler_loop():
    """
    Periodic background scheduler loop.
    Evaluates endpoints and triggers checks based on their configured interval.
    """
    logger.info("PulseCloud Monitoring Scheduler started.")
    while not _stop_event.is_set():
        try:
            db: Session = SessionLocal()
            try:
                active_endpoints = db.query(Endpoint).filter(Endpoint.is_active == True).all()
                now = datetime.now(timezone.utc)

                for ep in active_endpoints:
                    should_check = False
                    if ep.last_checked_at is None:
                        should_check = True
                    else:
                        last_c = ep.last_checked_at
                        if last_c.tzinfo is None:
                            last_c = last_c.replace(tzinfo=timezone.utc)
                        delta = (now - last_c).total_seconds()
                        if delta >= ep.check_interval_seconds:
                            should_check = True

                    if should_check and ep.id not in _in_flight_endpoints:
                        if settings.SCHEDULER_MODE == "celery":
                            try:
                                from app.workers.celery_app import run_endpoint_check_task
                                run_endpoint_check_task.delay(ep.id)
                            except Exception as ex:
                                # Fallback to asyncio if Celery worker/broker isn't reachable
                                asyncio.create_task(_run_single_check(ep.id))
                        else:
                            asyncio.create_task(_run_single_check(ep.id))
            finally:
                db.close()
        except Exception as ex:
            logger.error(f"Scheduler tick error: {ex}", exc_info=True)

        try:
            # Sleep in small slices to respond quickly to shutdown events
            await asyncio.wait_for(_stop_event.wait(), timeout=3.0)
        except asyncio.TimeoutError:
            pass


def start_scheduler():
    """Starts the background scheduler task."""
    global _scheduler_task, _stop_event
    _stop_event.clear()
    loop = asyncio.get_event_loop()
    _scheduler_task = loop.create_task(scheduler_loop())


def stop_scheduler():
    """Gracefully stops the scheduler task."""
    global _stop_event
    _stop_event.set()
    logger.info("PulseCloud Monitoring Scheduler stopped.")
