import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.limiter import limiter
from app.core.logging import get_logger
from app.schemas.detect import DetectRequest, DetectResponse
from app.services.ensemble import merge_detections
from app.services.roboflow_service import detect_with_roboflow
from app.services.yolo_service import detect_from_base64

router = APIRouter(prefix="/v1", tags=["detect"])
logger = get_logger(__name__)

# Pool dedicado para inferência YOLO (operação bloqueante/CPU-bound).
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="yolo")


@router.post(
    "/detect",
    response_model=DetectResponse,
    status_code=status.HTTP_200_OK,
    summary="Detecta objetos com ensemble YOLO + RF-DETR",
)
@limiter.limit(settings.RATE_LIMIT)
async def detect(
    request: Request,
    payload: DetectRequest,
    user: dict = Depends(get_current_user),
):
    logger.info(
        "Requisição de detecção | uid=%s source=%s platform=%s",
        user.get("uid"),
        payload.source,
        payload.platform,
    )

    started = time.time()

    try:
        loop = asyncio.get_running_loop()

        # ── Executa YOLO e RF-DETR em paralelo ──────────────────────────────
        yolo_future = asyncio.wait_for(
            loop.run_in_executor(_executor, detect_from_base64, payload.image_base64),
            timeout=settings.YOLO_TIMEOUT_S,
        )
        rfdetr_future = detect_with_roboflow(payload.image_base64)

        yolo_result, rfdetr_detections = await asyncio.gather(
            yolo_future,
            rfdetr_future,
            return_exceptions=True,
        )

        # ── Trata falhas individuais sem derrubar a requisição ───────────────
        if isinstance(yolo_result, Exception):
            logger.error("YOLO falhou: %s", yolo_result)
            yolo_detections = []
            yolo_meta = {}
        else:
            yolo_detections = yolo_result.get("detections", [])
            yolo_meta = yolo_result.get("meta", {})

        if isinstance(rfdetr_detections, Exception):
            logger.warning("RF-DETR falhou: %s", rfdetr_detections)
            rfdetr_detections = []

        # ── Merge com NMS ────────────────────────────────────────────────────
        merged = merge_detections(
            yolo=yolo_detections,
            rfdetr=rfdetr_detections,
            iou_threshold=settings.ENSEMBLE_IOU_THRESHOLD,
        )

        elapsed_ms = int((time.time() - started) * 1000)

        logger.info(
            "Ensemble concluído | yolo=%d rfdetr=%d merged=%d ms=%d",
            len(yolo_detections),
            len(rfdetr_detections),
            len(merged),
            elapsed_ms,
        )

        return {
            "detections": merged,
            "meta": {
                **yolo_meta,
                "processing_ms": elapsed_ms,
                "ensemble": {
                    "yolo_count": len(yolo_detections),
                    "rfdetr_count": len(rfdetr_detections),
                    "merged_count": len(merged),
                    "iou_threshold": settings.ENSEMBLE_IOU_THRESHOLD,
                },
            },
        }

    except TimeoutError as exc:
        logger.error("Timeout na inferência YOLO (uid=%s)", user.get("uid"))
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Inferência excedeu o tempo limite de {settings.YOLO_TIMEOUT_S}s.",
        ) from exc
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
