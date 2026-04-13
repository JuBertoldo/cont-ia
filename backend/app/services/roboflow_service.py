import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_ROBOFLOW_URL = "https://detect.roboflow.com/rfdetr-medium"


async def detect_with_roboflow(image_base64: str) -> list[dict]:
    """
    Chama a API do Roboflow RF-DETR Medium e retorna detecções no formato interno.
    Retorna lista vazia se ROBOFLOW_API_KEY não estiver configurada.
    """
    if not settings.ROBOFLOW_API_KEY:
        logger.debug("ROBOFLOW_API_KEY não configurada — RF-DETR desativado.")
        return []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                _ROBOFLOW_URL,
                params={
                    "api_key": settings.ROBOFLOW_API_KEY,
                    "confidence": settings.YOLO_CONF,
                },
                content=image_base64,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            data = response.json()

        detections = []
        for pred in data.get("predictions", []):
            # RF-DETR retorna bbox em formato centro (cx, cy, w, h) — converter para xyxy
            cx = pred.get("x", 0)
            cy = pred.get("y", 0)
            w = pred.get("width", 0)
            h = pred.get("height", 0)

            detections.append({
                "label": pred.get("class", "object"),
                "confidence": round(pred.get("confidence", 0.0), 4),
                "bbox": [
                    round(cx - w / 2, 2),
                    round(cy - h / 2, 2),
                    round(cx + w / 2, 2),
                    round(cy + h / 2, 2),
                ],
                "source": "rfdetr",
            })

        logger.info("RF-DETR detectou %d objetos.", len(detections))
        return detections

    except httpx.HTTPStatusError as exc:
        logger.warning("Roboflow API erro HTTP %s: %s", exc.response.status_code, exc)
        return []
    except Exception as exc:
        logger.warning("Roboflow API indisponível — usando só YOLO: %s", exc)
        return []
