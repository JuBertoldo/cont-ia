# Cont.IA — Contagem e Identificação Visual por Visão Computacional

O **Cont.IA** é um aplicativo mobile multiplataforma que **identifica, classifica e conta itens físicos** usando a câmera do celular e Inteligência Artificial. Substitui a prancheta e a contagem manual — entregando o dado pronto, rastreável e auditável.

> Não é um sistema de gestão de estoque. O foco é a **contagem visual precisa**: o app aponta a câmera, reconhece o objeto com YOLO11 + RF-DETR em ensemble, diz o que é e quantos têm.

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│  App Mobile (React Native 0.84 — iOS + Android)              │
│  Câmera / Galeria → base64 → POST /v1/detect                 │
│  Firebase Auth (token JWT)                                    │
└──────────────────────┬───────────────────────────────────────┘
                       │ Bearer token
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend FastAPI (Docker + Cloudflare Tunnel)                │
│  Valida token Firebase Admin SDK                             │
│  YOLO11 (local CPU) + RF-DETR (Roboflow API) em paralelo     │
│  Ensemble NMS → retorna detecções mergeadas                  │
│  GET /metrics → Prometheus                                   │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Firebase (Google Cloud)                                     │
│  Auth · Firestore · Storage                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Mobile | React Native 0.84 (iOS + Android) |
| Detecção IA | YOLO11m (Ultralytics) + RF-DETR (Roboflow) em ensemble |
| Backend | Python 3.11 + FastAPI 0.115 |
| Auth | Firebase Authentication |
| Banco de dados | Cloud Firestore (paginação + 9 índices compostos) |
| Storage | Firebase Storage |
| Containerização | Docker + Cloudflare Tunnel |
| Resiliência | Retry backoff exponencial · Queue offline · Circuit Breaker |
| Observabilidade | Sentry (erros) + Prometheus `/metrics` + telemetria de inferência |
| CI/CD | GitHub Actions (lint, testes, pip-audit, npm audit, secrets scan) |
| Testes | pytest 80%+ (backend) · Jest 80%+ (frontend) · Detox E2E |

---

## Estrutura do Repositório

```
Cont.IA/
├── .github/workflows/        # CI: lint, testes, auditoria de deps, secrets scan
├── CONTRIBUTING.md           # Guia de onboarding (15 minutos)
├── docker-compose.yml
├── firestore.rules           # Regras de segurança por role
├── backend/
│   ├── app/
│   │   ├── main.py           # App FastAPI + Firebase Admin + /metrics
│   │   ├── api/routes/       # detect.py, notify.py
│   │   ├── core/
│   │   │   ├── config.py     # Variáveis de ambiente
│   │   │   ├── metrics.py    # Contadores Prometheus
│   │   │   └── limiter.py    # Rate limiting (slowapi)
│   │   ├── services/
│   │   │   ├── yolo_service.py
│   │   │   ├── roboflow_service.py
│   │   │   ├── ensemble.py   # NMS merge YOLO + RF-DETR
│   │   │   ├── email_service.py
│   │   │   └── push_service.py
│   │   └── schemas/
│   └── tests/                # 80%+ cobertura
├── frontend/
│   ├── e2e/                  # Testes E2E Detox (auth, scanner, history)
│   └── src/
│       ├── screens/
│       │   ├── auth/         # Login, Cadastro, Aprovação pendente
│       │   ├── home/         # Dashboard + gráficos
│       │   ├── inventory/    # Scanner + Histórico
│       │   ├── admin/        # Gerenciar usuários (Admin)
│       │   ├── super_admin/  # Todas as empresas, curadoria de dataset
│       │   ├── support/      # Chamados de suporte (perfil Support)
│       │   ├── notifications/
│       │   └── profile/
│       ├── services/         # authService, scannerService, yoloService...
│       ├── hooks/
│       └── utils/
└── Dataset/
    ├── data.yaml
    └── train_colab.ipynb     # Notebook treino YOLO11 (Google Colab)
```

---

## Perfis de Acesso

O sistema implementa **4 perfis** com permissões distintas:

### Perfil Usuário (`user`)
- Realiza scans e vê **seu próprio** histórico
- Dashboard com seus dados pessoais

