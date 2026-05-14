"""
Testes unitários para app.services.sam_service.

MobileSAM é sempre mockado — nenhum checkpoint .pt é necessário.
"""

from unittest.mock import MagicMock, patch

import numpy as np
import pytest

import app.services.sam_service as svc


@pytest.fixture(autouse=True)
def reset_predictor():
    """Garante que o singleton _predictor seja limpo entre os testes."""
    svc._predictor = None
    yield
    svc._predictor = None


def make_image_rgb(h: int = 64, w: int = 64) -> np.ndarray:
    return np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)


# ── segment_from_boxes ───────────────────────────────────────────────────────


def test_segment_retorna_lista_vazia_sem_boxes():
    result = svc.segment_from_boxes(make_image_rgb(), [])
    assert result == []


@patch("app.services.sam_service.get_predictor")
def test_segment_retorna_um_resultado_por_box(mock_get_predictor):
    predictor = MagicMock()
    predictor.model.parameters.return_value = iter([MagicMock(device="cpu")])

    h, w = 64, 64
    n_boxes = 3
    fake_masks = MagicMock()
    fake_masks.__iter__ = MagicMock(
        return_value=iter(
            [MagicMock(side_effect=lambda i: np.zeros((h, w), dtype=bool)) for _ in range(n_boxes)]
        )
    )

    mask_tensor = MagicMock()
    mask_tensor.__getitem__ = MagicMock(
        return_value=MagicMock(cpu=lambda: MagicMock(numpy=lambda: np.zeros((h, w), dtype=bool)))
    )
    score_tensor = MagicMock()
    score_tensor.__getitem__ = MagicMock(return_value=MagicMock(item=lambda: 0.9))

    masks_list = [mask_tensor] * n_boxes
    scores_list = [score_tensor] * n_boxes

    predictor.predict_torch.return_value = (masks_list, scores_list, None)
    predictor.transform.apply_boxes_torch.return_value = MagicMock()
    mock_get_predictor.return_value = predictor

    boxes = [[0.0, 0.0, 10.0, 10.0]] * n_boxes
    result = svc.segment_from_boxes(make_image_rgb(h, w), boxes)

    assert len(result) == n_boxes
    for item in result:
        assert "mask_polygon" in item
        assert "mask_area" in item
        assert "sam_score" in item


def test_mask_to_polygon_retorna_lista_vazia_para_mascara_vazia():
    mask = np.zeros((32, 32), dtype=bool)
    polygon = svc._mask_to_polygon(mask)
    assert polygon == []


def test_mask_to_polygon_retorna_pontos_para_regiao_preenchida():
    mask = np.zeros((64, 64), dtype=bool)
    mask[10:30, 10:40] = True  # retângulo preenchido
    polygon = svc._mask_to_polygon(mask)
    assert len(polygon) >= 3  # pelo menos um triângulo
    for point in polygon:
        assert len(point) == 2  # [x, y]
