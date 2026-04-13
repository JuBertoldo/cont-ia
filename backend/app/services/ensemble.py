"""
Ensemble de detecções: combina saídas do YOLO e do RF-DETR usando NMS
(Non-Maximum Suppression) para eliminar duplicatas por sobreposição.
"""


def _iou(box_a: list[float], box_b: list[float]) -> float:
    """Calcula Intersection over Union entre dois bboxes [x1, y1, x2, y2]."""
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    if intersection == 0:
        return 0.0

    area_a = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
    area_b = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
    union = area_a + area_b - intersection

    return intersection / union if union > 0 else 0.0


def merge_detections(
    yolo: list[dict],
    rfdetr: list[dict],
    iou_threshold: float = 0.5,
) -> list[dict]:
    """
    Combina detecções dos dois modelos via NMS:
    - Ordena todas por confiança (maior primeiro)
    - Mantém uma detecção e descarta sobreposições com IoU > iou_threshold
    - Preserva detecções únicas de cada modelo (sem sobreposição = sem duplicata)
    """
    # Taggear fonte
    tagged_yolo = [{**d, "source": "yolo"} for d in yolo]
    tagged_rfdetr = [{**d, "source": "rfdetr"} for d in rfdetr]

    all_detections = sorted(
        tagged_yolo + tagged_rfdetr,
        key=lambda d: d["confidence"],
        reverse=True,
    )

    kept: list[dict] = []
    for candidate in all_detections:
        duplicate = any(
            _iou(candidate["bbox"], kept_det["bbox"]) > iou_threshold
            for kept_det in kept
        )
        if not duplicate:
            kept.append(candidate)

    return kept
