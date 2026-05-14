"""
Métricas Prometheus do Cont.IA.
Módulo isolado para evitar importação circular entre main.py e routes/.
"""

from prometheus_client import Counter, Gauge, Histogram

detections_total = Counter(
    "contia_detections_total",
    "Total de objetos detectados pelo pipeline",
    ["source"],  # yolo | sam | merged
)

detection_duration_seconds = Histogram(
    "contia_detection_duration_seconds",
    "Duração do pipeline de detecção em segundos",
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
)

detection_errors_total = Counter(
    "contia_detection_errors_total",
    "Total de erros no pipeline de detecção",
    ["source"],  # yolo | sam | timeout | internal
)

active_requests = Gauge(
    "contia_active_requests",
    "Requisições de detecção em andamento",
)
