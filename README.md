# Cont.IA — Contagem Inteligente por Visão Computacional

O **Cont.IA** é um aplicativo mobile que **identifica, classifica e conta itens sem repetição** usando a câmera do celular. Ele substitui a prancheta, o contador manual e o "olhômetro" — entregando o dado pronto e confiável.

> Não é um sistema de gestão de estoque. Não calcula entrada e saída de produtos. O foco é a **contagem visual precisa**: o app aponta a câmera, reconhece o objeto, diz o que é e quantos têm.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│  App Mobile (React Native)                          │
│  Câmera / Galeria → base64 → POST /v1/detect        │
│  Firebase Auth (token JWT)                          │
└───────────────────┬─────────────────────────────────┘
                    │ Bearer token
                    ▼
┌─────────────────────────────────────────────────────┐
│  Backend FastAPI (Docker)                           │
│  Valida token Firebase Admin SDK                    │
│  Roda YOLO11 → retorna detecções                    │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  Firebase (Google Cloud)                            │
│  Auth — Firestore — Storage                         │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Mobile | React Native 0.84 (iOS + Android) |
| Detecção IA | YOLO11 via Ultralytics (backend) |
| Backend | Python 3.11 + FastAPI 0.115 |
| Auth | Firebase Authentication |
| Banco de dados | Cloud Firestore |
| Storage | Firebase Storage |
| Containerização | Docker + docker-compose |
| Testes | pytest (backend) + Jest (frontend) |

---

## Estrutura do Repositório

```
Cont.IA/
├── docker-compose.yml          # Orquestração do backend
├── backend/                    # API Python/FastAPI
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py             # App + init Firebase Admin
│   │   ├── api/
│   │   │   ├── deps.py         # get_current_user() — JWT
│   │   │   └── routes/detect.py
│   │   ├── core/config.py
│   │   ├── schemas/detect.py
│   │   └── services/yolo_service.py
│   └── tests/
├── frontend/                   # App React Native
│   ├── src/
│   │   ├── screens/
│   │   │   ├── auth/           # Login, Cadastro, Aprovação pendente
│   │   │   ├── admin/          # Gerenciar usuários (admin)
│   │   │   ├── home/           # Dashboard + gráficos
│   │   │   ├── inventory/      # Scanner + Histórico
│   │   │   └── profile/        # Perfil do usuário
│   │   ├── services/           # apiClient, authService, yoloService...
│   │   ├── navigation/         # Stack + Drawer
│   │   └── hooks/
│   └── __tests__/
└── Dataset/
    ├── data.yaml               # Config do dataset
    └── train_colab.ipynb       # Notebook de treinamento YOLO11
```

---

## O que o app faz

| Etapa | Descrição |
|---|---|
| **Identifica** | Reconhece o tipo do objeto na imagem (ex: parafuso philips) |
| **Classifica** | Categoriza o que foi encontrado |
| **Conta** | Soma as unidades sem duplicidade usando YOLO11 |
| **Registra** | Salva resultado com foto, GPS, usuário e data/hora |
| **Exporta** | Gera CSV com os dados da contagem |

---

## Funcionalidades

### Autenticação e Controle de Acesso
- Cadastro com **matrícula única** por funcionário (anti-duplicata)
- Novos usuários ficam em estado **"pendente"** até aprovação do admin
- Login verifica status: `active` → app | `pending` → tela de espera | `rejected` → bloqueado
- **Perfis:** `admin` e `user` com permissões distintas

### Perfil Admin
- Vê inventário de **todos** os usuários
- Dashboard com 3 cards + gráfico de scans dos últimos 7 dias
- Tela de gerenciamento de usuários: aprovar / recusar / mudar role / revogar
- Exportação CSV do inventário completo

### Perfil Usuário
- Vê apenas seu próprio histórico
- Dashboard com seus dados pessoais

### Contagem de Itens (Scanner)
- Captura via câmera ou galeria
- **GPS automático** registrado na contagem
- Campo de local descritivo (ex: "Almoxarifado A")
- Identificação + classificação + contagem via YOLO11

### Histórico de Contagens
- Filtros por período: Hoje / 7 / 30 / 60 / 90 dias
- Busca textual por item, usuário ou local
- Visualização da foto com preview modal
- Exportação CSV (`contagem_*.csv`)

---

## Como Rodar

### Pré-requisitos
- Docker e docker-compose instalados
- Node.js >= 22 e React Native CLI
- Android Studio (Android) ou Xcode (iOS)

### 1. Backend

```bash
# Coloque o arquivo firebase-service-account.json dentro de backend/
# Copie o .env.example para .env
cp backend/.env.example backend/.env

# Subir com Docker
docker compose up --build
```

Acesse a documentação da API: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

# Copie o .env.example para .env e preencha as credenciais Firebase
cp .env.example .env

# Instale as dependências
npm install

# Android (emulador AVD — YOLO_API_URL=http://10.0.2.2:8000)
npx react-native run-android

# iOS (simulador — YOLO_API_URL=http://localhost:8000)
bundle exec pod install
npx react-native run-ios
```

### 3. Testes

```bash
# Backend
cd backend && .venv/bin/python3.11 -m pytest tests/ -v

# Frontend
cd frontend && npx jest --no-coverage
```

---

## Variáveis de Ambiente

### Backend (`backend/.env`)
| Variável | Padrão | Descrição |
|---|---|---|
| `YOLO_MODEL` | `yolo11m.pt` | Arquivo do modelo YOLO |
| `YOLO_CONF` | `0.25` | Threshold de confiança |
| `API_ENV` | `development` | Ambiente |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `firebase-service-account.json` | Credencial Firebase Admin |

### Frontend (`frontend/.env`)
| Variável | Descrição |
|---|---|
| `FIREBASE_API_KEY` | Chave da API Firebase |
| `FIREBASE_PROJECT_ID` | ID do projeto Firebase |
| `YOLO_API_URL` | URL do backend (varia por ambiente) |

---

## Treinamento do Modelo

O notebook `Dataset/train_colab.ipynb` contém o pipeline completo para treinar um modelo YOLO11n customizado no Google Colab (GPU gratuita).

Após treinar, substitua o modelo no backend:
```bash
# Copie best.pt para backend/
cp best.pt backend/contia_parafusos.pt

# Atualize backend/.env
YOLO_MODEL=contia_parafusos.pt

# Reinicie
docker compose up --build
```

---

## Segurança

- `firebase-service-account.json` e `.env` estão no `.gitignore` — nunca são enviados ao repositório
- Todos os endpoints de detecção exigem token Firebase válido (`Authorization: Bearer`)
- Admin SDK valida o token no servidor a cada requisição
- Usuários novos precisam de aprovação manual do administrador
