"""
Testes de contrato para o endpoint POST /v1/detect.

Valida que:
- Schema de entrada é rejeitado corretamente quando inválido
- Schema de saída segue o contrato DetectResponse
- Modelo YOLO é mockado para isolamento (sem GPU/arquivo necessário)
"""

import base64
from io import BytesIO
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


# ── helpers ─────────────────────────────────────────────────────────────────

def make_base64_image(width: int = 32, height: int = 32) -> str:
    """Gera uma imagem PNG mínima codificada em base64."""
    img = Image.new("RGB", (width, height), color=(100, 150, 200))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def mock_yolo_result(labels: list[str], confidences: list[float]):
    """Constrói um resultado YOLO falso com os labels e confidências fornecidos."""
    boxes = []
    names = {}
    for i, (label, conf) in enumerate(zip(labels, confidences, strict=False)):
        names[i] = label
        box = MagicMock()
        box.cls.item.return_value = i
        box.conf.item.return_value = conf
        box.xyxy = [MagicMock()]
        box.xyxy[0].tolist.return_value = [10.0, 20.0, 100.0, 200.0]
        boxes.append(box)

    result = MagicMock()
    result.boxes = boxes
    result.names = names
    return result


# ── testes de entrada inválida ───────────────────────────────────────────────

def test_detect_rejeita_payload_vazio():
    res = client.post("/v1/detect", json={})
    assert res.status_code == 422


def test_detect_rejeita_image_base64_muito_curta():
    res = client.post("/v1/detect", json={"image_base64": "abc"})
    assert res.status_code == 422


def test_detect_rejeita_base64_invalido():
    with patch("app.services.yolo_service.get_model") as mock_model:
        mock_model.return_value = MagicMock()
        res = client.post("/v1/detect", json={"image_base64": "nao_e_base64_valido!!!"})
        assert res.status_code in (422, 500)


# ── testes de contrato de saída ──────────────────────────────────────────────

@patch("app.services.yolo_service.YOLO")
def test_detect_retorna_schema_correto_sem_deteccoes(mock_yolo_cls):
    model_instance = MagicMock()
    result = MagicMock()
    result.boxes = None
    result.names = {}
    model_instance.predict.return_value = [result]
    mock_yolo_cls.return_value = model_instance

    # Reset singleton para usar o mock
    import app.services.yolo_service as svc
    svc._model = None

    image_b64 = make_base64_image()
    res = client.post("/v1/detect", json={"image_base64": image_b64})

    assert res.status_code == 200
    body = res.json()

    assert "detections" in body
    assert "meta" in body
    assert isinstance(body["detections"], list)
    assert len(body["detections"]) == 0
    assert "model" in body["meta"]
    assert "processing_ms" in body["meta"]

    svc._model = None  # cleanup


@patch("app.services.yolo_service.YOLO")
def test_detect_retorna_deteccoes_com_schema_correto(mock_yolo_cls):
    model_instance = MagicMock()
    yolo_result = mock_yolo_result(
        labels=["parafuso", "porca"],
        confidences=[0.95, 0.87],
    )
    model_instance.predict.return_value = [yolo_result]
    mock_yolo_cls.return_value = model_instance

    import app.services.yolo_service as svc
    svc._model = None

    image_b64 = make_base64_image()
    res = client.post("/v1/detect", json={"image_base64": image_b64})

    assert res.status_code == 200
    body = res.json()

    assert len(body["detections"]) == 2

    for det in body["detections"]:
        assert "label" in det
        assert "confidence" in det
        assert "bbox" in det
        assert isinstance(det["label"], str)
        assert 0.0 <= det["confidence"] <= 1.0
        assert len(det["bbox"]) == 4

    svc._model = None  # cleanup


@patch("app.services.yolo_service.YOLO")
def test_detect_aceita_campos_opcionais(mock_yolo_cls):
    model_instance = MagicMock()
    result = MagicMock()
    result.boxes = None
    result.names = {}
    model_instance.predict.return_value = [result]
    mock_yolo_cls.return_value = model_instance

    import app.services.yolo_service as svc
    svc._model = None

    image_b64 = make_base64_image()
    res = client.post(
        "/v1/detect",
        json={
            "image_base64": image_b64,
            "source": "web",
            "platform": "ios",
        },
    )

    assert res.status_code == 200
    svc._model = None  # cleanup


# ── teste de health ──────────────────────────────────────────────────────────

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_version_endpoint():
    res = client.get("/v1/version")
    assert res.status_code == 200
    body = res.json()
    assert "api" in body
    assert "model" in body
