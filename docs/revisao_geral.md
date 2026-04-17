# Cont.IA — Revisão Geral do Projeto
### Estado atual · Funcionalidades implementadas · Diferenciais competitivos

---

## 1. RESUMO EXECUTIVO

O Cont.IA é um sistema SaaS mobile de **auditoria e contagem inteligente de inventário** que usa Inteligência Artificial (YOLO11 + Roboflow) para identificar, contar e registrar objetos fotografados em ambientes reais — com foto de auditoria, GPS, histórico e gestão de equipe.

**Plataformas:** iOS (React Native) · Backend Python/FastAPI · Firebase  
**Modelo de negócio:** SaaS por assinatura mensal (R$ 197–997/mês)  
**Público-alvo:** PMEs do Amazonas — mercearias, distribuidoras, atacados, franquias  
**Status:** MVP funcional testado em dispositivo físico (iPhone "Juliana")

---

## 2. O QUE ESTÁ FUNCIONANDO — TESTADO E CONFIRMADO

### 2.1 Detecção de Objetos com IA
| Funcionalidade | Status | Evidência |
|---------------|--------|-----------|
| Detecção YOLO11m (80 classes COCO) | ✅ Funcionando | Testado no Juliana — identificou keyboard, bottle, scissors, etc. |
| Ensemble YOLO + Roboflow em paralelo | ✅ Funcionando | asyncio.gather() com timeout e fallback |
| NMS por classe (sem suprimir objetos diferentes) | ✅ Corrigido | Bug corrigido — parafuso não elimina porca |
| Realce automático em imagens escuras | ✅ Funcionando | PIL brightness/contrast quando brilho < 100 |
| Recorte (BBox crop) por objeto no modal | ✅ Funcionando | Usuário vê exatamente o que a IA detectou |

### 2.2 Scanner e Fluxo de Contagem
| Funcionalidade | Status |
|---------------|--------|
| Captura via câmera e galeria | ✅ |
| GPS automático com reverse geocoding | ✅ |
| Modal de resultado com recortes por objeto | ✅ |
| Edição inline de labels (usuário corrige o YOLO) | ✅ |
| Upload da foto para Firebase Storage | ✅ |
| Correções salvas em `correcoes[]` para dataset futuro | ✅ |
| Confirmação e salvamento no Firestore | ✅ |

### 2.3 Histórico e Exportação
| Funcionalidade | Status |
|---------------|--------|
| Histórico em tempo real (onSnapshot) | ✅ |
| Filtros por data com ícones (Hoje, 7, 30, 60 dias) | ✅ |
| Busca por item, usuário ou local | ✅ |
| Botão "Ver foto" para auditoria visual | ✅ |
| Exportação CSV com colunas amigáveis | ✅ |
| Labels traduzidos para português (80 classes) | ✅ |

### 2.4 Gestão de Usuários e Empresas
| Funcionalidade | Status |
|---------------|--------|
| Cadastro com código de empresa | ✅ |
| Aprovação/rejeição de usuários pelo Admin | ✅ |
| Promoção/rebaixamento de Admin | ✅ |
| Primeiro usuário da empresa vira Admin automaticamente | ✅ |
| Usuário pendente pode escanear e ver próprio histórico | ✅ |

### 2.5 Sistema de Chamados (Support)
| Funcionalidade | Status |
|---------------|--------|
| Admin abre chamado (4 tipos com SLA automático) | ✅ |
| SLA calculado por tipo: Bug 2h/12h, Config 4h/48h... | ✅ |
| Fluxo bidirecional: aberto→em andamento→aguardando cliente→resolvido→aberto | ✅ |
| Semáforo visual de SLA (verde/amarelo/vermelho/vencido) | ✅ |
| E-mail automático ao admin quando status muda | ✅ |

### 2.6 Perfil Support (Suporte Técnico)
| Funcionalidade | Status |
|---------------|--------|
| Cadastro por convite (duplo toque no logo) | ✅ |
| Super Admin cria convite em /convites_suporte/{email} | ✅ |
| Firebase valida e bloqueia e-mails sem convite | ✅ |
| Support vê todos os chamados de todas as empresas | ✅ |
| Support responde, altera status, reabte chamados | ✅ |
| Drawer exclusivo para Support (sem scanner, sem histórico) | ✅ |

