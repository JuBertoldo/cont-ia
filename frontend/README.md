# Cont.IA — Frontend

Aplicativo **React Native** (iOS + Android) que **identifica, classifica e conta itens** via câmera usando visão computacional. Substitui a prancheta e o contador manual — entrega o dado pronto e confiável.

---

## Pré-requisitos

- Node.js >= 22
- React Native CLI
- Android Studio (Android) ou Xcode + CocoaPods (iOS)
- Backend Cont.IA rodando (ver `../backend/README.md`)

---

## Configuração

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais Firebase e URL do backend
```

### `frontend/.env`

```env
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

# Android Emulator (AVD)
YOLO_API_URL=http://10.0.2.2:8000

# iOS Simulator
# YOLO_API_URL=http://localhost:8000

# Dispositivo físico (mesmo Wi-Fi)
# YOLO_API_URL=http://192.168.x.x:8000
```

> Após alterar o `.env`, reinicie o Metro para que as variáveis sejam recarregadas.

---

## Rodar

### Android
```bash
npx react-native run-android
```

### iOS
```bash
# Primeira vez ou após atualizar deps nativas
bundle install
bundle exec pod install

npx react-native run-ios
```

---

## Testes

```bash
npx jest --no-coverage
```

Cobertura atual: **31 testes** — todos passando.

| Suite | O que testa |
|---|---|
| `App.test.tsx` | Renderização do App raiz |
| `yoloService.test.js` | Detecção YOLO (mock apiClient) |
| `scannerService.test.js` | Pipeline de scan |
| `historyService.test.js` | Histórico em tempo real |
| `exportService.test.js` | Exportação CSV |
| `useScanner.test.js` | Hook de scanner |

---

## Fluxo de Autenticação

```
Cadastro
  → Matrícula única (anti-duplicata)
  → status: 'pending'
  → Tela "Aguardando aprovação"

Login
  → status 'active'   → App
  → status 'pending'  → Tela de espera
  → status 'rejected' → Bloqueado + logout

Admin aprova no painel → usuário passa a 'active'
```

> **Primeiro cadastro:** vira automaticamente `admin + active`.

---

## Telas

| Tela | Acesso | Descrição |
|---|---|---|
| AuthHome | Público | Login |
| RegisterScreen | Público | Cadastro com matrícula |
| PendingApprovalScreen | Público | Aguardando aprovação |
| HomeScreen | Usuário/Admin | Dashboard + gráfico 7 dias |
| ScannerScreen | Usuário/Admin | Câmera + GPS + Identificação e contagem |
| HistoryScreen | Usuário/Admin | Histórico de contagens com filtros e busca |
| ProfileScreen | Usuário/Admin | Foto + nome |
| AdminUsersScreen | **Admin only** | Aprovar/recusar/gerenciar usuários |

---

## Estrutura

```
frontend/src/
├── screens/
│   ├── auth/          # AuthHome, RegisterScreen, ForgotScreen, PendingApprovalScreen
│   ├── admin/         # AdminUsersScreen
│   ├── home/          # HomeScreen (dashboard)
│   ├── inventory/     # ScannerScreen, HistoryScreen
│   └── profile/       # ProfileScreen
├── services/
│   ├── apiClient.js       # Fetch + token Firebase + timeout
│   ├── authService.js     # Auth + matrícula + status
│   ├── adminService.js    # Aprovar/recusar/alterar role
│   ├── yoloService.js     # Detecção via API
│   ├── scannerService.js  # Pipeline completo
│   ├── inventoryService.js
│   ├── historyService.js  # RBAC: admin vê todos, user vê os seus
│   └── ExportService.js   # CSV
├── navigation/
│   ├── AppNavigator.js    # Stack: Auth → App
│   └── DrawerNavigator.js # Drawer: menus por perfil
├── hooks/
│   ├── useAuth.js
│   ├── useScanner.js
│   └── useProfile.js
├── constants/             # colors, routes, messages
└── utils/                 # formatDate, validators
```

---

## Permissões

### Android (`AndroidManifest.xml`)
- `INTERNET`
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`

### iOS (`Info.plist`)
- `NSLocationWhenInUseUsageDescription`

---

## Dependências principais

| Pacote | Uso |
|---|---|
| `@react-navigation/drawer` | Navegação principal |
| `firebase` | Auth + Firestore + Storage |
| `react-native-config` | Variáveis de ambiente |
| `react-native-image-picker` | Câmera e galeria |
| `@react-native-community/geolocation` | GPS |
| `react-native-chart-kit` + `react-native-svg` | Gráficos |
| `react-native-fs` + `react-native-share` | Export CSV |
| `react-native-vector-icons` | Ícones |
