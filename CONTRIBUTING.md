# Guia de Contribuição — Cont.IA

> **Objetivo:** qualquer desenvolvedor deve conseguir rodar o projeto completo em **menos de 15 minutos**.

---

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Clone e configuração inicial](#2-clone-e-configuração-inicial)
3. [Firebase Local Emulator](#3-firebase-local-emulator)
4. [Rodando o backend (Vision AI)](#4-rodando-o-backend-vision-ai)
5. [Rodando o app mobile](#5-rodando-o-app-mobile)
6. [Padrões de branches e commits](#6-padrões-de-branches-e-commits)
7. [Fluxo de PR](#7-fluxo-de-pr)
8. [**Regra de Ouro — Novos Serviços**](#8-regra-de-ouro--novos-serviços)
9. [Variáveis de ambiente](#9-variáveis-de-ambiente)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Verificar |
|---|---|---|
| Node.js | 22.x | `node --version` |
| Python | 3.11+ | `python3 --version` |
| Docker Desktop | 24+ | `docker --version` |
| Xcode | 15+ (macOS) | `xcode-select --version` |
| CocoaPods | 1.15+ | `pod --version` |
| Firebase CLI | 13+ | `firebase --version` |
| Java JDK | 17+ (Android) | `java --version` |

```bash
# Instalar Firebase CLI (se não tiver)
npm install -g firebase-tools

# Instalar CocoaPods (se não tiver)
sudo gem install cocoapods
```

---

## 2. Clone e configuração inicial

```bash
git clone https://github.com/JuBertoldo/cont-ia.git
cd cont-ia

# Instalar dependências do frontend
cd frontend && npm install && cd ..

# Instalar dependências do backend
cd backend && pip install -r requirements.txt && cd ..
```

### Configurar variáveis de ambiente

```bash
# Backend
cp backend/.env.example backend/.env
# Edite backend/.env com suas chaves (veja Seção 8)

# Frontend
cp frontend/.env.example frontend/.env
# Edite frontend/.env com suas chaves Firebase
```

---

## 3. Firebase Local Emulator

O emulador permite desenvolver **sem consumir cota do projeto Firebase real** e **sem internet**.

### 3.1 Login e inicialização

```bash
firebase login
firebase use --add   # selecione o projeto contia-8ca4a
```

### 3.2 Subir o emulador

```bash
# Na raiz do projeto
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
```

Os serviços sobem nos seguintes endereços:

| Serviço | URL | Porta |
|---|---|---|
| **Firestore** | http://localhost:8080 | 8080 |
| **Auth** | http://localhost:9099 | 9099 |
| **Storage** | http://localhost:9199 | 9199 |
| **Emulator UI** | http://localhost:4000 | 4000 |

### 3.3 Apontar o frontend para o emulador

No arquivo `frontend/.env`, adicione:

```env
USE_FIREBASE_EMULATOR=true
```

O `firebaseConfig.js` já detecta essa variável e conecta automaticamente ao emulador quando `USE_FIREBASE_EMULATOR=true`:

```js
// src/config/firebaseConfig.js — trecho relevante
if (process.env.USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

### 3.4 Seed de dados de teste

```bash
# Importa dados de exemplo para o emulador (usuários, empresas, inventário)
firebase emulators:start --import=./emulator-data
```

O diretório `emulator-data/` contém:
- 1 empresa de exemplo (código: `DEMO01`)
- 1 usuário admin: `admin@contia.dev` / `Demo@12345`
- 3 registros de inventário de exemplo

---

## 4. Rodando o backend (Vision AI)

O backend FastAPI com YOLO11 roda via **Docker** para evitar problemas de dependência do Python.

### 4.1 Subir com Docker (recomendado)

```bash
cd backend
docker compose up --build
```

O backend sobe em `http://localhost:8000`. Verifique:

```bash
curl http://localhost:8000/health
# {"status": "ok"}
```

### 4.2 Rodar sem Docker (desenvolvimento rápido)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

> **Importante:** sem Docker, o modelo YOLO (`yolo11m.pt`) precisa estar em `backend/models/`. O download automático ocorre na primeira execução (~40 MB).

### 4.3 Expor o backend para o celular físico

O app mobile precisa acessar o backend pelo celular. Use o **Cloudflare Tunnel** ou **ngrok**:

```bash
# Opção 1 — Cloudflare Tunnel (URL permanente, recomendado)
make tunnel-up

# Opção 2 — ngrok (URL temporária)
ngrok http 8000
```

Copie a URL gerada e configure em `frontend/.env`:

```env
API_BASE_URL=https://sua-url-aqui.trycloudflare.com
```

### 4.4 Testar o scanner em desenvolvimento

```bash
# Teste de endpoint de detecção com imagem de exemplo
curl -X POST http://localhost:8000/v1/detect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_FIREBASE" \
  -d '{"image_base64": "'"$(base64 -i docs/test_assets/garrafas.jpg)"'", "platform": "dev"}'
```

### 4.5 Métricas em tempo real

```bash
# Ver métricas Prometheus do backend
curl http://localhost:8000/metrics

# Métricas disponíveis:
# contia_detections_total{source="yolo|rfdetr|merged"}
# contia_detection_duration_seconds (histograma)
# contia_detection_errors_total{source="yolo|rfdetr|timeout|internal"}
# contia_active_requests (gauge)
```

---

## 5. Rodando o app mobile

### 5.1 iOS (macOS obrigatório)

```bash
# Terminal 1 — Metro bundler
cd frontend && npm start

# Terminal 2 — Build e instalar no simulador
npx react-native run-ios

# Terminal 2 — Build e instalar em dispositivo físico
npx react-native run-ios --device "Nome do seu iPhone"
```

### 5.2 Android

```bash
# Terminal 1 — Metro bundler
cd frontend && npm start

# Terminal 2
npx react-native run-android
```

### 5.3 Testes

```bash
cd frontend

# Todos os testes unitários (rápido, sem cobertura)
npm test

# Testes com relatório de cobertura (falha se < 80%)
npm run test:coverage

# Arquivo específico
npx jest src/services/__tests__/apiClient.test.js --no-coverage

# Smoke tests de wiring (garante que App.js está conectado corretamente)
npx jest __tests__/App.smoke.test.js --no-coverage

# Testes E2E Detox (requer simulador iOS)
npm run test:e2e:build   # compila uma vez
npm run test:e2e         # executa os cenários
```

```bash
cd backend

# Todos os testes com cobertura (falha se < 80%)
pytest tests/ -v --cov=app --cov-fail-under=80

# Arquivo específico
pytest tests/test_circuit_breaker.py -v

# Por categoria (unit / integration)
pytest tests/ -m unit -v
```

---

## 5.4 Validação completa antes do PR

Execute todos os passos abaixo antes de abrir um PR. O CI roda os mesmos comandos automaticamente — se passar localmente, passa no CI.

```bash
# ── Frontend ──────────────────────────────────────────────────────────────────
cd frontend

npm run lint                          # ESLint — zero warnings
npm run format:check                  # Prettier — formatação
npm run type-check                    # TypeScript strict
npm run test:coverage                 # Testes + cobertura ≥ 80%
npx jest __tests__/App.smoke.test.js  # Wiring do App.js
npx depcheck \
  --ignores="@types/*,jest,babel-jest,react-test-renderer,detox,@types/detox" \
  --ignore-dirs="node_modules,vendor,e2e,__mocks__"  # Deps não declaradas

# ── Backend ───────────────────────────────────────────────────────────────────
cd ../backend

ruff check app/ tests/                # Lint Python
ruff format --check app/ tests/       # Formatação Python
pytest tests/ --cov=app --cov-fail-under=80  # Testes + cobertura ≥ 80%
pip-audit -r requirements.txt --severity high  # Vulnerabilidades HIGH+

# ── Secrets ───────────────────────────────────────────────────────────────────
cd ..
detect-secrets scan \
  --baseline .secrets.baseline \
  --exclude-files 'package-lock\.json' \
  --exclude-files 'node_modules/.*'
```

---

## 6. Padrões de branches e commits

### 6.1 Nomenclatura de branches

```
<tipo>/<escopo-curto>

Exemplos:
  feat/scanner-offline-mode
  fix/ios-teclado-modal
  chore/atualizar-yolo-11m
  docs/contributing-guide
  refactor/auth-service
  test/scanner-e2e
```

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `chore` | Atualização de deps, config, CI |
| `docs` | Documentação apenas |
| `refactor` | Refatoração sem mudança de comportamento |
| `test` | Adição/melhoria de testes |
| `perf` | Melhoria de performance |

### 6.2 Branches protegidas

| Branch | Proteção | Propósito |
|---|---|---|
| `main` | Push direto bloqueado, PR obrigatório | Código em produção |
| `develop` | CI deve passar | Integração contínua |

### 6.3 Fluxo de trabalho

```
main ◄─── develop ◄─── feat/sua-feature
                   ◄─── fix/seu-bug
                   ◄─── chore/sua-tarefa
```

1. Crie sua branch a partir de `develop`
2. Desenvolva e faça commits com Conventional Commits
3. Abra PR para `develop`
4. Após aprovação e CI verde → merge para `develop`
5. Release: `develop` → `main` via PR de release

### 6.4 Conventional Commits

O projeto enforça o padrão via `commitlint`. Formato:

```
<tipo>(<escopo>): <descrição>

Exemplos válidos:
  feat(scanner): adicionar suporte a modo offline
  fix(ios): corrigir teclado cobrindo modal de edição
  chore(deps): atualizar yolo para 8.4.0
  docs(contributing): adicionar guia de emulador Firebase
```

> O Husky valida automaticamente ao fazer `git commit`. Commits inválidos são rejeitados.

---

## 7. Fluxo de PR

### Checklist antes de abrir o PR

- [ ] `npm run lint` sem erros
- [ ] `npm run test:coverage` passando (≥ 80% cobertura global)
- [ ] `npm run type-check` sem erros TypeScript
- [ ] Backend: `pytest tests/ --cov-fail-under=80` passando
- [ ] Sem secrets hardcoded (o pre-commit hook valida automaticamente)

### Tamanho ideal de PR

- **< 400 linhas** alteradas (mais fácil de revisar)
- Um PR = uma mudança coesa
- PRs grandes devem ser quebrados em etapas menores

---

## 8. Regra de Ouro — Novos Serviços

> **Todo serviço que precisa ser inicializado no `App.js` deve ter um teste de smoke correspondente.**

Esta regra existe porque testes unitários cobrem funções isoladas, mas **não detectam wiring quebrado** — um serviço pode ter 100% de cobertura e nunca ser ativado na aplicação real.

### O ciclo correto ao criar um novo serviço

```
1. Cria o serviço com sua lógica
       ↓
2. Escreve o smoke test em __tests__/App.smoke.test.js
   (o teste FALHA — red)
       ↓
3. Adiciona o wiring no App.js (useEffect ou chamada direta)
   (o teste PASSA — green)
       ↓
4. Abre o PR → CI valida automaticamente
       ↓
5. Merge seguro ✅
```

### O que o CI valida automaticamente

| Verificação | Ferramenta | O que detecta |
|---|---|---|
| Import sem `package.json` | `depcheck` | `import X from 'pkg-nao-instalado'` |
| Serviço criado mas não conectado | `App.smoke.test.js` | `startConnectivityListener()` nunca chamado |
| Vulnerabilidades em deps | `npm audit` + `pip-audit` | CVEs HIGH/CRITICAL |
| Segredos hardcoded | `detect-secrets` | API keys, tokens no código |

### Adicionando um novo serviço — checklist

```bash
# 1. Crie o serviço
touch frontend/src/services/meuServicoService.js

# 2. Adicione o teste de smoke ANTES de implementar o wiring
# Edite: frontend/__tests__/App.smoke.test.js
# Adicione um teste que verifique que o serviço é chamado na montagem

# 3. Rode o smoke test (deve FALHAR)
npx jest __tests__/App.smoke.test.js --no-coverage

# 4. Adicione o wiring no App.js
# useEffect(() => { inicializarMeuServico(); }, []);

# 5. Rode novamente (deve PASSAR)
npx jest __tests__/App.smoke.test.js --no-coverage
```

### Exemplo real — como o `offlineScanQueueService` foi adicionado

```js
// frontend/__tests__/App.smoke.test.js
it('inicia o listener de conectividade na montagem', () => {
  render(<App />);
  expect(mockStartListener).toHaveBeenCalledTimes(1); // teria falhado antes do wiring
});

it('cancela o listener ao desmontar (sem memory leak)', () => {
  const mockUnsubscribe = jest.fn();
  mockStartListener.mockReturnValueOnce(mockUnsubscribe);
  const { unmount } = render(<App />);
  unmount();
  expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
});
```

```js
// frontend/App.js — wiring que faz os testes passarem
useEffect(() => {
  initSentry();
  const unsubscribe = startConnectivityListener();
  return unsubscribe; // cleanup automático = sem memory leak
}, []);
```

---

## 9. Variáveis de ambiente

### `frontend/.env`

```env
# Firebase
FIREBASE_API_KEY=sua_api_key
FIREBASE_AUTH_DOMAIN=contia-8ca4a.firebaseapp.com
FIREBASE_PROJECT_ID=contia-8ca4a
FIREBASE_STORAGE_BUCKET=contia-8ca4a.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
FIREBASE_APP_ID=seu_app_id

# Backend
API_BASE_URL=http://localhost:8000

# Sentry (opcional em dev)
SENTRY_DSN=

# Emulador (true para desenvolvimento local)
USE_FIREBASE_EMULATOR=true
```

### `backend/.env`

```env
# Ambiente
API_ENV=development

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_PATH=./contia-firebase-adminsdk.json

# YOLO
YOLO_MODEL=yolo11m.pt
YOLO_CONF=0.35
YOLO_TIMEOUT_S=55
ENSEMBLE_IOU_THRESHOLD=0.5

# Roboflow (opcional)
ROBOFLOW_API_KEY=
ROBOFLOW_WORKSPACE=
ROBOFLOW_PROJECT=
ROBOFLOW_VERSION=

# E-mail (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM_NAME=Cont.IA

# Rate limiting
RATE_LIMIT=30/minute

# Sentry (opcional)
SENTRY_DSN=

# CORS
CORS_ORIGINS=http://localhost:8081,http://localhost:3000
```

---

## 10. Troubleshooting

### Metro bundler não conecta ao backend

```bash
# Verifique se o backend está rodando
curl http://localhost:8000/health

# No iOS Simulator, use o IP da máquina (não localhost)
# Ajuste API_BASE_URL para http://SEU_IP_LOCAL:8000
ipconfig getifaddr en0   # macOS
```

### Pods falhando no iOS

```bash
cd frontend/ios
pod deintegrate && pod install
```

### Docker não encontra o modelo YOLO

```bash
# O modelo é baixado automaticamente na primeira execução
# Se falhar, baixe manualmente:
cd backend
python3 -c "from ultralytics import YOLO; YOLO('yolo11m.pt')"
```

### Firebase Emulator não inicia

```bash
# Verifique se o Java está instalado (necessário para emulador)
java --version

# Reinstale o emulador
firebase setup:emulators:firestore
firebase setup:emulators:auth
firebase setup:emulators:storage
```

### Erro `USE_FIREBASE_EMULATOR` não reconhecido

```bash
# Instale o react-native-config se não estiver instalado
cd frontend && npm install react-native-config
cd ios && pod install
```

---

## Contato

- **Issues:** [github.com/JuBertoldo/cont-ia/issues](https://github.com/JuBertoldo/cont-ia/issues)
- **Autores:** Juliana Pereira Bertoldo · Wellington Silva Paiva
- **Orientador:** Prof. José Carlos da Silva Duarte Filho — Faculdade Senac Amazonas