### Perfil Admin (`admin`)
- Vê inventário de **todos** os usuários da empresa
- Dashboard com cards + gráfico de scans dos últimos 7 dias
- Gerencia usuários: aprovar / recusar / promover / revogar
- Exporta CSV do inventário completo
- Abre e acompanha chamados de suporte

### Perfil Super Admin (`super_admin`)
- Acesso irrestrito a **todas** as empresas
- Curadoria do dataset: valida, edita e rejeita correções de labels
- Visualiza detalhes de qualquer empresa e usuário
- Acessa painel de todas as empresas cadastradas

### Perfil Support (`support`)
- **Cadastro por convite** — acesso restrito via link secreto gerado pelo Super Admin
- Vê e responde chamados de **todas** as empresas
- Drawer exclusivo: sem acesso ao scanner, histórico ou dados de inventário
- Atualiza status dos chamados e notifica os admins automaticamente

---

## Funcionalidades

### Scanner e Contagem
- Captura via câmera ou galeria
- Dois modelos de IA em paralelo: **YOLO11** (local) + **RF-DETR** (Roboflow)
- Merge inteligente por **label + IoU** — sem duplicatas, preserva objetos de classes diferentes
- **GPS automático** + geocodificação reversa (OpenStreetMap)
- Campo de local descritivo (ex: "Almoxarifado A")
- Modal com recorte de cada objeto detectado e % de confiança
- Edição inline de labels — correções viram dados de treinamento futuro
- Realce automático em imagens escuras (PIL brightness/contrast)
- **Retry automático** com backoff exponencial (3 tentativas: 500ms → 1s → 2s)
- **Queue offline** — scans sem conexão são salvos localmente e sincronizados ao reconectar
- **Circuit Breaker** no Roboflow — após 3 falhas consecutivas, bloqueia chamadas por 60s e continua com YOLO

### Histórico e Exportação
- Filtros por período: Hoje / 7 / 30 / 60 / 90 dias
- Busca por item, usuário ou local
- Visualização da foto de auditoria com modal
- Exportação CSV (`contagem_*.csv`)

### Autenticação e Segurança
- Cadastro com código de empresa + matrícula única
- Novos usuários ficam em **"pendente"** até aprovação do admin
- Login verifica status: `active` → app | `pending` → tela de espera | `rejected` → bloqueado
- Bloqueio de conta após **5 tentativas falhas** por 15 minutos
- Mensagens genéricas para evitar enumeração de usuários
- Audit log de logins no Firestore (`login_audit`)
- Regras Firestore granulares por role e `empresaId`

### Notificações In-App
- Sininho com badge em tempo real (Firestore `onSnapshot`)
- Novo usuário pendente → notifica Admins da empresa
- Chamado aberto → notifica todos os Supports + Super Admin
- Chamado respondido → notifica o Admin que abriu
- Tela de notificações com lida/não lida e "Ler todas"

### Sistema de Chamados (Support)
- Admin abre chamado com 4 tipos e SLA automático por tipo
- Fluxo bidirecional: `aberto → em andamento → aguardando cliente → resolvido`
- Semáforo visual de SLA (verde / amarelo / vermelho / vencido)
- E-mail automático ao admin quando o status muda (SMTP)

### Dataset e Treinamento
- Correções de label salvas no Firestore com bounding box e foto
- Tela de curadoria do Super Admin (validar / editar / rejeitar)
- Script `export_dataset.py` com 3 tiers de qualidade (Gold / Silver / Bronze)
- Notebook Colab para treino YOLO11 com GPU gratuita

### Observabilidade
- **Sentry** — captura de erros com contexto de dispositivo (model, OS, role)
- **Prometheus** — métricas em `GET /metrics`:
  - `contia_detections_total{source}` — objetos detectados por modelo
  - `contia_detection_duration_seconds` — histograma de tempo de inferência
  - `contia_detection_errors_total{source}` — erros por origem
  - `contia_active_requests` — requisições em andamento
- **Telemetria de inferência** — tempo de detecção por modelo de celular salvo no Firestore com SLA check automático (< 20s ok / > 20s warn / > 55s critical)

---

## Como Rodar

