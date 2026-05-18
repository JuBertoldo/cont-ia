"""
Testes de carga — Cont.IA Backend.

Ferramenta: Locust (https://locust.io)

Como rodar:
    pip install locust
    locust -f tests/load/locustfile.py --host=http://localhost:8000

Interface web: http://localhost:8089
  - Usuários: comece com 10, aumente gradualmente
  - Spawn rate: 2 usuários/segundo

Cenários cobertos:
  - HealthScenario: verifica que /health responde sob carga
  - DetectScenario: simula operadores fazendo scans simultâneos
  - MetricsScenario: Prometheus scraping periódico

SLA esperado (metas de negócio):
  - /health  → p95 < 100ms
  - /v1/detect → p95 < 30s (inclui YOLO + SAM em CPU)
  - /metrics → p95 < 500ms
"""

import base64
from io import BytesIO

from locust import HttpUser, between, task
from PIL import Image


def _make_base64_image(width: int = 64, height: int = 64) -> str:
    """Gera imagem PNG mínima em base64 para simular payload de scan."""
    img = Image.new("RGB", (width, height), color=(100, 150, 200))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode()


_SAMPLE_IMAGE = _make_base64_image()

# Token Firebase válido — substitua por um token real para testes em staging
_AUTH_TOKEN = "Bearer SEU_TOKEN_FIREBASE_AQUI"


class HealthUser(HttpUser):
    """Simula monitoramento contínuo do health check."""

    wait_time = between(1, 3)
    weight = 3  # 30% do tráfego

    @task
    def health_check(self):
        with self.client.get("/health", catch_response=True) as resp:
            if resp.json().get("status") != "ok":
                resp.failure("Health retornou status diferente de ok")


class ScannerUser(HttpUser):
    """Simula operador fazendo scans de inventário."""

    wait_time = between(5, 15)  # operador demora entre scans
    weight = 6  # 60% do tráfego

    @task(3)
    def detect(self):
        with self.client.post(
            "/v1/detect",
            json={
                "image_base64": _SAMPLE_IMAGE,
                "source": "mobile",
                "platform": "ios",
            },
            headers={"Authorization": _AUTH_TOKEN},
            catch_response=True,
            timeout=60,
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                if "detections" not in data:
                    resp.failure("Resposta sem campo 'detections'")
            elif resp.status_code == 401:
                resp.failure("Token inválido — atualize _AUTH_TOKEN")
            elif resp.status_code == 429:
                resp.success()  # rate limit esperado sob carga alta
            else:
                resp.failure(f"Status inesperado: {resp.status_code}")

    @task(1)
    def health(self):
        self.client.get("/health")


class MetricsUser(HttpUser):
    """Simula Prometheus fazendo scraping de métricas."""

    wait_time = between(10, 30)
    weight = 1  # 10% do tráfego

    @task
    def scrape_metrics(self):
        with self.client.get("/metrics", catch_response=True) as resp:
            if "contia_detections_total" not in resp.text:
                resp.failure("Métrica contia_detections_total ausente")
