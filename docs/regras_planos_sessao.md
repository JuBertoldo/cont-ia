# Cont.IA — Regras de Planos e Sessão Única por Assento

> Documento de especificação para implementação futura.  
> Modelo: **SaaS por assentos (seats)** — 1 assento = 1 sessão ativa simultânea.

---

## 1. MODELO DE NEGÓCIO

### Conceito de "Assento"

Um **assento** representa o direito de 1 pessoa usar o app simultaneamente.  
Se um usuário logar em outro dispositivo, a sessão anterior é **encerrada automaticamente** — sem compartilhamento possível.

```
João entra no celular A  → sessão ativa
João entra no celular B  → sessão do celular A é encerrada
                         → João só consegue usar 1 por vez
```

Isso é idêntico ao modelo do Netflix — o cliente entende intuitivamente.

---

## 2. ESTRUTURA DOS PLANOS

| Plano | Assentos totais | Admins mínimos | Users máximos | Preço/mês |
|-------|:--------------:|:--------------:|:-------------:|:---------:|
| **Starter** | 5 | 1 | 4 | R$ 197 |
| **Pro** | 15 | 2 | 13 | R$ 297 |
| **Business** | 56 | 5 | 51 | R$ 497 |
| **Enterprise** | 320 | 20 | 300 | R$ 997 |

### Regras universais de composição

```
✅ Todo plano deve ter no mínimo 1 admin E 1 user
✅ Admins contam como assentos
✅ O admin pode ser o único usuário do plano (Starter: 1 admin usando 1 dos 5 assentos)
✅ Não é possível cadastrar mais usuários do que o limite de assentos do plano
✅ Não é possível ter 0 admins (o último admin não pode ser removido ou rebaixado)
✅ Não é possível ter 0 users (o último user comum não pode ser removido se não houver outro)
```

### Exemplo de composição válida — Starter (5 assentos)

```
✅ 1 admin + 4 users        (máximo de users)
✅ 1 admin + 3 users        (com 1 assento livre para crescer)
✅ 2 admins + 3 users       (admin extra para operação maior)
✅ 5 admins + 0 users       (só admins — válido, mas incomum)
✅ 1 admin + 0 users        (mínimo absoluto)
❌ 0 admins + 5 users       (proibido — sem admin)
❌ 6 usuários de qualquer tipo (ultrapassa o limite)
```

---

## 3. GATILHO DE UPGRADE

O upgrade deve ser sugerido automaticamente em dois momentos:

### 3.1 Ao atingir o limite de assentos

```
Admin tenta cadastrar novo usuário → sistema verifica:
  totalUsuariosAtivos >= limiteDoPlano
    → bloquear cadastro
    → exibir: "Limite de X assentos atingido.
               Faça upgrade para o plano [próximo] e adicione mais membros."
    → botão "Ver planos" → tela de upgrade
```

### 3.2 Ao remover o último admin ou o último user

```
Admin tenta remover o último admin restante:
  → bloquear ação
  → exibir: "É necessário ter ao menos 1 administrador ativo."

Admin tenta remover o último usuário comum:
  → alertar: "Esta empresa ficará apenas com administradores.
               Tem certeza que deseja continuar?"
  → permitir (é válido) com confirmação explícita
```

---

## 4. REGRA DE SESSÃO ÚNICA (1 assento = 1 sessão)

### 4.1 Como funciona

```
[Login do usuário]
    ↓
Gerar sessionId (UUID único) no cliente
    ↓
Salvar sessionId em:
  - AsyncStorage (local no dispositivo)
  - Firestore /usuarios/{uid}/sessionId
    ↓
[A cada ação no app]
    ↓
Verificar: AsyncStorage.sessionId == Firestore.sessionId?
  ├── SIM → sessão válida, continuar
  └── NÃO → outro dispositivo logou → forçar logout local
             → exibir: "Sua conta foi acessada em outro dispositivo.
                        Você foi desconectado automaticamente."
```

### 4.2 Campos a adicionar em /usuarios/{uid}

```js
{
  sessionId: "uuid-v4-gerado-no-login",   // string — muda a cada login
  sessionDevice: "iOS" | "Android",       // plataforma da sessão ativa
  lastLoginAt: Timestamp,                  // data/hora do último login
}
```

### 4.3 Fluxo detalhado

```
EVENTO: Usuário faz login

1. Firebase Auth.signIn() → sucesso
2. Gerar sessionId = uuid()
3. Salvar no Firestore: /usuarios/{uid} → { sessionId, sessionDevice, lastLoginAt }
4. Salvar no AsyncStorage: @contia_session_id = sessionId
5. Iniciar listener onSnapshot /usuarios/{uid}/sessionId
   └── Se sessionId mudar → logout automático


EVENTO: App abre (resume do background)

1. Ler sessionId do AsyncStorage
2. Ler sessionId do Firestore
3. Se diferentes → logout imediato
4. Se iguais → continuar normalmente


EVENTO: Usuário faz logout voluntário

1. Gerar novo sessionId (ou deletar o campo)
2. Salvar no Firestore → invalida qualquer outro dispositivo
3. Limpar AsyncStorage
4. Firebase Auth.signOut()
```

