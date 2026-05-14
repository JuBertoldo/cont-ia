"""
Serviço de segmentação MobileSAM.

Recebe bounding boxes do YOLO11 e gera máscaras de segmentação precisas
usando MobileSAM (ViT-Tiny destilado do SAM original da Meta, 2023).

Pipeline:
  YOLO11 → bounding boxes [x1, y1, x2, y2]
  MobileSAM (box prompt) → máscaras binárias → polígonos de contorno

O modelo é carregado como singleton thread-safe na primeira chamada.
Um lock serializa set_image + predict para garantir consistência de estado.
Detecta GPU automaticamente; usa CPU como padrão.
"""

import threading
from typing import Any

import cv2
import numpy as np
import torch

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_predictor: Any | None = None
_model_lock = threading.Lock()
_inference_lock = threading.Lock()


def get_predictor():
    """Carrega e retorna o predictor MobileSAM (singleton thread-safe)."""
    global _predictor
    if _predictor is None:
        with _model_lock:
            if _predictor is None:
                from mobile_sam import SamPredictor, sam_model_registry

                logger.info("Carregando MobileSAM: %s", settings.SAM_MODEL_PATH)
                device = "cuda" if torch.cuda.is_available() else "cpu"
                sam = sam_model_registry["vit_t"](checkpoint=settings.SAM_MODEL_PATH)
                sam.to(device=device)
                sam.eval()
                _predictor = SamPredictor(sam)
                logger.info("MobileSAM carregado em %s.", device)
    return _predictor


def _mask_to_polygon(mask: np.ndarray) -> list[list[float]]:
    """Converte máscara binária em polígono simplificado (maior contorno externo)."""
    mask_uint8 = mask.astype(np.uint8) * 255
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return []
    contour = max(contours, key=cv2.contourArea)
    epsilon = 0.005 * cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, epsilon, True)
    return approx.reshape(-1, 2).tolist()


def segment_from_boxes(image_rgb: np.ndarray, boxes: list[list[float]]) -> list[dict]:
    """
    Executa segmentação MobileSAM usando bounding boxes como prompts.

    Args:
        image_rgb: Array numpy HxWx3 (RGB, uint8) — mesmo array da inferência YOLO.
        boxes: Lista de bounding boxes [[x1, y1, x2, y2], ...] em pixels.

    Returns:
        Lista de dicts, um por box, com:
            mask_polygon: list[list[float]] — contorno externo simplificado [[x, y], ...]
            mask_area: float — área da máscara em pixels²
            sam_score: float — score de qualidade da máscara (IoU previsto pelo SAM)
    """
    if not boxes:
        return []

    predictor = get_predictor()
    h, w = image_rgb.shape[:2]
    device = next(predictor.model.parameters()).device

    with _inference_lock:
        predictor.set_image(image_rgb)

        boxes_tensor = torch.tensor(boxes, dtype=torch.float32)
        transformed_boxes = predictor.transform.apply_boxes_torch(boxes_tensor, (h, w)).to(device)

        masks, scores, _ = predictor.predict_torch(
            point_coords=None,
            point_labels=None,
            boxes=transformed_boxes,
            multimask_output=False,
        )

    results = []
    for mask, score in zip(masks, scores, strict=False):
        mask_np = mask[0].cpu().numpy()
        results.append(
            {
                "mask_polygon": _mask_to_polygon(mask_np),
                "mask_area": float(mask_np.sum()),
                "sam_score": float(score[0].item()),
            }
        )

    return results
