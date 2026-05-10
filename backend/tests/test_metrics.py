"""Testes para o endpoint /metrics (Prometheus)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


class TestMetricsEndpoint:
    def test_metrics_retorna_200(self, client):
        response = client.get("/metrics")
        assert response.status_code == 200

    def test_metrics_content_type_prometheus(self, client):
        response = client.get("/metrics")
        assert "text/plain" in response.headers["content-type"]

    def test_metrics_contem_metricas_contia(self, client):
        response = client.get("/metrics")
        body = response.text
        assert "contia_detections_total" in body
        assert "contia_detection_duration_seconds" in body
        assert "contia_detection_errors_total" in body
        assert "contia_active_requests" in body

    def test_metrics_nao_aparece_no_schema_openapi(self, client):
        response = client.get("/openapi.json")
        assert response.status_code == 200
        paths = response.json().get("paths", {})
        assert "/metrics" not in paths
