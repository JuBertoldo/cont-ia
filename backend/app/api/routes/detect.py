"""
Endpoint de detecção: pipeline YOLO11 → MobileSAM.

YOLO11 detecta objetos e retorna bounding boxes.
MobileSAM usa essas boxes como prompts para gerar máscaras de segmentação precisas.
Pipeline 100% local — sem dependência de APIs externas.
"""

import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.limiter import limiter
from app.core.logging import get_logger
from app.core.metrics import (
    active_requests,
    detection_duration_seconds,
    detection_errors_total,
    detections_total,
)
from app.schemas.detect import DetectRequest, DetectResponse
from app.services.sam_service import segment_from_boxes
from app.services.yolo_service import decode_and_detect

router = APIRouter(prefix="/v1", tags=["detect"])
logger = get_logger(__name__)

# Pool dedicado para inferência CPU-bound (YOLO + SAM sequenciais).
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="inference")


@router.post(
    "/detect",
    response_model=DetectResponse,
    status_code=status.HTTP_200_OK,
    summary="Detecta e segmenta objetos com YOLO11 + MobileSAM",
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
    active_requests.inc()

    try:
        loop = asyncio.get_running_loop()

        # ── Passo 1: YOLO11 — decodifica imagem e detecta objetos ──────────
        image_rgb, yolo_detections, yolo_meta = await asyncio.wait_for(
            loop.run_in_executor(_executor, decode_and_detect, payload.image_base64),
            timeout=settings.YOLO_TIMEOUT_S,
        )
        detections_total.labels(source="yolo").inc(len(yolo_detections))

        # ── Passo 2: MobileSAM — segmenta cada objeto detectado pelo YOLO ──
        sam_results: list[dict] = []
        if yolo_detections:
            boxes = [det["bbox"] for det in yolo_detections]
            try:
                sam_results = await asyncio.wait_for(
                    loop.run_in_executor(_executor, segment_from_boxes, image_rgb, boxes),
                    timeout=settings.SAM_TIMEOUT_S,
                )
            except Exception as sam_exc:
                # SAM falhou — retorna bounding boxes sem máscaras (degradação graciosa)
                logger.warning("SAM falhou — retornando só bounding boxes: %s", sam_exc)
                detection_errors_total.labels(source="internal").inc()

        # ── Passo 3: combina detecções YOLO com máscaras SAM ───────────────
        detections = []
        for i, det in enumerate(yolo_detections):
            sam = sam_results[i] if i < len(sam_results) else {}
            detections.append(
                {
                    **det,
                    "source": "yolo+sam",
                    "mask_polygon": sam.get("mask_polygon"),
                    "mask_area": sam.get("mask_area"),
                }
            )

        elapsed = time.time() - started
        elapsed_ms = int(elapsed * 1000)

        detection_duration_seconds.observe(elapsed)
        detections_total.labels(source="merged").inc(len(detections))

        logger.info(
            "Pipeline concluído | yolo=%d sam=%d ms=%d",
            len(yolo_detections),
            len(sam_results),
            elapsed_ms,
        )

        return {
            "detections": detections,
            "meta": {
                "model": yolo_meta.get("model", settings.YOLO_MODEL),
                "processing_ms": elapsed_ms,
                "pipeline": {
                    "yolo_count": len(yolo_detections),
                    "sam_count": len(sam_results),
                    "yolo_ms": yolo_meta.get("processing_ms", 0),
                },
            },
        }

    except TimeoutError as exc:
        detection_errors_total.labels(source="timeout").inc()
        logger.error("Timeout na inferência (uid=%s)", user.get("uid"))
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Inferência excedeu o tempo limite de {settings.YOLO_TIMEOUT_S}s.",
        ) from exc
    except ValueError as exc:
        detection_errors_total.labels(source="internal").inc()
        logger.warning("Imagem inválida: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        detection_errors_total.labels(source="internal").inc()
        logger.error("Erro interno na detecção: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar imagem.",
        ) from exc
    finally:
        active_requests.dec()
