"""
Serviço de inferência YOLO11.

Carrega o modelo YOLO11 como singleton thread-safe e executa
a detecção de objetos em imagens recebidas como base64.

Funcionalidades:
  - Singleton com double-checked locking (seguro para ThreadPoolExecutor)
  - Realce automático de imagens escuras (brilho médio < 100/255)
  - Retorna detecções com label, confidence e bounding box [x1,y1,x2,y2]
  - decode_and_detect: retorna também o array numpy RGB para reuso pelo SAM
"""

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
    """
    Retorna a instância singleton do modelo YOLO11.

    Usa double-checked locking para garantir que o modelo seja
    inicializado apenas uma vez, mesmo sob carga paralela no
    ThreadPoolExecutor do endpoint /v1/detect.

    O modelo é pré-carregado no lifespan do FastAPI para evitar
    timeout na primeira requisição.

    Returns:
        YOLO: Instância carregada e pronta para inferência.
    """
    global _model
    if _model is None:
        with _model_lock:
            # Double-checked locking: evita inicialização simultânea em múltiplas threads.
            if _model is None:
                logger.info("Carregando modelo YOLO: %s", settings.YOLO_MODEL)
                _model = YOLO(settings.YOLO_MODEL)
                logger.info("Modelo YOLO carregado com sucesso.")
    return _model


def decode_and_detect(image_base64: str) -> tuple[np.ndarray, list[dict], dict]:
    """
    Decodifica imagem base64, aplica realce se necessário e executa YOLO11.

    Retorna a tripla (image_rgb, detections, meta) para que o pipeline SAM
    possa reusar o mesmo array numpy sem redecódificar a imagem.

    Args:
        image_base64: String base64 da imagem (sem prefixo data:image/...)

    Returns:
        Tuple com:
            image_rgb (np.ndarray): Array HxWx3 RGB uint8 — usado pelo SAM
            detections (list[dict]): Lista de objetos detectados pelo YOLO
            meta (dict): Metadados da inferência (model, processing_ms)

    Raises:
        ValueError: Se a string base64 for inválida ou corrompida.
    """
    started = time.time()

    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as exc:
        raise ValueError("Imagem base64 inválida ou corrompida.") from exc

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise ValueError("Imagem inválida ou formato não suportado.") from exc

    mean_brightness = float(np.array(image).mean())
    if mean_brightness < 100:
        logger.debug(
            "Imagem escura detectada (brilho médio=%.1f) — aplicando realce.", mean_brightness
        )
        image = ImageEnhance.Brightness(image).enhance(1.5)
        image = ImageEnhance.Contrast(image).enhance(1.3)

    image_rgb = np.array(image)  # mantido para SAM

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
    return image_rgb, detections, {"model": settings.YOLO_MODEL, "processing_ms": elapsed_ms}


def detect_from_base64(image_base64: str) -> dict:
    """
    Executa inferência YOLO11 em uma imagem codificada em base64.

    Pré-processamento:
      1. Decodifica base64 → bytes → PIL Image (RGB)
      2. Se o brilho médio for < 100/255, aplica realce automático
         (Brightness 1.5x + Contrast 1.3x) para melhorar detecção
         em ambientes com pouca luz (depósitos, galpões)

    Args:
        image_base64: String base64 da imagem (sem prefixo data:image/...)

    Returns:
        dict com:
            detections (list): Lista de objetos detectados, cada um com:
                label (str): Nome da classe (ex: "bottle")
                confidence (float): Confiança da detecção [0.0, 1.0]
                bbox (list[float]): Bounding box [x1, y1, x2, y2] em pixels
            meta (dict):
                model (str): Nome do arquivo do modelo usado
                processing_ms (int): Tempo de inferência em milissegundos

    Raises:
        ValueError: Se a string base64 for inválida ou corrompida.
    """
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
