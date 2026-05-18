"""
Serviço de segmentação SAM via ultralytics.

Usa ultralytics.SAM (já incluído no pacote ultralytics) para gerar
máscaras de segmentação precisas a partir das bounding boxes do YOLO11.

Vantagem sobre mobile-sam standalone:
  - Sem dependência extra: ultralytics já está em requirements.txt
  - API estável e mantida pela Ultralytics
  - Polígonos de contorno retornados diretamente (sem OpenCV)
  - Mesmo arquivo de checkpoint: mobile_sam.pt (38 MB)

Pipeline:
  YOLO11 → bounding boxes [x1, y1, x2, y2]
  ultralytics.SAM (box prompt) → máscaras + polígonos de contorno
"""

import threading
from typing import Any

import numpy as np

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_model: Any | None = None
_model_lock = threading.Lock()


def _get_sam_model():
    """Carrega e retorna o modelo SAM (singleton thread-safe)."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from ultralytics import SAM  # lazy import — ultralytics é pesado

                logger.info("Carregando SAM: %s", settings.SAM_MODEL_PATH)
                _model = SAM(settings.SAM_MODEL_PATH)
                logger.info("SAM carregado com sucesso.")
    return _model


def segment_from_boxes(image_rgb: np.ndarray, boxes: list[list[float]]) -> list[dict]:
    """
    Executa segmentação SAM usando bounding boxes como prompts.

    Args:
        image_rgb: Array numpy HxWx3 (RGB, uint8) — mesmo array da inferência YOLO.
        boxes: Lista de bounding boxes [[x1, y1, x2, y2], ...] em pixels.

    Returns:
        Lista de dicts, um por box, com:
            mask_polygon: list[list[float]] — contorno externo [[x, y], ...] em pixels
            mask_area: float — área da máscara em pixels²
            sam_score: float — 1.0 (ultralytics não expõe IoU diretamente)
    """
    if not boxes:
        return []

    model = _get_sam_model()
    results = model.predict(source=image_rgb, bboxes=boxes, verbose=False)

    if not results or results[0].masks is None:
        return []

    output = []
    for mask_tensor, polygon_xy in zip(results[0].masks.data, results[0].masks.xy, strict=False):
        mask_np = mask_tensor.cpu().numpy()
        polygon = polygon_xy.tolist() if hasattr(polygon_xy, "tolist") else list(polygon_xy)
        output.append(
            {
                "mask_polygon": polygon,
                "mask_area": float(mask_np.sum()),
                "sam_score": 1.0,
            }
        )

    return output
