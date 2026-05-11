from contextlib import asynccontextmanager

import firebase_admin
import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from firebase_admin import credentials
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.routes.detect import router as detect_router
from app.api.routes.notify import router as notify_router
from app.api.routes.user import router as user_router
from app.core.config import settings
from app.core.limiter import limiter
from app.core.logging import get_logger, setup_logging
from app.services.yolo_service import get_model

setup_logging()
logger = get_logger(__name__)

# ── Sentry ───────────────────────────────────────────────────────────────────

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=0.2,
        environment=settings.API_ENV,
    )
    logger.info("Sentry inicializado (env=%s)", settings.API_ENV)


# ── Lifespan ─────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not firebase_admin._apps:
        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK inicializado.")
    logger.info("Pré-carregando modelo YOLO...")
    get_model()
    logger.info("Modelo YOLO pronto.")
    yield


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Cont.IA YOLO API",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.effective_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Rotas de infraestrutura ───────────────────────────────────────────────────


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok"}


@app.get("/v1/version", tags=["infra"])
def version():
    return {"api": "1.0.0", "model": settings.YOLO_MODEL}


@app.get("/metrics", tags=["infra"], include_in_schema=False)
def metrics():
    """Endpoint de métricas no formato Prometheus (scraping)."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(detect_router)
app.include_router(notify_router)
app.include_router(user_router)
