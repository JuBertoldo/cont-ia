# Cont.IA — Backend

API REST em **FastAPI** responsável pela detecção de objetos com YOLO11 e validação de autenticação Firebase.

---

## Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/health` | Não | Health check |
| `GET` | `/v1/version` | Não | Versão da API e do modelo |
| `POST` | `/v1/detect` | **Sim** | Detecta objetos em imagem base64 |

### POST /v1/detect

**Request**
```json
{
  "image_base64": "string (min 10 chars)",
  "source": "mobile",
  "platform": "android"
}
```

**Response**
```json
{
  "detections": [
    {
      "label": "parafuso_philips",
      "confidence": 0.92,
      "bbox": [10.0, 20.0, 100.0, 200.0]
    }
  ],
  "meta": {
    "model": "yolo11m.pt",
    "processing_ms": 145
  }
}
```

**Auth:** `Authorization: Bearer <firebase_id_token>`

---

## Rodar Localmente

```bash
# 1. Criar e ativar o ambiente virtual
python3.11 -m venv .venv
source .venv/bin/activate

# 2. Instalar dependências
pip install -r requirements.txt

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env conforme necessário

# 4. Adicionar o service account Firebase
# Coloque o arquivo firebase-service-account.json na raiz de backend/

# 5. Rodar
uvicorn app.main:app --reload --port 8000
```

Documentação interativa: http://localhost:8000/docs

---

## Rodar com Docker

```bash
# Na raiz do repositório
docker compose up --build
```

O `firebase-service-account.json` é montado como volume — não entra na imagem.

---

## Testes

```bash
cd backend
.venv/bin/python3.11 -m pytest tests/ -v
```

Cobertura atual: **15 testes** — todos passando.

| Arquivo | O que testa |
|---|---|
| `test_health.py` | Endpoint `/health` |
| `test_detect_contract.py` | Contrato da API (input/output, auth) |
| `test_yolo_service.py` | Serviço YOLO (unit, com mock) |

---

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `YOLO_MODEL` | `yolo11m.pt` | Nome ou caminho do modelo |
| `YOLO_CONF` | `0.25` | Threshold mínimo de confiança |
| `API_ENV` | `development` | `development` ou `production` |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `firebase-service-account.json` | Caminho do service account |
| `CORS_ORIGINS` | `*` | Origens permitidas (restringir em produção) |

---

## Estrutura

```
backend/
├── app/
│   ├── main.py                  # FastAPI app + lifespan (init Firebase)
│   ├── api/
│   │   ├── deps.py              # get_current_user() — valida JWT
│   │   └── routes/detect.py    # POST /v1/detect
│   ├── core/
│   │   ├── config.py            # Settings via env vars
│   │   └── logging.py
│   ├── schemas/detect.py        # DetectRequest / DetectResponse
│   └── services/yolo_service.py # Inferência YOLO11
├── tests/
│   ├── conftest.py              # Mock Firebase + override auth
│   ├── test_detect_contract.py
│   ├── test_health.py
│   └── test_yolo_service.py
├── Dockerfile
├── requirements.txt
├── pyproject.toml
├── .env.example
└── firebase-service-account.json  ← não vai pro git
```

---

## Usar Modelo Customizado

Após treinar com o notebook `Dataset/train_colab.ipynb`:

```bash
# Copie o modelo treinado
cp best.pt backend/contia_parafusos.pt

# Atualize .env
YOLO_MODEL=contia_parafusos.pt

# Reinicie
docker compose up --build
```
