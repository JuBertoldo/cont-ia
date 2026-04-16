"""
Testes unitários para app.services.ensemble.
Cobre NMS, cálculo de IoU, tagging de fonte e comportamentos de borda.
"""

import pytest

from app.services.ensemble import _iou, merge_detections

# ── helpers ───────────────────────────────────────────────────────────────────


def det(label: str, conf: float, bbox: list[float], source: str = "yolo") -> dict:
    return {"label": label, "confidence": conf, "bbox": bbox, "source": source}


# ── _iou ─────────────────────────────────────────────────────────────────────


def test_iou_sem_sobreposicao():
    """Boxes sem sobreposição → IoU zero."""
    assert _iou([0, 0, 10, 10], [20, 20, 30, 30]) == 0.0


def test_iou_sobreposicao_total():
    """Box idêntica a si mesma → IoU 1.0."""
    box = [0.0, 0.0, 100.0, 100.0]
    assert _iou(box, box) == pytest.approx(1.0)


def test_iou_sobreposicao_parcial():
    """
    A=[0,0,10,10] área=100, B=[5,0,15,10] área=100
    interseção=50, união=150 → IoU=1/3
    """
    assert _iou([0, 0, 10, 10], [5, 0, 15, 10]) == pytest.approx(1 / 3, rel=1e-5)


def test_iou_sobreposicao_metade():
    """
    A=[0,0,100,100] área=10000, B=[50,0,150,100] área=10000
    interseção=5000, união=15000 → IoU=1/3
    """
    iou = _iou([0, 0, 100, 100], [50, 0, 150, 100])
    assert iou == pytest.approx(1 / 3, rel=1e-5)


def test_iou_box_degenerada_nao_divide_por_zero():
    """Box com área zero não causa divisão por zero."""
    assert _iou([5, 5, 5, 5], [0, 0, 10, 10]) == 0.0


def test_iou_adjacentes_sem_sobreposicao():
    """Boxes que se tocam na borda têm IoU zero."""
    assert _iou([0, 0, 10, 10], [10, 0, 20, 10]) == pytest.approx(0.0)


# ── merge_detections: entradas vazias ────────────────────────────────────────


def test_merge_ambos_vazios():
    assert merge_detections([], []) == []


def test_merge_so_yolo():
    yolo = [det("parafuso", 0.9, [0, 0, 50, 50])]
    result = merge_detections(yolo, [])
    assert len(result) == 1
    assert result[0]["source"] == "yolo"


def test_merge_so_rfdetr():
    rfdetr = [det("porca", 0.85, [0, 0, 50, 50], source="rfdetr")]
    result = merge_detections([], rfdetr)
    assert len(result) == 1
    assert result[0]["source"] == "rfdetr"


# ── merge_detections: NMS mesmo label ────────────────────────────────────────


def test_nms_mesmo_objeto_mesmo_label_alta_iou_mantem_maior_confianca():
    """YOLO e RF-DETR detectam o mesmo objeto → mantém o de maior confiança."""
    yolo = [det("garrafa", 0.95, [0, 0, 100, 100])]
    rfdet = [det("garrafa", 0.80, [5, 5, 95, 95])]  # sobreposição alta
    result = merge_detections(yolo, rfdet)
    assert len(result) == 1
    assert result[0]["confidence"] == pytest.approx(0.95)
    assert result[0]["source"] == "yolo"


def test_nms_mesmo_label_baixa_iou_ambas_mantidas():
    """Mesmo label mas boxes distantes → ambas preservadas."""
    yolo = [det("garrafa", 0.90, [0, 0, 50, 50])]
    rfdet = [det("garrafa", 0.85, [200, 200, 250, 250])]
    result = merge_detections(yolo, rfdet)
    assert len(result) == 2


# ── merge_detections: NMS labels diferentes (bug corrigido) ──────────────────


