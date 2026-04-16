import asyncio
from concurrent.futures import ThreadPoolExecutor

from inference_sdk import InferenceHTTPClient

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Pool para rodar o SDK síncrono do Roboflow sem bloquear o event loop
_rf_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="roboflow")

_client: InferenceHTTPClient | None = None


def _get_client() -> InferenceHTTPClient:
    """Singleton do InferenceHTTPClient."""
    global _client
    if _client is None:
        _client = InferenceHTTPClient(
            api_url="https://detect.roboflow.com",
            api_key=settings.ROBOFLOW_API_KEY,
        )
    return _client


def _run_workflow(image_base64: str) -> list[dict]:
    """
    Chama o workflow Roboflow de forma síncrona.
    Executado no ThreadPoolExecutor para não bloquear o event loop.
    """
    client = _get_client()
    result = client.run_workflow(
        workspace_name=settings.ROBOFLOW_WORKSPACE,
        workflow_id=settings.ROBOFLOW_WORKFLOW_ID,
        images={"image": image_base64},
    )

    logger.debug("Roboflow workflow result keys: %s", list(result[0].keys()) if result else "empty")

    # Tenta a chave primária do bloco de saída do workflow; cai em alternativas comuns.
    raw_predictions = result[0].get("raw_predictions", {})
    predictions = raw_predictions.get("predictions", [])

    # Fallback: algumas versões do workflow expõem "predictions" diretamente
    if not predictions:
        predictions = result[0].get("predictions", [])

    if not predictions:
        logger.warning(
            "Roboflow retornou resultado sem detecções reconhecíveis. " "Chaves disponíveis: %s",
            list(result[0].keys()) if result else "[]",
        )

    detections = []
    for pred in predictions:
        cx = pred.get("x", 0)
        cy = pred.get("y", 0)
        w = pred.get("width", 0)
        h = pred.get("height", 0)

        detections.append(
            {
                "label": pred.get("class", "object"),
                "confidence": round(pred.get("confidence", 0.0), 4),
                "bbox": [
                    round(cx - w / 2, 2),
                    round(cy - h / 2, 2),
                    round(cx + w / 2, 2),
                    round(cy + h / 2, 2),
                ],
                "source": "rfdetr",
            }
        )

    logger.info(
        "RF-DETR workflow detectou %d objetos (total_bottle_count=%s).",
        len(detections),
        result[0].get("total_bottle_count", "?"),
    )
    return detections


async def detect_with_roboflow(image_base64: str) -> list[dict]:
    """
    Wrapper async: executa o workflow Roboflow no executor.
    Retorna lista vazia se ROBOFLOW_API_KEY não estiver configurada.
    """
    if not settings.ROBOFLOW_API_KEY:
        logger.debug("ROBOFLOW_API_KEY não configurada — RF-DETR desativado.")
        return []

    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(_rf_executor, _run_workflow, image_base64)
    except Exception as exc:
        logger.warning("Roboflow workflow falhou — usando só YOLO: %s", exc)
        return []
