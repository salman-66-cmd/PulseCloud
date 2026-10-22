import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
import app.models  # Ensure all models are registered
from app.api.v1.api import api_router
from app.services.scheduler import start_scheduler, stop_scheduler
from app.api.v1.system import seed_demo_data

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("pulsecloud")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize DB schema
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # 2. Seed initial demo data if database is fresh
    if settings.SEED_DEMO_DATA:
        db = SessionLocal()
        try:
            seed_demo_data(db)
        except Exception as e:
            logger.warning(f"Demo seed notice: {e}")
        finally:
            db.close()

    # 3. Start background monitoring scheduler
    start_scheduler()
    logger.info("PulseCloud API Health & Performance Monitor started successfully.")

    yield

    # Teardown
    stop_scheduler()
    logger.info("PulseCloud services shut down gracefully.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description=(
        "Enterprise-grade Cloud API Health, Latency, and Availability Monitoring Platform. "
        "Built for the Cloud Computing Mini-Project."
    ),
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "documentation": "/docs",
        "health_check": f"{settings.API_V1_STR}/system/health"
    }
