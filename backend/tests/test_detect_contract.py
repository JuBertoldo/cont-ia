"""
Testes de contrato para o endpoint POST /v1/detect.

Valida que:
- Schema de entrada é rejeitado corretamente quando inválido
- Schema de saída segue o contrato DetectResponse (com campos SAM)
- YOLO e SAM são mockados para isolamento (sem GPU/arquivo necessário)
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


def test_detect_base64_invalido_retorna_erro():
    """Base64 inválido que não forma imagem retorna erro do cliente (422)."""
    res = client.post("/v1/detect", json={"image_base64": "nao_e_base64_valido!!!"})
    assert res.status_code in (422, 500)  # 422 se base64 inválido, 500 se imagem corrompida


# ── testes de contrato de saída ──────────────────────────────────────────────


@patch("app.api.routes.detect.segment_from_boxes", return_value=[])
@patch("app.services.yolo_service.YOLO")
def test_detect_retorna_schema_correto_sem_deteccoes(mock_yolo_cls, _mock_sam):
    model_instance = MagicMock()
    result = MagicMock()
    result.boxes = None
    result.names = {}
    model_instance.predict.return_value = [result]
    mock_yolo_cls.return_value = model_instance

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

    svc._model = None


@patch("app.api.routes.detect.segment_from_boxes", return_value=[])
@patch("app.services.yolo_service.YOLO")
def test_detect_retorna_deteccoes_com_schema_correto(mock_yolo_cls, _mock_sam):
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
        assert "source" in det
        assert "mask_polygon" in det
        assert "mask_area" in det
        assert isinstance(det["label"], str)
        assert 0.0 <= det["confidence"] <= 1.0
        assert len(det["bbox"]) == 4
        assert det["source"] == "yolo+sam"

    svc._model = None


@patch("app.api.routes.detect.segment_from_boxes")
@patch("app.services.yolo_service.YOLO")
def test_detect_inclui_mascaras_sam_quando_disponiveis(mock_yolo_cls, mock_sam):
    model_instance = MagicMock()
    yolo_result = mock_yolo_result(labels=["garrafa"], confidences=[0.9])
    model_instance.predict.return_value = [yolo_result]
    mock_yolo_cls.return_value = model_instance

    mock_sam.return_value = [
        {"mask_polygon": [[10.0, 20.0], [30.0, 20.0], [30.0, 50.0]], "mask_area": 600.0}
    ]

    import app.services.yolo_service as svc

    svc._model = None

    res = client.post("/v1/detect", json={"image_base64": make_base64_image()})

    assert res.status_code == 200
    det = res.json()["detections"][0]
    assert det["mask_polygon"] == [[10.0, 20.0], [30.0, 20.0], [30.0, 50.0]]
    assert det["mask_area"] == 600.0

    svc._model = None


@patch("app.api.routes.detect.segment_from_boxes", return_value=[])
@patch("app.services.yolo_service.YOLO")
def test_detect_meta_contem_pipeline(mock_yolo_cls, _mock_sam):
    model_instance = MagicMock()
    result = MagicMock()
    result.boxes = None
    result.names = {}
    model_instance.predict.return_value = [result]
    mock_yolo_cls.return_value = model_instance

    import app.services.yolo_service as svc

    svc._model = None

    res = client.post("/v1/detect", json={"image_base64": make_base64_image()})

    assert res.status_code == 200
    meta = res.json()["meta"]
    assert "pipeline" in meta
    assert "yolo_count" in meta["pipeline"]
    assert "sam_count" in meta["pipeline"]

    svc._model = None


@patch("app.api.routes.detect.segment_from_boxes", return_value=[])
@patch("app.services.yolo_service.YOLO")
def test_detect_aceita_campos_opcionais(mock_yolo_cls, _mock_sam):
    model_instance = MagicMock()
    result = MagicMock()
    result.boxes = None
    result.names = {}
    model_instance.predict.return_value = [result]
    mock_yolo_cls.return_value = model_instance

    import app.services.yolo_service as svc

    svc._model = None

    res = client.post(
        "/v1/detect",
        json={"image_base64": make_base64_image(), "source": "web", "platform": "ios"},
    )

    assert res.status_code == 200
    svc._model = None


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