def test_nms_labels_diferentes_alta_iou_ambas_mantidas():
    """
    BUG CORRIGIDO: objetos de classes diferentes NÃO devem ser suprimidos,
    mesmo que os bounding boxes se sobreponham fortemente.
    Ex: um 'parafuso' e uma 'porca' detectados quase no mesmo pixel.
    """
    yolo = [det("parafuso", 0.90, [10, 10, 60, 60])]
    rfdet = [det("porca", 0.85, [12, 12, 58, 58])]  # alta sobreposição
    result = merge_detections(yolo, rfdet)
    assert len(result) == 2
    labels = {d["label"] for d in result}
    assert labels == {"parafuso", "porca"}


def test_nms_tres_labels_distintos_alta_sobreposicao_todos_mantidos():
    """Três objetos de classes distintas na mesma posição → todos preservados."""
    boxes = [
        det("parafuso", 0.90, [0, 0, 100, 100]),
        det("porca", 0.85, [5, 5, 95, 95]),
        det("arruela", 0.80, [2, 2, 98, 98]),
    ]
    result = merge_detections(boxes, [])
    assert len(result) == 3


# ── merge_detections: ordenação e tagging ────────────────────────────────────


def test_resultado_ordenado_por_confianca_decrescente():
    """Detecções no resultado devem estar em ordem decrescente de confiança."""
    yolo = [
        det("item", 0.60, [0, 0, 10, 10]),
        det("item", 0.95, [100, 100, 150, 150]),
        det("item", 0.75, [200, 200, 250, 250]),
    ]
    result = merge_detections(yolo, [])
    confs = [d["confidence"] for d in result]
    assert confs == sorted(confs, reverse=True)


def test_source_yolo_taggeado_corretamente():
    """Detecções YOLO devem ter source='yolo' no resultado do merge."""
    yolo = [det("obj", 0.9, [0, 0, 10, 10])]
    result = merge_detections(yolo, [])
    assert result[0]["source"] == "yolo"


def test_source_rfdetr_taggeado_corretamente():
    """Detecções RF-DETR devem ter source='rfdetr' no resultado do merge."""
    rfdet = [det("obj", 0.9, [0, 0, 10, 10], source="rfdetr")]
    result = merge_detections([], rfdet)
    assert result[0]["source"] == "rfdetr"


def test_ambos_sources_presentes_no_merge():
    """Resultado final pode conter detecções de ambos os modelos."""
    yolo = [det("obj", 0.9, [0, 0, 10, 10])]
    rfdet = [det("obj", 0.7, [100, 100, 110, 110], source="rfdetr")]
    result = merge_detections(yolo, rfdet)
    sources = {d["source"] for d in result}
    assert sources == {"yolo", "rfdetr"}


# ── merge_detections: iou_threshold customizado ──────────────────────────────


def test_threshold_alto_preserva_mais_deteccoes():
    """
    IoU entre A e B ≈ 0.33.
    threshold=0.5 → 0.33 < 0.5 → ambas mantidas.
    threshold=0.2 → 0.33 > 0.2 → uma suprimida.
    """
    yolo = [det("item", 0.9, [0, 0, 100, 100])]
    rfdet = [det("item", 0.8, [50, 0, 150, 100])]  # IoU ≈ 0.333

    result_relaxado = merge_detections(yolo, rfdet, iou_threshold=0.5)
    assert len(result_relaxado) == 2

    result_estrito = merge_detections(yolo, rfdet, iou_threshold=0.2)
    assert len(result_estrito) == 1


def test_threshold_zero_suprime_qualquer_sobreposicao():
    """threshold=0 → qualquer sobreposição (mesmo mínima) suprime a detecção."""
    yolo = [det("item", 0.9, [0, 0, 100, 100])]
    rfdet = [det("item", 0.8, [99, 99, 150, 150])]  # sobreposição mínima (1x1)
    result = merge_detections(yolo, rfdet, iou_threshold=0.0)
    assert len(result) == 1


def test_threshold_um_nao_suprime_nada():
    """threshold=1.0 → só suprime se boxes forem idênticas (IoU exato = 1)."""
    yolo = [det("item", 0.9, [0, 0, 100, 100])]
    rfdet = [det("item", 0.8, [5, 5, 95, 95])]  # alta sobreposição mas IoU < 1
    result = merge_detections(yolo, rfdet, iou_threshold=1.0)
    assert len(result) == 2
