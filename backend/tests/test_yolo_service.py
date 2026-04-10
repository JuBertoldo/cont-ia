"""
Testes unitários para app.services.yolo_service.

O modelo YOLO é sempre mockado — nenhum arquivo .pt é necessário.
"""

import base64
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from PIL import Image

import app.services.yolo_service as svc
from app.services.yolo_service import detect_from_base64, get_model

# ── fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_singleton():
    """Garante que o singleton _model seja limpo entre os testes."""
    svc._model = None
    yield
    svc._model = None


def make_base64_png(width: int = 16, height: int = 16) -> str:
    img = Image.new("RGB", (width, height), color=(0, 128, 255))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def build_mock_model(labels: list[str] | None = None, confidences: list[float] | None = None):
    labels = labels or []
    confidences = confidences or []

    boxes = []
    names = {}
    for i, (label, conf) in enumerate(zip(labels, confidences, strict=False)):
        names[i] = label
        box = MagicMock()
        box.cls.item.return_value = i
        box.conf.item.return_value = conf
        box.xyxy = [MagicMock()]
        box.xyxy[0].tolist.return_value = [5.0, 10.0, 50.0, 100.0]
        boxes.append(box)

    result = MagicMock()
    result.boxes = boxes if boxes else None
    result.names = names

    model = MagicMock()
    model.predict.return_value = [result]
    return model


# ── get_model ────────────────────────────────────────────────────────────────

@patch("app.services.yolo_service.YOLO")
def test_get_model_instancia_na_primeira_chamada(mock_yolo_cls):
    mock_yolo_cls.return_value = MagicMock()

    m1 = get_model()
    m2 = get_model()

    assert m1 is m2
    mock_yolo_cls.assert_called_once()


# ── detect_from_base64 ───────────────────────────────────────────────────────

@patch("app.services.yolo_service.YOLO")
def test_detect_retorna_lista_vazia_sem_boxes(mock_yolo_cls):
    mock_yolo_cls.return_value = build_mock_model()

    result = detect_from_base64(make_base64_png())

    assert result["detections"] == []
    assert "model" in result["meta"]
    assert "processing_ms" in result["meta"]
    assert isinstance(result["meta"]["processing_ms"], int)


@patch("app.services.yolo_service.YOLO")
def test_detect_retorna_deteccoes_corretas(mock_yolo_cls):
    mock_yolo_cls.return_value = build_mock_model(
        labels=["parafuso", "porca"],
        confidences=[0.92, 0.85],
    )

    result = detect_from_base64(make_base64_png())

    assert len(result["detections"]) == 2
    assert result["detections"][0]["label"] == "parafuso"
    assert result["detections"][0]["confidence"] == pytest.approx(0.92)
    assert len(result["detections"][0]["bbox"]) == 4


@patch("app.services.yolo_service.YOLO")
def test_detect_bbox_arredondado(mock_yolo_cls):
    mock_yolo_cls.return_value = build_mock_model(
        labels=["item"],
        confidences=[0.9],
    )

    result = detect_from_base64(make_base64_png())

    bbox = result["detections"][0]["bbox"]
    for v in bbox:
        assert round(v, 2) == v


def test_detect_lanca_value_error_para_base64_invalido():
    svc._model = MagicMock()

    with pytest.raises(ValueError, match="base64"):
        detect_from_base64("!@#$%não_é_base64")


@patch("app.services.yolo_service.YOLO")
def test_detect_meta_contem_nome_do_modelo(mock_yolo_cls):
    mock_yolo_cls.return_value = build_mock_model()

    result = detect_from_base64(make_base64_png())

    assert result["meta"]["model"] == svc.settings.YOLO_MODEL
