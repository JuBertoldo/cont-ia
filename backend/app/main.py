from contextlib import asynccontextmanager

import firebase_admin
import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import credentials
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.routes.detect import router as detect_router
from app.api.routes.notify import router as notify_router
from app.core.config import settings
from app.core.limiter import limiter
from app.core.logging import get_logger, setup_logging
from app.services.yolo_service import get_model

setup_logging()
logger = get_logger(__name__)

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=0.2,
        environment=settings.API_ENV,
    )
    logger.info("Sentry inicializado (env=%s)", settings.API_ENV)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not firebase_admin._apps:
        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK inicializado.")
    # Pré-carrega o modelo YOLO na inicialização para evitar timeout na 1ª requisição
    logger.info("Pré-carregando modelo YOLO...")
    get_model()
    logger.info("Modelo YOLO pronto.")
    yield


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


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok"}


@app.get("/v1/version", tags=["infra"])
def version():
    return {"api": "1.0.0", "model": settings.YOLO_MODEL}


app.include_router(detect_router)
app.include_router(notify_router)
