import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.limiter import limiter
from app.core.logging import get_logger
from app.schemas.detect import DetectRequest, DetectResponse
from app.services.yolo_service import detect_from_base64

router = APIRouter(prefix="/v1", tags=["detect"])
logger = get_logger(__name__)

# Pool dedicado para inferência YOLO (operação bloqueante/CPU-bound).
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="yolo")


@router.post(
    "/detect",
    response_model=DetectResponse,
    status_code=status.HTTP_200_OK,
    summary="Detecta objetos em imagem base64 com YOLO",
)
@limiter.limit(settings.RATE_LIMIT)
async def detect(
    request: Request,
    payload: DetectRequest,
    user: dict = Depends(get_current_user),
):
    logger.info(
        "Requisição de detecção recebida | uid=%s source=%s platform=%s",
        user.get("uid"),
        payload.source,
        payload.platform,
    )

    try:
        loop = asyncio.get_running_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(_executor, detect_from_base64, payload.image_base64),
            timeout=settings.YOLO_TIMEOUT_S,
        )
        logger.info(
            "Detecção concluída | itens=%d ms=%s",
            len(result["detections"]),
            result["meta"].get("processing_ms"),
        )
        return result
    except asyncio.TimeoutError:
        logger.error("Timeout na inferência YOLO (uid=%s)", user.get("uid"))
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Inferência excedeu o tempo limite de {settings.YOLO_TIMEOUT_S}s.",
        )
    except ValueError as exc:
        logger.warning("Imagem inválida: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.error("Erro interno na detecção: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar imagem.",
        ) from exc