---

## 5. CAMPOS A ADICIONAR NA EMPRESA (Firestore)

```js
// /empresas/{empresaId}
{
  plano: "starter" | "pro" | "business" | "enterprise",
  limiteAssentos: 5 | 15 | 56 | 320,
  limiteAdmins: 1 | 2 | 5 | 20,
  assentosUsados: number,   // atualizado a cada cadastro/remoção
  dataAssinatura: Timestamp,
  dataRenovacao: Timestamp,
  statusAssinatura: "ativa" | "suspensa" | "cancelada",
}
```

---

## 6. MUDANÇAS DE CÓDIGO NECESSÁRIAS

### 6.1 Frontend

| Arquivo | Mudança |
|---------|---------|
| `authService.js` | `loginWithEmail()` → gerar e salvar sessionId |
| `authService.js` | `logout()` → limpar sessionId do Firestore |
| `App.js` | Iniciar listener de sessão após login |
| `useAuth.js` | Verificar sessionId no AppState change (foreground) |
| `authService.js` | `registerWithEmail()` → verificar limite de assentos antes de criar |
| `adminService.js` | Bloquear remoção do último admin |
| `empresaService.js` | Incrementar/decrementar `assentosUsados` |
| Nova tela | `PlansScreen.js` — comparativo de planos e upgrade |

### 6.2 Backend

| Arquivo | Mudança |
|---------|---------|
| `config.py` | Adicionar `STRIPE_SECRET_KEY` (ou gateway BR) |
| Nova rota | `POST /v1/subscription/upgrade` — processar upgrade de plano |
| Nova rota | `GET /v1/subscription/status` — retornar status do plano atual |

### 6.3 Firestore Rules

```js
// /empresas/{empresaId}
allow update: if isActive() && isAdmin() && isSameEmpresa(empresaId)
           || isActive() && isSuperAdmin();

// /usuarios/{uid} — sessionId só pode ser atualizado pelo próprio usuário
allow update: if isOwner(uid)
           || (isActive() && isAdmin() && isSameEmpresa(resource.data.empresaId))
           || isActive() && isSuperAdmin();
```

---

## 7. CASOS DE BORDA A TRATAR

| Situação | Comportamento esperado |
|----------|----------------------|
| Usuário offline → outro loga | Quando voltar online → detecta diferença de sessionId → logout |
| App em background → outro dispositivo loga | No próximo foreground → verifica sessionId → logout |
| Admin remove conta de usuário ativo | Sessão do usuário removido é invalidada (sessionId deletado) |
| Empresa faz downgrade de plano | Se assentosUsados > novo limite → bloquear até remover usuários excedentes |
| Empresa está inadimplente | `statusAssinatura = "suspensa"` → login bloqueado com mensagem |
| Primeiro admin cria a empresa | `assentosUsados = 1`, `limiteAssentos = 5` (Starter padrão) |

---

## 8. EXPERIÊNCIA DO USUÁRIO AO SER DESLOGADO

```
╔══════════════════════════════════════╗
║  🔔 Sessão encerrada                 ║
║                                      ║
║  Sua conta foi acessada em outro     ║
║  dispositivo. Por segurança, você    ║
║  foi desconectado automaticamente.   ║
║                                      ║
║  Caso não tenha sido você, altere    ║
║  sua senha imediatamente.            ║
║                                      ║
║         [Fazer login novamente]      ║
╚══════════════════════════════════════╝
```

---

## 9. UPGRADE SUGERIDO — TELA FUTURA (PlansScreen)

```
╔══════════════════════════════════════════════════════╗
║  Você atingiu o limite do seu plano                  ║
║                                                      ║
║  Starter (atual)      Pro (recomendado)              ║
║  ─────────────────    ──────────────────             ║
║  5 assentos           15 assentos                    ║
║  1 admin              2 admins                       ║
║  R$ 197/mês           R$ 297/mês                     ║
║                                                      ║
║  + 10 assentos por apenas R$ 100 a mais por mês      ║
║                                                      ║
║  [Manter plano atual]    [Fazer upgrade → Pro]       ║
╚══════════════════════════════════════════════════════╝
```

---

## 10. RESUMO DE PRIORIDADE DE IMPLEMENTAÇÃO

| Prioridade | Item | Complexidade |
|:---------:|------|:------------:|
| 1 | Salvar `sessionId` no login e verificar no listener | Baixa |
| 2 | Logout automático ao detectar sessionId diferente | Baixa |
| 3 | Verificar limite de assentos ao cadastrar usuário | Média |
| 4 | Bloquear remoção do último admin | Baixa |
| 5 | Campo `plano` e `limiteAssentos` na empresa | Média |
| 6 | Tela de upgrade de plano | Alta |
| 7 | Integração com gateway de pagamento (Asaas/Stripe) | Alta |
| 8 | Downgrade de plano com validação de excedente | Alta |

---

*Documento gerado em 16/04/2026 · Revisar antes de implementar conforme regras de negócio vigentes.*
