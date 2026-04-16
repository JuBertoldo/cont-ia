"""
Testes unitários para app.services.roboflow_service.
O InferenceHTTPClient é sempre mockado — nenhuma chamada real ao Roboflow é feita.
"""

import asyncio
from unittest.mock import patch

import pytest

import app.services.roboflow_service as svc
from app.services.roboflow_service import _run_workflow, detect_with_roboflow

# ── fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def reset_client():
    """Garante que o singleton _client seja limpo entre os testes."""
    svc._client = None
    yield
    svc._client = None


def make_pred(cls="garrafa", conf=0.91, x=100.0, y=200.0, w=50.0, h=60.0) -> dict:
    """Helper: cria um dict de predição no formato Roboflow (centro + dimensões)."""
    return {"class": cls, "confidence": conf, "x": x, "y": y, "width": w, "height": h}


# ── _run_workflow: parsing da resposta ────────────────────────────────────────


@patch("app.services.roboflow_service.InferenceHTTPClient")
def test_parse_raw_predictions_chave_primaria(mock_cls):
    """Parsing correto quando o workflow retorna 'raw_predictions.predictions'."""
    mock_cls.return_value.run_workflow.return_value = [
        {"raw_predictions": {"predictions": [make_pred()]}}
    ]

    result = _run_workflow("base64fake")

    assert len(result) == 1
    assert result[0]["label"] == "garrafa"
    assert result[0]["source"] == "rfdetr"
    assert result[0]["confidence"] == pytest.approx(0.91, abs=1e-4)
    assert len(result[0]["bbox"]) == 4


@patch("app.services.roboflow_service.InferenceHTTPClient")
def test_parse_predictions_fallback_direto(mock_cls):
    """Fallback: 'predictions' diretamente em result[0], sem 'raw_predictions'."""
    mock_cls.return_value.run_workflow.return_value = [
        {"predictions": [make_pred(cls="porca", conf=0.75)]}
    ]

    result = _run_workflow("base64fake")

    assert len(result) == 1
    assert result[0]["label"] == "porca"
    assert result[0]["source"] == "rfdetr"


@patch("app.services.roboflow_service.InferenceHTTPClient")
def test_retorna_vazio_sem_predicoes(mock_cls):
    """Lista vazia quando o workflow não detecta nenhum objeto."""
    mock_cls.return_value.run_workflow.return_value = [{"total_bottle_count": 0}]

    result = _run_workflow("base64fake")

    assert result == []


@patch("app.services.roboflow_service.InferenceHTTPClient")
def test_retorna_vazio_com_lista_predictions_vazia(mock_cls):
    """Lista vazia quando 'predictions' existe mas está vazio."""
    mock_cls.return_value.run_workflow.return_value = [{"predictions": []}]

    result = _run_workflow("base64fake")

    assert result == []


# ── _run_workflow: conversão de coordenadas ───────────────────────────────────


@patch("app.services.roboflow_service.InferenceHTTPClient")
def test_conversao_centro_para_canto(mock_cls):
    """Roboflow usa (cx, cy, w, h) — deve converter para [x1, y1, x2, y2]."""
    mock_cls.return_value.run_workflow.return_value = [
        {"predictions": [make_pred(x=100.0, y=200.0, w=50.0, h=60.0)]}
    ]

    result = _run_workflow("base64fake")

    bbox = result[0]["bbox"]
    assert bbox[0] == pytest.approx(75.0)  # x1 = 100 - 50/2
    assert bbox[1] == pytest.approx(170.0)  # y1 = 200 - 60/2
    assert bbox[2] == pytest.approx(125.0)  # x2 = 100 + 50/2
    assert bbox[3] == pytest.approx(230.0)  # y2 = 200 + 60/2


@patch("app.services.roboflow_service.InferenceHTTPClient")
def test_bbox_arredondado_2_casas(mock_cls):
    """Bbox arredondado para 2 casas decimais."""
    mock_cls.return_value.run_workflow.return_value = [
        {"predictions": [make_pred(x=100.333, y=200.666, w=50.111, h=60.999)]}
    ]

    result = _run_workflow("base64fake")

    for v in result[0]["bbox"]:
        assert round(v, 2) == v


@patch("app.services.roboflow_service.InferenceHTTPClient")
def test_confianca_arredondada_4_casas(mock_cls):
    """Confiança arredondada para 4 casas decimais."""
    mock_cls.return_value.run_workflow.return_value = [
        {"predictions": [make_pred(conf=0.912345678)]}
    ]

    result = _run_workflow("base64fake")

    assert result[0]["confidence"] == round(0.912345678, 4)


# ── _run_workflow: múltiplas detecções ───────────────────────────────────────


@patch("app.services.roboflow_service.InferenceHTTPClient")
def test_multiplas_deteccoes_preservadas(mock_cls):
    """Múltiplas predições retornam múltiplas detecções."""
    mock_cls.return_value.run_workflow.return_value = [
        {
            "predictions": [
                make_pred(cls="garrafa", conf=0.90),
                make_pred(cls="tampa", conf=0.80),
                make_pred(cls="garrafa", conf=0.70),
            ]
        }
    ]

    result = _run_workflow("base64fake")

    assert len(result) == 3
    labels = [d["label"] for d in result]
    assert labels.count("garrafa") == 2
    assert "tampa" in labels


@patch("app.services.roboflow_service.InferenceHTTPClient")
def test_class_ausente_usa_object_como_default(mock_cls):
    """Se 'class' não existir no pred, usa 'object' como label."""
    mock_cls.return_value.run_workflow.return_value = [
        {"predictions": [{"confidence": 0.8, "x": 10, "y": 10, "width": 20, "height": 20}]}
    ]

    result = _run_workflow("base64fake")

    assert result[0]["label"] == "object"


# ── _run_workflow: singleton do client ────────────────────────────────────────


@patch("app.services.roboflow_service.InferenceHTTPClient")
def test_singleton_client_criado_uma_vez(mock_cls):
    """InferenceHTTPClient é instanciado uma única vez entre chamadas."""
    mock_cls.return_value.run_workflow.return_value = [{}]

    _run_workflow("img1")
    _run_workflow("img2")

    mock_cls.assert_called_once()


# ── detect_with_roboflow: comportamentos do wrapper async ─────────────────────


def test_desativado_quando_api_key_vazia(monkeypatch):
    """Retorna [] imediatamente se ROBOFLOW_API_KEY estiver vazia."""
    monkeypatch.setattr(svc.settings, "ROBOFLOW_API_KEY", "")

    result = asyncio.run(detect_with_roboflow("base64fake"))

    assert result == []


@patch("app.services.roboflow_service._run_workflow")
def test_excecao_sdk_retorna_lista_vazia(mock_run):
    """Qualquer exceção do SDK retorna [] sem derrubar o servidor."""
    mock_run.side_effect = ConnectionError("Roboflow timeout")

    result = asyncio.run(detect_with_roboflow("base64fake"))

    assert result == []


@patch("app.services.roboflow_service._run_workflow")
def test_retorna_deteccoes_do_workflow(mock_run, monkeypatch):
    """Retorna normalmente a lista retornada por _run_workflow."""
    # API key pode estar vazia no ambiente de teste — garante que não seja
    monkeypatch.setattr(svc.settings, "ROBOFLOW_API_KEY", "fake-key-for-test")
    expected = [{"label": "garrafa", "confidence": 0.9, "bbox": [0, 0, 50, 50], "source": "rfdetr"}]
    mock_run.return_value = expected

    result = asyncio.run(detect_with_roboflow("base64fake"))

    assert result == expected
