# Testes de Carga — Cont.IA

## Setup

```bash
pip install locust Pillow
```

## Executar

```bash
# Interface web (recomendado para apresentação)
locust -f tests/load/locustfile.py --host=http://localhost:8000

# Headless (CI/CD)
locust -f tests/load/locustfile.py \
  --host=http://localhost:8000 \
  --users 20 \
  --spawn-rate 2 \
  --run-time 60s \
  --headless \
  --csv=tests/load/results

# Abrir interface: http://localhost:8089
```

## Configurar token

Edite `_AUTH_TOKEN` no `locustfile.py` com um token Firebase válido:

```python
# Obter token no app mobile:
# Firebase Auth → currentUser.getIdToken() → copiar
_AUTH_TOKEN = "Bearer eyJ..."
```

## SLA esperado

| Endpoint | p50 | p95 | p99 |
|---|---|---|---|
| `GET /health` | < 10ms | < 100ms | < 200ms |
| `POST /v1/detect` | < 5s | < 30s | < 55s |
| `GET /metrics` | < 50ms | < 500ms | < 1s |

## Cenários

| Classe | Peso | Comportamento |
|---|---|---|
| `HealthUser` | 30% | Poll a cada 1–3s |
| `ScannerUser` | 60% | Scans a cada 5–15s |
| `MetricsUser` | 10% | Scraping a cada 10–30s |