### 2.7 Notificações
| Funcionalidade | Status |
|---------------|--------|
| Sininho in-app com badge em tempo real | ✅ |
| Novo usuário pendente → notifica Admins da empresa | ✅ |
| Ticket aberto → notifica todos os Support + Super Admin | ✅ |
| Ticket atualizado/respondido → notifica Admin que abriu | ✅ |
| Tela de Notificações com lida/não lida | ✅ |
| "Ler todas" de uma vez | ✅ |
| Push notifications (código pronto, APNs key pendente) | ⏸️ Aguarda Apple Developer |

### 2.8 Dataset e Treino YOLO
| Funcionalidade | Status |
|---------------|--------|
| Correções salvas no Firestore com bbox + fotoUrl | ✅ |
| Tela de curadoria do Super Admin (validar/editar/rejeitar) | ✅ |
| Super Admin edita labels antes de validar | ✅ |
| Contador de progresso (X/100 validados) | ✅ |
| Script export_dataset.py (3 tiers: Gold/Silver/Bronze) | ✅ |
| Notebook Colab para treino YOLO11 com GPU | ✅ |

### 2.9 Infraestrutura
| Componente | Status |
|-----------|--------|
| Backend rodando via Docker (resolve _lzma do macOS) | ✅ |
| 48 testes automatizados passando (pytest) | ✅ |
| CI/CD via GitHub Actions | ✅ |
| Cloudflare Tunnel configurado (URL permanente gratuita) | ✅ |
| Splash screen iOS e Android com branding Cont.IA | ✅ |
| Makefile com comandos: metro, ios-device, tunnel-up/down | ✅ |

---

## 3. ARQUITETURA TÉCNICA

```
📱 App Mobile (React Native 0.84 — iOS/Android)
    │
    ├── Firebase Auth       → autenticação JWT
    ├── Cloud Firestore     → dados em tempo real (onSnapshot)
    ├── Cloud Storage       → fotos de auditoria
    │
    └── Backend (FastAPI + Docker)
            │
            ├── YOLO11m     → detecção local (CPU, sem custo por chamada)
            ├── Roboflow    → RF-DETR via API (ensemble)
            ├── NMS Ensemble→ merge das detecções por classe
            ├── E-mail      → SMTP (Gmail) via smtplib
            └── Push        → Firebase Admin SDK (FCM)
```

**Stack completa:**
- Frontend: React Native 0.84 · Firebase JS SDK · @react-native-firebase/messaging
- Backend: Python 3.11 · FastAPI · Ultralytics YOLO11 · Inference SDK (Roboflow)
- Banco: Cloud Firestore · Firebase Storage · Firebase Auth
- Infra: Docker · Cloudflare Tunnel · GitHub Actions · ngrok (dev)

---

## 4. NÚMEROS DO PROJETO

| Métrica | Número |
|---------|--------|
| Telas implementadas | 20 telas |
| Serviços JS | 17 serviços |
| Endpoints backend | 2 rotas (detect + notify) |
| Testes automatizados | 48 (100% passando) |
| Diagramas UML | 14 diagramas |
| Documentos técnicos | 4 documentos |
| Coleções Firestore | 7 (/usuarios, /empresas, /inventario, /chamados, /convites_suporte, /notificacoes, /config) |
| Commits no projeto | 27+ commits |
| Classes YOLO traduzidas | 80 (COCO completo PT-BR) |

---

## 5. DIFERENCIAIS COMPETITIVOS

### 5.1 O que o mercado tem

A maioria dos apps de contagem de inventário disponíveis no Brasil:
- Exige que o usuário **cadastre manualmente** cada produto (código de barras ou digitação)
- Não usa IA para identificação automática
- Não tem **auditoria visual** com foto do que foi contado
- Não tem correção e aprendizado do modelo
- Cobra por produto cadastrado, não por usuário

### 5.2 O que o Cont.IA faz diferente

