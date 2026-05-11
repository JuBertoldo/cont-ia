# Documentação Técnica — Cont.IA
### Contagem e Identificação Visual por Visão Computacional
**Juliana Pereira Bertoldo · Wellington Silva Paiva · Faculdade Senac Amazonas — 2026**

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Telas — Frontend](#3-telas--frontend)
4. [Serviços — Frontend](#4-serviços--frontend)
5. [Hooks](#5-hooks)
6. [Constantes e Utilitários](#6-constantes-e-utilitários)
7. [Backend — API FastAPI](#7-backend--api-fastapi)
8. [Scripts Operacionais](#8-scripts-operacionais)
9. [Modelos de Dados Firestore](#9-modelos-de-dados-firestore)
10. [Fluxos Principais](#10-fluxos-principais)
11. [Segurança e Permissões](#11-segurança-e-permissões)
12. [Diagramas UML](#12-diagramas-uml)

---

## 1. Visão Geral da Arquitetura

```
┌────────────────────────────────────────────────────────┐
│  App Mobile (React Native 0.84 — iOS + Android)        │
│  20 telas · 17 serviços · 7 hooks                      │
└──────────────────────┬─────────────────────────────────┘
                       │ POST /v1/detect  (base64 + JWT)
                       ▼
┌────────────────────────────────────────────────────────┐
│  Backend FastAPI (Docker + Cloudflare Tunnel)           │
│  YOLO11m (CPU local) + RF-DETR (Roboflow API)          │
│  Ensemble NMS · Rate Limit · Circuit Breaker           │
│  Sentry · Prometheus /metrics                          │
└──────────────────────┬─────────────────────────────────┘
                       │ Firebase Admin SDK
                       ▼
┌────────────────────────────────────────────────────────┐
│  Firebase (Google Cloud)                               │
│  Auth · Firestore · Storage · Cloud Messaging          │
└────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Pastas

### Raiz do projeto

| Pasta / Arquivo | O que faz |
|---|---|
| `frontend/` | App React Native — telas, serviços, hooks, constantes |
| `backend/` | API Python FastAPI com YOLO11 e RF-DETR |
| `docs/diagramas/` | 14 diagramas PlantUML (arquitetura, fluxos, classes, sequência) |
| `scripts/` | Scripts operacionais Python (export dataset, limpeza Storage) |
| `Dataset/` | Dataset base treino YOLO11 + notebook Google Colab |
| `.github/workflows/` | CI/CD: lint, testes, auditoria de dependências, secrets scan |
| `firestore.rules` | Regras de segurança Firestore por role |
| `firestore.indexes.json` | 9 índices compostos para paginação e buscas |
| `storage.rules` | Regras de acesso ao Firebase Storage |
| `docker-compose.yml` | Orquestra backend + Cloudflare Tunnel |
| `CONTRIBUTING.md` | Guia de onboarding em 15 minutos |

### Frontend — src/

| Pasta | Conteúdo |
|---|---|
| `screens/` | 20 telas organizadas por funcionalidade |
| `services/` | 17 serviços — lógica de negócio e acesso a dados |
| `hooks/` | 7 hooks React customizados |
| `navigation/` | Stack + Drawer Navigator com controle por role |
| `constants/` | Constantes globais (roles, rotas, coleções, cores, SLA) |
| `utils/` | Funções utilitárias (validadores, formatadores, logger, tradução) |
| `config/` | Configuração Firebase + Sentry |
| `components/` | Componentes reutilizáveis (ErrorBoundary, etc.) |

---

## 3. Telas — Frontend

### 3.1 Autenticação (`screens/auth/`)

---

#### `AuthHome.js` — Tela inicial de login

**O que faz:** Ponto de entrada do app. Permite login com e-mail/senha com proteção contra força bruta (bloqueio de 15 minutos após 5 tentativas). Detecta duplo toque no logo para abrir cadastro de técnico de suporte.

**Código-chave — login com proteção de tentativas:**
```javascript
// authService.js — loginWithEmail()
const handleLogin = async () => {
  const block = await checkLoginBlock(email);       // verifica se está bloqueado
  if (block.blocked) {
    Alert.alert('Conta bloqueada', `Tente em ${block.remainingMinutes} minutos.`);
    return;
  }

  try {
    const user = await loginWithEmail({ email, password });
    await clearLoginAttempts(email);                // limpa contagem de falhas
  } catch (error) {
    const { count, blocked } = await recordFailedAttempt(email); // registra falha
    if (blocked) Alert.alert('Bloqueado', 'Muitas tentativas. Aguarde 15 minutos.');
  }
};
```

**Código-chave — duplo toque no logo (abre cadastro Support):**
```javascript
const handleLogoDoubleTap = () => {
  if (doubleTapRef.current) {
    navigation.navigate(ROUTES.SUPPORT_REGISTER);   // abre cadastro convite
    doubleTapRef.current = false;
  } else {
    doubleTapRef.current = true;
    setTimeout(() => { doubleTapRef.current = false; }, 400);
  }
};
```

---

#### `RegisterScreen.js` — Cadastro de usuário

**O que faz:** Dois fluxos no mesmo formulário:
- **Criar empresa:** usuário vira Admin com `status: active` imediatamente
- **Entrar com código:** usuário vira Operador com `status: pending` (aguarda aprovação)

**Código-chave — fluxo duplo de cadastro:**
```javascript
// authService.js — registerWithEmail()
const criarEmpresa = !!nomeEmpresa?.trim();

if (criarEmpresa) {
  // Fluxo 1: novo admin
  const empresa = await createEmpresa(nomeEmpresa, user.uid);
  await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,   // admin ativo imediatamente
    empresaId: empresa.id,
  });
} else {
  // Fluxo 2: entra em empresa existente
  const empresa = await getEmpresaByCodigo(cleanCodigo);
  if (!empresa) throw new Error('Código de empresa inválido.');

  await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
    role: ROLES.USER,
    status: USER_STATUS.PENDING,  // aguarda aprovação do admin
    empresaId: empresa.id,
  });
  criarNotificacaoParaAdminsEmpresa(empresa.id, 'Novo usuário aguardando aprovação');
}
```

---

#### `SupportRegisterScreen.js` — Cadastro por convite

**O que faz:** Técnicos de suporte se cadastram consumindo um convite criado pelo Super Admin. O link de acesso é o duplo toque no logo da tela de login.

**Código-chave — consumir convite:**
```javascript
const convite = await getDoc(doc(db, 'convites_suporte', email));
if (!convite.exists() || convite.data().usado) {
  await user.delete();            // rollback se convite inválido
  throw new Error('Convite inválido ou já utilizado.');
}

await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
  role: ROLES.SUPPORT,
  status: USER_STATUS.ACTIVE,     // suporte ativo imediatamente
});
await updateDoc(doc(db, 'convites_suporte', email), { usado: true });
```

---

### 3.2 Dashboard (`screens/home/`)

#### `HomeScreen.js` — Painel principal

**O que faz:** Exibe estatísticas do usuário em tempo real (total de scans, contagens auditadas, gráfico dos últimos 7 dias). Admins veem total de usuários e alerta de pendentes.

**Código-chave — dados em tempo real via Firestore:**
```javascript
// hooks/useDashboard.js
useEffect(() => {
  const q = query(
    collection(db, COLLECTIONS.INVENTORY),
    where('usuarioId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  const unsubscribe = onSnapshot(q, snapshot => {
    setTotalItems(snapshot.size);
    // monta dados do gráfico (últimos 7 dias)
    const chartData = buildChartData(snapshot.docs);
    setChartData(chartData);
  });
  return unsubscribe;   // cleanup quando componente desmonta
}, [uid]);
```

**Código-chave — alerta de pendentes (admin):**
```javascript
{isAdmin && pendingUsers > 0 && (
  <TouchableOpacity onPress={() => navigation.navigate(ROUTES.ADMIN_USERS)}>
    <Text>{pendingUsers} usuário(s) aguardando aprovação</Text>
  </TouchableOpacity>
)}
```

---

### 3.3 Scanner (`screens/inventory/`)

#### `ScannerScreen.js` — Contagem visual com IA

**O que faz:** Tela mais complexa do app (908 linhas). Captura foto, envia para detecção, exibe modal com resultado, permite editar labels, registra GPS e salva no Firestore.

**Código-chave — captura e detecção:**
```javascript
const handleDetect = async () => {
  setDetecting(true);
  try {
    const base64 = await imageUriToBase64(imageUri);   // URI → base64
    const yoloResult = await detectWithYolo(base64);   // POST /v1/detect
    const detections = yoloResult?.detections || [];
    const summary = summarizeDetections(detections);   // agrupa por label

    setDetectionResult({ summary, detections, base64 });
    setModalVisible(true);                             // abre modal resultado
  } finally {
    setDetecting(false);
  }
};
```

**Código-chave — edição de label (correção do modelo):**
```javascript
const confirmEditLabel = () => {
  if (!editText.trim()) return;
  setLabelOverrides(prev => ({
    ...prev,
    [editingLabel]: editText.trim(),   // armazena correção localmente
  }));
  setEditingLabel(null);
};

// Antes de salvar, aplica as correções
const applyOverrides = (detections) =>
  detections.map(det => ({
    ...det,
    label:         labelOverrides[det.label] ?? det.label,
    labelOriginal: labelOverrides[det.label] ? det.label : det.labelOriginal,
  }));
```

**Código-chave — confirmar e salvar:**
```javascript
const handleConfirmSave = async () => {
  setSaving(true);
  try {
    const fotoUrl = await uploadPhoto(base64, uid);    // Storage Firebase

    const correcoes = detections
      .filter(d => labelOverrides[d.label])
      .map(d => ({
        labelOriginal: d.label,
        labelCorrigido: labelOverrides[d.label],
        bbox: d.bbox,
        confianca: d.confidence,
      }));

    await createInventoryItem({
      ...buildPayload(summary, detections),
      fotoUrl,
      correcoes,
      temCorrecoes: correcoes.length > 0,   // flag para curadoria dataset
      local: localText,
      latitude:  location?.latitude  ?? null,
      longitude: location?.longitude ?? null,
    });

    navigation.navigate(ROUTES.HISTORY);
  } finally {
    setSaving(false);
  }
};
```

---

#### `HistoryScreen.js` — Histórico de contagens

**O que faz:** Lista paginada (30 itens) do histórico de scans. Filtros por período e busca textual. Admins podem contestar contagens. Botão de exportação CSV.

**Código-chave — paginação com Firestore cursor:**
```javascript
// services/historyService.js
export function buildInventoryHistoryQuery({ role, uid, empresaId, cursor }) {
  const constraints = [orderBy('createdAt', 'desc')];
  if (role !== ROLES.SUPER_ADMIN) {
    constraints.unshift(where('empresaId', '==', empresaId));
  }
  return cursor
    ? query(collection(db, COLLECTIONS.INVENTORY), ...constraints, startAfter(cursor), limit(PAGE_SIZE))
    : query(collection(db, COLLECTIONS.INVENTORY), ...constraints, limit(PAGE_SIZE));
}

// Na tela: botão "Carregar mais"
const handleLoadMore = async () => {
  if (!hasMore || loadingMore) return;
  const { items, lastDoc, hasMore: more } = await fetchNextInventoryPage({
    cursor: lastDocument, role, uid, empresaId,
  });
  setItems(prev => [...prev, ...items]);  // acumula na lista
  setLastDocument(lastDoc);
  setHasMore(more);
};
```

**Código-chave — contestar contagem (admin):**
```javascript
const handleContest = (item) => {
  Alert.prompt('Contestar contagem', 'Informe o motivo:', async (reason) => {
    if (!reason?.trim()) return;
    await contestScan(item.id, reason.trim(), item.usuarioId);
    // atualizará via onSnapshot automaticamente
  });
};

// services/inventoryService.js
export const contestScan = async (docId, contestReason, ownerUid) => {
  const uid = auth?.currentUser?.uid;
  if (uid === ownerUid) throw new Error('Você não pode contestar sua própria contagem.');
  await updateDoc(doc(db, COLLECTIONS.INVENTORY, docId), {
    status:       'contested',
    contestReason,
    contestedBy:  uid,
    contestedAt:  serverTimestamp(),
  });
};
```

---

### 3.4 Administração (`screens/admin/`)

#### `AdminUsersScreen.js` — Gerenciar usuários

**O que faz:** Admin visualiza e gerencia usuários da empresa em 3 abas (Pendentes, Ativos, Recusados). Pode aprovar, recusar, promover a admin, rebaixar ou revogar acesso.

**Código-chave — aprovar usuário:**
```javascript
const handleApprove = async (user) => {
  await approveUser(user.uid, empresaId);
  // adminService.js
};

// services/adminService.js
export const approveUser = async (uid, empresaId) => {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    status: USER_STATUS.ACTIVE,
    updatedAt: serverTimestamp(),
  });
  criarNotificacao(uid, NOTIF_TIPOS.APROVADO, 'Acesso aprovado!', 'Seu acesso foi aprovado.');
};
```

---

### 3.5 Super Admin (`screens/super_admin/`)

#### `SuperAdminScreen.js` — Painel global

**O que faz:** Três abas — Empresas (lista todas as empresas cadastradas), Chamados (todos os tickets da plataforma), Equipe Suporte (gerencia convites para técnicos).

**Código-chave — criar convite de suporte:**
```javascript
const handleCreateInvite = async () => {
  if (!inviteEmail.trim() || !inviteName.trim()) return;

  // Cria documento em /convites_suporte/{email}
  await setDoc(doc(db, 'convites_suporte', inviteEmail.toLowerCase()), {
    email:     inviteEmail.toLowerCase(),
    nome:      inviteName.trim(),
    createdBy: auth.currentUser.uid,
    usado:     false,
    createdAt: serverTimestamp(),
  });
  Alert.alert('Convite criado', `${inviteEmail} pode se cadastrar agora.`);
};
```

---

#### `ValidacaoDatasetScreen.js` — Curadoria do dataset

**O que faz:** Super Admin revisa scans onde usuários corrigiram labels (`temCorrecoes: true`). Pode validar (vai para treino), editar labels ou rejeitar. Mostra progresso de X/100 validados.

**Código-chave — validar scan para treino:**
```javascript
const handleValidar = async (scan) => {
  await updateDoc(doc(db, COLLECTIONS.INVENTORY, scan.id), {
    statusDataset:   'validado',
    labelsValidados: scan.detections.map(d => ({
      label:    labelEdits[d.label] ?? d.label,   // aplica edições do admin
      bbox:     d.bbox,
      confianca: d.confidence,
    })),
    editadoPorAdmin: Object.keys(labelEdits).length > 0,
    validadoPor:     auth.currentUser.uid,
    validadoEm:      serverTimestamp(),
  });
};
```

---

### 3.6 Suporte (`screens/support/`)

#### `SupportScreen.js` — Abertura de chamados

**O que faz:** Usuário abre chamado com tipo (problema, sugestão, configuração, outro) e recebe SLA automático por tipo. Lista chamados da empresa em tempo real.

**Código-chave — criar chamado com número sequencial:**
```javascript
// services/supportService.js
export const createTicket = async ({ titulo, descricao, tipo }) => {
  const numero = await getNextTicketNumber();    // CONTIA-DDMMYY01
  const sla    = TICKET_SLA[tipo] ?? TICKET_SLA.outro;

  const ref = await addDoc(collection(db, 'chamados'), {
    numero, titulo, descricao, tipo,
    status:    'aberto',
    prioridade: sla.prioridade,
    slaRespostaSuporteAt: addHours(sla.respostaSuporteH),  // deadline SLA
    slaResolucaoAt:       addHours(sla.resolucaoH),
    createdAt: serverTimestamp(),
  });

  // Notifica Support e Super Admin
  criarNotificacaoParaRole('support',     NOTIF_TIPOS.CHAMADO_ABERTO, `Novo chamado ${numero}`, ...);
  criarNotificacaoParaRole('super_admin', NOTIF_TIPOS.CHAMADO_ABERTO, `Novo chamado ${numero}`, ...);
  return { id: ref.id, numero };
};
```

---

#### `SupportTicketsScreen.js` — Responder chamados (perfil Support)

**O que faz:** Técnico de suporte vê todos os chamados da plataforma. Pode atualizar status e responder. Semáforo visual de SLA (verde/amarelo/vermelho/vencido).

**Código-chave — calcular cor do SLA:**
```javascript
// constants/supportConstants.js — getSlaInfo()
export function getSlaInfo(deadline) {
  const msLeft = deadline.toDate() - Date.now();
  const hLeft  = msLeft / 3_600_000;

  if (msLeft <= 0)  return { status: 'vencido',  color: '#ef4444', label: 'Vencido' };
  if (hLeft < 1)    return { status: 'critico',  color: '#f97316', label: `${Math.ceil(hLeft * 60)}min` };
  if (hLeft < 4)    return { status: 'atencao',  color: '#f59e0b', label: `${Math.floor(hLeft)}h` };
  return             { status: 'ok',     color: '#22c55e', label: `${Math.floor(hLeft)}h restantes` };
}
```

---

### 3.7 Perfil (`screens/profile/`)

#### `ProfileScreen.js` — Perfil do usuário

**O que faz:** Editar nome, foto de perfil, notificações push. Exclui conta com confirmação dupla (LGPD art. 18, II) via Modal cross-platform (iOS + Android).

**Código-chave — upload de foto (fix iOS):**
```javascript
// services/storageService.js
export const uploadImage = async ({ uri, path }) => {
  // XMLHttpRequest em vez de fetch().blob() — funciona em URIs file:// no iOS
  const blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload  = () => resolve(xhr.response);
    xhr.onerror = () => reject(new TypeError('Falha ao carregar imagem'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return await getDownloadURL(storageRef);
};
```

**Código-chave — exclusão de conta (LGPD):**
```javascript
// Etapa 1: Alert com explicação
// Etapa 2: Modal cross-platform com TextInput (Alert.prompt não existe no Android)
const handleConfirmDelete = async () => {
  if (deleteConfirmText.trim().toUpperCase() !== 'EXCLUIR') {
    Alert.alert('Cancelado', 'Texto incorreto. Conta mantida.');
    return;
  }
  setSaving(true);
  const result = await requestAccountDeletion();   // DELETE /v1/user/account
  setSaving(false);
};

// backend/services/deletion_service.py — ações:
// 1. Cria chamado informativo (LGPD art. 18)
// 2. Deleta: Auth, /usuarios, /notificacoes, /inference_metrics, foto perfil
// 3. Anonimiza: /inventario (CTN 5 anos), /login_audit
// 4. Registra: /deletion_log (sem dados pessoais)
```

---

### 3.8 Notificações (`screens/notifications/`)

#### `NotificacoesScreen.js` — Central de notificações

**O que faz:** Lista notificações em tempo real via Firestore `onSnapshot`. Cada notificação tem ícone por tipo, timestamp e estado lida/não lida.

**Código-chave — assinatura em tempo real:**
```javascript
// services/notificationService.js
export function subscribeNotificacoes(uid, onData) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('paraUid', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, snap =>
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}
```

---

## 4. Serviços — Frontend

### `apiClient.js` — HTTP com retry e renovação de token

Único ponto de saída para todas as chamadas ao backend.

```javascript
// Retry com backoff exponencial: 500ms → 1s → 2s
async function requestWithRetry(path, options, timeout) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await executeRequest(path, options, timeout, false);
    } catch (error) {
      const isRetryable = isRetryableError(error, error?.status);
      if (attempt === 3 || !isRetryable) throw error;
      await delay(500 * 2 ** (attempt - 1));   // backoff exponencial
    }
  }
}
```

### `offlineScanQueueService.js` — Queue offline (injeção de dependência)

Salva scans quando sem conexão e sincroniza ao reconectar. Usa injeção de dependência para evitar importação circular com `scannerService`.

```javascript
// App.tsx — injeta processScan via parâmetro (quebra ciclo A → B → A)
startConnectivityListener(processScan);

// offlineScanQueueService.js — recebe como parâmetro
export function startConnectivityListener(processFunction) {
  return NetInfo.addEventListener(async state => {
    if (state.isConnected && state.isInternetReachable) {
      await syncPendingScans(processFunction);   // usa a função injetada
    }
  });
}
```

### `loginAttemptService.js` — Proteção contra força bruta

```javascript
export async function recordFailedAttempt(email) {
  const data  = await getAttemptData(email);
  const count = (data.count || 0) + 1;
  const blockedUntil = count >= MAX_LOGIN_ATTEMPTS   // 5 tentativas
    ? Date.now() + 15 * 60 * 1000                   // bloqueia 15 minutos
    : null;
  await saveAttemptData(email, { count, blockedUntil });
  return { count, blocked: count >= MAX_LOGIN_ATTEMPTS };
}
```

### `deletionService.js` — Exclusão LGPD

```javascript
// Chama DELETE /v1/user/account e faz logout local
export async function requestAccountDeletion() {
  try {
    const result = await apiClient.delete('/v1/user/account');
    return { success: true, ...result };
  } finally {
    await logout();   // token não é mais válido após exclusão
  }
}
```

---

## 5. Hooks

### `useDashboard.js` — Dados do dashboard em tempo real

```javascript
export function useDashboard() {
  const [stats, setStats] = useState({ total: 0, auditadas: 0 });

  useEffect(() => {
    // Listener Firestore — atualiza automaticamente
    const unsubscribe = onSnapshot(buildQuery(), snapshot => {
      const docs = snapshot.docs.map(d => d.data());
      setStats({
        total:    docs.length,
        auditadas: docs.filter(d => d.status === 'contested').length,
        chartData: buildChartData(docs),   // últimos 7 dias
      });
    });
    return unsubscribe;
  }, [uid]);

  return stats;
}
```

### `useScannerScreen.js` — Inicialização do Scanner

Extrai lógica de carregamento de perfil e GPS do ScannerScreen, mantendo a tela focada em renderização.

```javascript
export function useScannerScreen() {
  const [empresaId,   setEmpresaId]   = useState(null);
  const [usuarioRole, setUsuarioRole] = useState(ROLES.USER);

  useEffect(() => {
    fetchLocation();
    getUserProfile(auth.currentUser.uid).then(profile => {
      setEmpresaId(profile?.empresaId || null);
      setUsuarioRole(profile?.role    || ROLES.USER);
    });
  }, []);

  return { empresaId, usuarioRole, location, fetchLocation };
}
```

---

## 6. Constantes e Utilitários

### `constants/roles.js`

```javascript
export const ROLES = {
  USER:        'user',
  ADMIN:       'admin',
  SUPER_ADMIN: 'super_admin',
  SUPPORT:     'support',
};
```

### `constants/supportConstants.js` — SLA por tipo de chamado

```javascript
export const TICKET_SLA = {
  problema:     { prioridade: 'Alta',  respostaSuporteH: 2,  resolucaoH: 12  },
  configuracao: { prioridade: 'Média', respostaSuporteH: 4,  resolucaoH: 48  },
  sugestao:     { prioridade: 'Baixa', respostaSuporteH: 24, resolucaoH: 720 },
  outro:        { prioridade: 'Média', respostaSuporteH: 8,  resolucaoH: 72  },
};
```

### `utils/labelTranslation.js` — Tradução YOLO → Português

```javascript
const COCO_PT = {
  bottle:  'Garrafa',
  person:  'Pessoa',
  cup:     'Copo',
  // ... 80 classes COCO
};

export const translateLabel = label => COCO_PT[label] || label;
```

### `utils/logger.js` — Log estruturado

```javascript
// Desenvolvimento: console. Produção: Sentry com contexto de dispositivo
const logger = {
  error(message, error, extras = {}) {
    if (__DEV__) { console.error('[ERROR]', message, error); return; }
    Sentry.withScope(scope => {
      scope.setExtra('message', message);
      Sentry.captureException(error);
    });
  },
};
```

---

## 7. Backend — API FastAPI

### `app/main.py` — Ponto de entrada

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pré-carrega YOLO na inicialização — evita timeout na 1ª requisição
    get_model()
    yield

app = FastAPI(title="Cont.IA YOLO API", lifespan=lifespan)
app.add_middleware(SlowAPIMiddleware)   # rate limiting
```

### `api/routes/detect.py` — Endpoint principal

```python
@router.post("/v1/detect")
@limiter.limit(settings.RATE_LIMIT)        # 30 req/min por IP
async def detect(request: Request, payload: DetectRequest,
                 user: dict = Depends(get_current_user)):

    active_requests.inc()                  # Prometheus gauge
    try:
        # YOLO e RF-DETR em paralelo
        yolo_future   = asyncio.wait_for(
            loop.run_in_executor(_executor, detect_from_base64, payload.image_base64),
            timeout=settings.YOLO_TIMEOUT_S,
        )
        rfdetr_future = detect_with_roboflow(payload.image_base64)

        yolo_result, rfdetr_result = await asyncio.gather(
            yolo_future, rfdetr_future,
            return_exceptions=True,        # falha de um não derruba o outro
        )

        merged = merge_detections(yolo=yolo_detections, rfdetr=rfdetr_detections)
        return { "detections": merged, "meta": {...} }
    finally:
        active_requests.dec()
```

### `services/yolo_service.py` — Singleton thread-safe

```python
_model: YOLO | None = None
_model_lock = threading.Lock()

def get_model() -> YOLO:
    global _model
    if _model is None:
        with _model_lock:                  # double-checked locking
            if _model is None:
                _model = YOLO(settings.YOLO_MODEL)
    return _model

def detect_from_base64(image_base64: str) -> dict:
    image = Image.open(io.BytesIO(base64.b64decode(image_base64))).convert("RGB")

    # Realce automático em imagens escuras (depósitos, galpões)
    if float(np.array(image).mean()) < 100:
        image = ImageEnhance.Brightness(image).enhance(1.5)
        image = ImageEnhance.Contrast(image).enhance(1.3)

    results = get_model().predict(source=image, conf=settings.YOLO_CONF, verbose=False)
    # ... extrai detecções
```

### `services/ensemble.py` — Merge NMS por label

```python
def merge_detections(yolo: list[dict], rfdetr: list[dict],
                     iou_threshold: float = 0.5) -> list[dict]:
    """
    Combina detecções YOLO + RF-DETR eliminando duplicatas do MESMO label.
    Objetos de labels diferentes são preservados mesmo com bbox sobreposto.
    Ex: 'parafuso' e 'porca' no mesmo espaço → ambos mantidos.
    """
    all_dets  = [{**d, "source": "yolo"}   for d in yolo] + \
                [{**d, "source": "rfdetr"} for d in rfdetr]
    all_dets.sort(key=lambda d: d["confidence"], reverse=True)

    kept = []
    for det in all_dets:
        duplicate = any(
            d["label"] == det["label"] and _iou(d["bbox"], det["bbox"]) > iou_threshold
            for d in kept
        )
        if not duplicate:
            kept.append(det)
    return kept
```

### `core/circuit_breaker.py` — Proteção contra cascata

```python
class CircuitBreaker:
    """
    CLOSED  → requisições passam normalmente
    OPEN    → após 3 falhas: bloqueia por 60s (retorna [] imediato)
    HALF_OPEN → após 60s: testa 1 requisição. Sucesso → CLOSED. Falha → OPEN
    """
    def record_failure(self) -> None:
        self._failure_count += 1
        if self._failure_count >= self.failure_threshold:
            self._state = CircuitState.OPEN
            self._opened_at = time.monotonic()
```

### `services/deletion_service.py` — Exclusão LGPD

```python
async def delete_user_account(uid: str) -> DeletionResult:
    # Etapa 1: Cria chamado ANTES de deletar (dados do usuário ainda existem)
    ticket_numero = _create_deletion_ticket(db, uid, user_data)

    # Etapa 2: Deleta dados pessoais
    _delete_collection_where(db, "notificacoes", "paraUid", "==", uid, ...)
    _delete_collection_where(db, "inference_metrics", "usuarioId", "==", uid, ...)
    _delete_profile_photo(uid, ...)

    # Etapa 3: Anonimiza dados fiscais (CTN art. 173 — 5 anos)
    _anonymize_inventory(db, uid, ...)    # usuarioNome → "Usuário removido"
    _anonymize_login_audit(db, uid, ...)  # email → "removido@lgpd"

    # Etapa 4: Deleta conta Firebase Auth
    firebase_auth.delete_user(uid)

    # Etapa 5: Registra conformidade (sem dados pessoais)
    _write_deletion_log(db, uid, empresa_id, result)
```

---

## 8. Scripts Operacionais

### `scripts/export_dataset.py` — Exportar dataset para treino

**Uso:** `python scripts/export_dataset.py`

Coleta scans com `statusDataset: "validado"` do Firestore, converte bboxes para formato YOLO normalizado e gera `data.yaml` para treino no Google Colab.

```
Dataset_correcoes/
├── images/train/  (80%)  imagens .jpg
├── images/val/    (20%)  imagens .jpg
├── labels/train/         .txt com bbox normalizados (cx, cy, w, h)
├── labels/val/
└── data.yaml             nc, names, train/val paths
```

### `scripts/cleanup_storage.py` — Política de retenção LGPD

**Uso:** `python scripts/cleanup_storage.py` (dry-run por padrão)

| Tipo de dado | Retenção | Base legal |
|---|---|---|
| Fotos de scan confirmado | 5 anos | CTN art. 173 (dado fiscal) |
| Fotos de scan rejeitado | 90 dias | Sem valor de auditoria |
| Fotos de perfil (usuário desativado) | 90 dias | LGPD — dado desnecessário |

```python
# Execução real (exige confirmação em produção)
python scripts/cleanup_storage.py --execute --env production
# → "Digite 'CONFIRMO' para continuar:"
```

---

## 9. Modelos de Dados Firestore

### Coleção `usuarios`
```javascript
{
  uid:        string,         // Firebase Auth UID
  nome:       string,
  email:      string,
  matricula:  string,         // único por empresa
  role:       'user' | 'admin' | 'super_admin' | 'support',
  status:     'active' | 'pending' | 'rejected',
  empresaId:  string,
  photoURL:   string,
  createdAt:  Timestamp,
  updatedAt:  Timestamp,
}
```

### Coleção `inventario` (registros de contagem)
```javascript
{
  scanId:       string,       // scan_uid_timestamp
  usuarioId:    string,
  usuarioNome:  string,
  empresaId:    string,
  item:         string,       // label principal (ex: "bottle")
  quantidade:   number,
  totalGeral:   number,
  itens:        [{ label, quantidade, confiancaMedia }],
  detections:   [{ label, confidence, bbox: [x1,y1,x2,y2], source }],
  correcoes:    [{ labelOriginal, labelCorrigido, bbox, confianca }],
  temCorrecoes: boolean,      // flag para curadoria dataset
  statusDataset: 'pendente' | 'validado' | 'rejeitado',
  fotoUrl:      string,
  local:        string,
  latitude:     number | null,
  longitude:    number | null,
  status:       'normal' | 'contested',
  createdAt:    Timestamp,
}
```

### Coleção `chamados` (tickets de suporte)
```javascript
{
  numero:              string,   // CONTIA-DDMMYY01
  titulo:              string,
  tipo:                'problema' | 'sugestao' | 'configuracao' | 'outro',
  status:              'aberto' | 'em_andamento' | 'aguardando_cliente' | 'resolvido',
  prioridade:          'Alta' | 'Média' | 'Baixa',
  empresaId:           string,
  adminId:             string,
  resposta:            string,
  respondidoPor:       string,
  slaRespostaSuporteAt: Timestamp,
  slaResolucaoAt:      Timestamp,
  primeiraRespostaAt:  Timestamp | null,
  resolvidoAt:         Timestamp | null,
  reaberturas:         number,
  createdAt:           Timestamp,
}
```

---

## 10. Fluxos Principais

### Fluxo de Contagem Visual

```
1. Usuário abre ScannerScreen
2. Toca "Câmera" ou "Galeria" → captura imagem
3. GPS capturado automaticamente via Geolocation
4. Toca "Analisar" → handleDetect()
   └── imageUriToBase64() → base64
   └── apiClient.post('/v1/detect', { image_base64 })
       └── Backend: YOLO11 ‖ RF-DETR (paralelo, 55s timeout)
       └── Ensemble NMS → retorna detecções
5. Modal abre com resultado
   └── Crop de cada objeto detectado
   └── Label + % de confiança
   └── Usuário pode tocar no label e corrigir
6. Toca "Confirmar e Salvar" → handleConfirmSave()
   └── uploadPhoto() → Firebase Storage
   └── createInventoryItem() → Firestore /inventario
   └── Redireciona para HistoryScreen
```

### Fluxo de Aprovação de Usuário

```
1. Novo usuário cadastra com código de empresa
   └── status: 'pending' no Firestore
2. Notificação enviada para Admins da empresa
3. Admin vê badge "N pendentes" na HomeScreen
4. Abre AdminUsersScreen → aba "Pendentes"
5. Toca "Aprovar" → approveUser()
   └── status: 'active' no Firestore
   └── Notificação enviada ao usuário aprovado
6. Usuário pode agora fazer scans
```

### Fluxo LGPD — Exclusão de Conta

```
1. ProfileScreen → "Excluir minha conta e dados"
2. Alert (etapa 1): explica o que será removido
3. Modal cross-platform (etapa 2): usuário digita "EXCLUIR"
4. apiClient.delete('/v1/user/account')
   Backend:
   ├── Cria chamado informativo (status: resolvido)
   ├── Deleta: Auth, /usuarios, /notificacoes, /inference_metrics, foto perfil
   ├── Anonimiza: /inventario (usuarioNome → "Usuário removido")
   ├── Anonimiza: /login_audit (email → "removido@lgpd")
   └── Registra: /deletion_log (sem dados pessoais — conformidade)
5. App faz logout automático
```

---

## 11. Segurança e Permissões

### Matrix de Permissões

| Funcionalidade | Usuário | Admin | Super Admin | Support |
|---|---|---|---|---|
| Fazer scan | ✅ | ✅ | ✅ | ❌ |
| Ver histórico próprio | ✅ | ✅ | ✅ | ❌ |
| Ver histórico da empresa | ❌ | ✅ | ✅ | ❌ |
| Contestar contagens | ❌ | ✅ | ✅ | ❌ |
| Aprovar usuários | ❌ | ✅ | ✅ | ❌ |
| Abrir chamados | ✅ | ✅ | ✅ | ❌ |
| Responder chamados | ❌ | ❌ | ❌ | ✅ |
| Ver todas as empresas | ❌ | ❌ | ✅ | ❌ |
| Curadoria dataset | ❌ | ❌ | ✅ | ❌ |
| Criar convites suporte | ❌ | ❌ | ✅ | ❌ |

### Proteções implementadas

| Camada | Mecanismo | Onde |
|---|---|---|
| **Autenticação** | Firebase JWT em todas as requisições | `api/deps.py` — `get_current_user()` |
| **Autorização** | Firestore Rules por role e empresaId | `firestore.rules` |
| **Armazenamento** | Storage Rules por uid | `storage.rules` |
| **Rate limiting** | 30 req/min (detect), 3/hora (delete account) | `core/limiter.py` |
| **Força bruta** | Bloqueio 15 min após 5 tentativas | `loginAttemptService.js` |
| **Secrets** | detect-secrets no pre-commit | `.pre-commit-config.yaml` |
| **Deps** | pip-audit + npm audit no CI | `.github/workflows/ci.yml` |
| **CORS** | Origens explícitas em produção | `core/config.py` |

---

## 12. Diagramas UML

Os 14 diagramas PlantUML estão em `docs/diagramas/`:

| Arquivo | Conteúdo |
|---|---|
| `01_casos_de_uso.puml` | Atores e casos de uso dos 4 perfis |
| `02_atividades.puml` | Fluxo de contagem + curadoria dataset |
| `03_classes.puml` | Classes do sistema com InferenceMetrics |
| `04_sequencia.puml` | Mobile → Backend → Firebase |
| `05_implantacao.puml` | Nós: iOS, FastAPI, Firebase, Email, FCM, Prometheus |
| `06_maquina_estados.puml` | Estados de usuário e scan |
| `07_arquitetura.puml` | Componentes com Circuit Breaker e Prometheus |
| `08_pipeline.puml` | Pipeline de detecção ensemble (IoU merge por label) |
| `09_perfis.puml` | Permissões detalhadas por role |
| `10_estados_chamado.puml` | Máquina de estados dos tickets com SLA |
| `11_cadastro_support.puml` | Fluxo de convite para técnico de suporte |
| `12_cadastro_usuario_admin.puml` | Cadastro empresa nova vs código existente |
| `13_comunicacao_firebase.puml` | Coleções Firestore + regras de segurança |
| `14_pipeline_dataset_treino.puml` | Da correção de label ao modelo treinado |

---

*Documentação gerada em 11/05/2026 · Cont.IA v1.0.0 · Faculdade Senac Amazonas*
*Juliana Pereira Bertoldo · Wellington Silva Paiva*
