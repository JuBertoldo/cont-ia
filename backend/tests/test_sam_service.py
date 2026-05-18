"""
Testes unitários para app.services.sam_service.

ultralytics.SAM é sempre mockado — nenhum checkpoint .pt é necessário.
"""

from unittest.mock import MagicMock, patch

import numpy as np
import pytest

import app.services.sam_service as svc


@pytest.fixture(autouse=True)
def reset_model():
    """Garante que o singleton _model seja limpo entre os testes."""
    svc._model = None
    yield
    svc._model = None


def make_image_rgb(h: int = 64, w: int = 64) -> np.ndarray:
    return np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)


# ── segment_from_boxes ───────────────────────────────────────────────────────


def test_segment_retorna_lista_vazia_sem_boxes():
    result = svc.segment_from_boxes(make_image_rgb(), [])
    assert result == []


@patch("app.services.sam_service._get_sam_model")
def test_segment_retorna_um_resultado_por_box(mock_get_model):
    n_boxes = 3
    h, w = 64, 64

    fake_mask = MagicMock()
    fake_mask.cpu.return_value.numpy.return_value = np.zeros((h, w), dtype=bool)

    fake_polygon = np.array([[10.0, 20.0], [30.0, 20.0], [30.0, 50.0]])

    fake_masks = MagicMock()
    fake_masks.data = [fake_mask] * n_boxes
    fake_masks.xy = [fake_polygon] * n_boxes

    fake_result = MagicMock()
    fake_result.masks = fake_masks

    mock_model = MagicMock()
    mock_model.predict.return_value = [fake_result]
    mock_get_model.return_value = mock_model

    boxes = [[0.0, 0.0, 10.0, 10.0]] * n_boxes
    result = svc.segment_from_boxes(make_image_rgb(h, w), boxes)

    assert len(result) == n_boxes
    for item in result:
        assert "mask_polygon" in item
        assert "mask_area" in item
        assert "sam_score" in item


@patch("app.services.sam_service._get_sam_model")
def test_segment_retorna_lista_vazia_quando_masks_none(mock_get_model):
    fake_result = MagicMock()
    fake_result.masks = None

    mock_model = MagicMock()
    mock_model.predict.return_value = [fake_result]
    mock_get_model.return_value = mock_model

    result = svc.segment_from_boxes(make_image_rgb(), [[0.0, 0.0, 10.0, 10.0]])
    assert result == []


@patch("app.services.sam_service._get_sam_model")
def test_segment_retorna_lista_vazia_quando_results_vazio(mock_get_model):
    mock_model = MagicMock()
    mock_model.predict.return_value = []
    mock_get_model.return_value = mock_model

    result = svc.segment_from_boxes(make_image_rgb(), [[0.0, 0.0, 10.0, 10.0]])
    assert result == []