| Diferencial | Cont.IA | Concorrência típica |
|-------------|---------|---------------------|
| **Identificação automática** | IA detecta sem cadastro prévio | Cadastro manual obrigatório |
| **Dois modelos em paralelo** | YOLO + Roboflow (ensemble) | Nenhum ou apenas 1 modelo |
| **Foto de auditoria** | Foto salva no Firebase para validação | Sem evidência visual |
| **Correção de label** | Usuário e Super Admin corrigem o YOLO | Não existe |
| **Auto-treinamento** | Correções viram dataset para modelo próprio | Não existe |
| **SLA de suporte** | Chamados com prazo automático por tipo | Suporte genérico |
| **Perfil Support isolado** | Cadastro por convite secreto, acesso só a chamados | Não existe |
| **Notificações em tempo real** | Sininho + push por evento específico | E-mail genérico ou nada |
| **GPS + Reverse Geocoding** | Localização real do inventário | Endereço manual |
| **Offline-friendly** | Firestore tem cache local | Dependente de internet |

### 5.3 Diferencial estratégico — o ciclo de melhoria contínua

```
Usuário fotografa no campo
        ↓
YOLO detecta automaticamente
        ↓
Usuário corrige label errado
        ↓
Super Admin valida a correção
        ↓
Dataset cresce com dados reais da empresa
        ↓
Treino do modelo próprio (Google Colab gratuito)
        ↓
Modelo especializado nos produtos da empresa
        ↓
Detecção mais precisa → menos correções necessárias
        ↓ (loop)
```

**Isso não existe em nenhum concorrente direto no mercado brasileiro.**

### 5.4 Diferencial de negócio

- **Custo operacional de R$203/mês** independente do número de clientes (até 50 usuários)
- **Break-even com 2 clientes Starter** — não precisa de investidor externo
- **Margem líquida de 77–80%** por cliente — padrão de SaaS maduro
- **Modelo de assentos** documentado para controle de crescimento e upgrade forçado

---

## 6. O QUE ESTÁ PRONTO MAS AGUARDA AÇÃO EXTERNA

| Item | Depende de | Custo |
|------|-----------|-------|
| Push notifications iOS | Comprar Apple Developer + gerar APNs key | $99/ano |
| Publicar na App Store | Apple Developer ativo | Incluído |
| Publicar no Google Play | Criar conta Google Play | $25 único |
| Backend em produção permanente | Contratar Hetzner ou Railway | $6–20/mês |
| Cloudflare Tunnel com URL fixa | Domínio .com | ~$10/ano |
| Android build testado | Testar em dispositivo Android físico | Gratuito |
| Firebase Storage Rules | Criar `storage.rules` | Gratuito |
| Licença YOLO comercial | Treinar modelo próprio (3–4 meses de coleta) | Gratuito |

---

## 7. O QUE ESTÁ DOCUMENTADO PARA IMPLEMENTAÇÃO FUTURA

| Documento | Conteúdo |
|-----------|---------|
| `regras_planos_sessao.md` | 1 usuário = 1 sessão, 4 planos com limites, lógica de upgrade |
| `relatorio_financeiro.md` | Break-even, margens por plano, projeção 12 meses |
| `estudo_crescimento_conservador.md` | MRR mês a mês com mix real de planos |
| `levantamento_custos.md` | Custo de cada ferramenta, ponto de cobrança, calculadora |

---

## 8. PARA A APRESENTAÇÃO NA BANCA

### O produto em 30 segundos

> "O Cont.IA elimina a contagem manual de inventário. O operador fotografa os itens,
> a IA identifica e conta automaticamente, e o sistema registra com foto, GPS e data
> para auditoria. Quando o modelo erra, o usuário corrige — e essa correção vira
> treinamento para o modelo ficar cada vez mais preciso para aquela empresa específica."

### Os 3 pontos que impressionam tecnicamente

1. **Dois modelos de IA em paralelo** (YOLO local + Roboflow na nuvem) com merge inteligente por NMS — arquitetura ensemble que poucos startups implementam
2. **Pipeline completo de MLOps** — da coleta de correções em campo até o treino no Google Colab e deploy do modelo próprio, tudo integrado no sistema
3. **Arquitetura de segurança por camadas** — Firebase Auth + JWT no backend + regras Firestore granulares por role (user/admin/support/super_admin)

### Os 3 pontos que impressionam no negócio

1. **Break-even com 2 clientes** — modelo financeiramente autossustentável sem investidor
2. **Margem de 77–80%** — padrão de SaaS global, raro em produtos brasileiros iniciais
3. **Modelo de assentos** — garante crescimento de receita proporcional ao crescimento do cliente

---

*Revisão gerada em 16/04/2026 · Projeto Cont.IA · Trabalho de Conclusão de Curso*
