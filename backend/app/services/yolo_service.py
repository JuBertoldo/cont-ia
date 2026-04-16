import base64
import io
import threading
import time

import numpy as np
from PIL import Image, ImageEnhance
from ultralytics import YOLO

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_model: YOLO | None = None
_model_lock = threading.Lock()


def get_model() -> YOLO:
    global _model
    if _model is None:
        with _model_lock:
            # Double-checked locking: evita inicialização simultânea em múltiplas threads.
            if _model is None:
                logger.info("Carregando modelo YOLO: %s", settings.YOLO_MODEL)
                _model = YOLO(settings.YOLO_MODEL)
                logger.info("Modelo YOLO carregado com sucesso.")
    return _model


def detect_from_base64(image_base64: str) -> dict:
    started = time.time()

    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as exc:
        raise ValueError("Imagem base64 inválida ou corrompida.") from exc

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Melhora detecção em imagens escuras: aplica brightness + contrast automaticamente
    mean_brightness = float(np.array(image).mean())
    if mean_brightness < 100:
        logger.debug(
            "Imagem escura detectada (brilho médio=%.1f) — aplicando realce.", mean_brightness
        )
        image = ImageEnhance.Brightness(image).enhance(1.5)
        image = ImageEnhance.Contrast(image).enhance(1.3)

    model = get_model()

    results = model.predict(source=image, conf=settings.YOLO_CONF, verbose=False)
    r = results[0]

    detections = []
    if r.boxes is not None:
        for box in r.boxes:
            cls_id = int(box.cls.item())
            conf = float(box.conf.item())
            xyxy = box.xyxy[0].tolist()
            label = r.names.get(cls_id, str(cls_id))
            detections.append(
                {
                    "label": label,
                    "confidence": conf,
                    "bbox": [round(v, 2) for v in xyxy],
                }
            )

    elapsed_ms = int((time.time() - started) * 1000)

    return {
        "detections": detections,
        "meta": {
            "model": settings.YOLO_MODEL,
            "processing_ms": elapsed_ms,
        },
    }