> Para o guia completo com Firebase Local Emulator e configuração passo a passo, veja [CONTRIBUTING.md](CONTRIBUTING.md).

### 1. Backend

```bash
# Configure as variáveis de ambiente
cp backend/.env.example backend/.env
# Edite backend/.env com suas chaves

# Subir com Docker
docker compose up --build

# Verificar
curl http://localhost:8000/health   # {"status": "ok"}
curl http://localhost:8000/metrics  # métricas Prometheus
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install

# iOS (simulador)
npx react-native run-ios

# iOS (dispositivo físico)
npx react-native run-ios --device "Nome do iPhone"

# Android
npx react-native run-android
```

### 3. Testes

```bash
# Backend (cobertura 80%+)
cd backend && pytest tests/ -v --cov=app --cov-fail-under=80

# Frontend — unitários (cobertura 80%+)
cd frontend && npm run test:coverage

# Frontend — E2E Detox (iOS)
cd frontend
npm run test:e2e:build   # compila o app uma vez
npm run test:e2e         # executa os cenários
```

---

## Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `API_ENV` | `development` | Ambiente (`development` / `production`) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `./contia-firebase-adminsdk.json` | Credencial Firebase Admin |
| `YOLO_MODEL` | `yolo11m.pt` | Arquivo do modelo YOLO |
| `YOLO_CONF` | `0.35` | Threshold de confiança |
| `YOLO_TIMEOUT_S` | `55` | Timeout da inferência em segundos |
| `ENSEMBLE_IOU_THRESHOLD` | `0.5` | Limiar IoU para NMS |
| `ROBOFLOW_API_KEY` | — | Chave Roboflow (RF-DETR) |
| `RATE_LIMIT` | `30/minute` | Rate limiting do endpoint `/detect` |
| `SENTRY_DSN` | — | DSN do Sentry (opcional) |
| `SMTP_USER` / `SMTP_PASSWORD` | — | Credenciais SMTP para e-mail |
| `CORS_ORIGINS` | `http://localhost:8081` | Origens permitidas |

### Frontend (`frontend/.env`)

| Variável | Descrição |
|---|---|
| `FIREBASE_API_KEY` | Chave da API Firebase |
| `FIREBASE_PROJECT_ID` | ID do projeto Firebase |
| `FIREBASE_STORAGE_BUCKET` | Bucket do Firebase Storage |
| `API_BASE_URL` | URL do backend (ex: `http://localhost:8000`) |
| `SENTRY_DSN` | DSN do Sentry (opcional) |
| `USE_FIREBASE_EMULATOR` | `true` para usar o emulador local |

---

## Treinamento do Modelo Próprio

O notebook `Dataset/train_colab.ipynb` contém o pipeline completo para treinar um modelo YOLO11 customizado no Google Colab (GPU gratuita):

```bash
# Após treinar, substitua o modelo no backend
cp best.pt backend/contia_modelo_proprio.pt

# Atualize backend/.env
YOLO_MODEL=contia_modelo_proprio.pt

docker compose up --build
```

---

## Segurança

- `firebase-service-account.json` e `.env` no `.gitignore` — nunca enviados ao repositório
- **detect-secrets** no pre-commit bloqueia chaves privadas acidentais
- **pip-audit** e **npm audit** no CI — falha em vulnerabilidades HIGH ou CRITICAL
- Todos os endpoints exigem token Firebase válido (`Authorization: Bearer`)
- Rate limiting: 30 req/min por IP no endpoint `/detect`
- CORS restrito — `*` bloqueado em produção por validação em runtime
- Regras Firestore granulares: isolamento total de dados por `empresaId` e `role`
- Cadastro do perfil Support exige convite gerado pelo Super Admin

---

## Contribuindo

Leia o [CONTRIBUTING.md](CONTRIBUTING.md) para configurar o ambiente local, entender os padrões de branch e o fluxo de PR.

---

## Desenvolvedores

- **Juliana Pereira Bertoldo** — [github.com/JuBertoldo](https://github.com/JuBertoldo)
- **Wellington Silva Paiva**

**Orientador:** Prof. José Carlos da Silva Duarte Filho — Faculdade Senac Amazonas (FATESE)
