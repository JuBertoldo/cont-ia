from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.logging import get_logger
from app.schemas.detect import DetectRequest, DetectResponse
from app.services.yolo_service import detect_from_base64

router = APIRouter(prefix="/v1", tags=["detect"])
logger = get_logger(__name__)


@router.post(
    "/detect",
    response_model=DetectResponse,
    status_code=status.HTTP_200_OK,
    summary="Detecta objetos em imagem base64 com YOLO",
)
def detect(payload: DetectRequest, user: dict = Depends(get_current_user)):
    logger.info(
        "Requisição de detecção recebida | uid=%s source=%s platform=%s",
        user.get("uid"),
        payload.source,
        payload.platform,
    )

    try:
        result = detect_from_base64(payload.image_base64)
        logger.info(
            "Detecção concluída | itens=%d ms=%s",
            len(result["detections"]),
            result["meta"].get("processing_ms"),
        )
        return result
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
