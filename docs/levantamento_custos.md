# Cont.IA — Levantamento de Custos por Ferramenta

> Referência: Abril 2026 · Valores em USD (converter para BRL conforme câmbio atual)

---

## 1. Firebase (Google Cloud) — CRÍTICO

Plano atual: **Spark (gratuito)**  
Plano necessário para produção: **Blaze (pay-as-you-go)**  
> Blaze não tem mensalidade fixa — você paga apenas o que ultrapassar o free tier.  
> Migrar para Blaze é obrigatório para usar Storage em produção (Spark bloqueia upload).

---

### 1.1 Limites exatos do plano Spark (gratuito)

| Serviço Firebase | Limite gratuito | Custo após o limite |
|-----------------|-----------------|---------------------|
| **Firestore — leituras** | 50.000 / dia | $0,06 por 100K leituras |
| **Firestore — escritas** | 20.000 / dia | $0,18 por 100K escritas |
| **Firestore — exclusões** | 20.000 / dia | $0,02 por 100K exclusões |
| **Firestore — armazenamento** | 1 GB total | $0,18 / GB / mês |
| **Storage — armazenamento** | 5 GB total | $0,026 / GB / mês |
| **Storage — download** | 1 GB / dia | $0,12 / GB |
| **Storage — operações upload** | 20.000 / dia | $0,004 / 10K |
| **Authentication — MAU** | 10.000 usuários/mês | $0,0055 por usuário adicional |
| **Cloud Functions** | 2M chamadas / mês | $0,40 / 1M chamadas |

---

### 1.2 Quanto cada ação do app consome no Firestore

| Ação do usuário | Leituras | Escritas | Observação |
|-----------------|----------|----------|------------|
| Login / abrir app | 2 | 0 | Carrega perfil + empresa |
| Abrir histórico | 10–30 | 0 | Depende do volume de scans |
| Realizar 1 scan (salvar) | 2 | 2 | Lê empresaId + escreve inventário |
| Upload foto (Storage) | 0 | 1 operação Storage | ~500KB–2MB por foto |
| Admin abrir painel | 20–50 | 0 | Lista usuários + scans da empresa |
| Abrir chamado | 3 | 2 | Lê empresa + escreve chamado |
| Support ver todos os chamados | 30–100 | 0 | Depende do volume de tickets |

**Estimativa por usuário ativo por dia:**
- Usuário comum (2–3 scans): ~30–50 leituras · 5–10 escritas
- Admin (gestão diária): ~80–150 leituras · 10–20 escritas

---

### 1.3 Ponto exato em que cada serviço começa a custar

#### Firestore — Leituras (limite: 50.000/dia)

| Usuários ativos/dia | Leituras estimadas/dia | Situação |
|---------------------|------------------------|----------|
| **até 50** | ~1.500–2.500 | ✅ Gratuito (5% do limite) |
| **51–100** | ~2.500–5.000 | ✅ Gratuito (10% do limite) |
| **101–500** | ~5.000–25.000 | ✅ Gratuito (50% do limite) |
| **501–1.000** | ~25.000–50.000 | ⚠️ Na borda do limite |
| **acima de 1.000** | 50.000+ | 💰 Começa a cobrar (~$0,03–0,30/dia) |

#### Firestore — Escritas (limite: 20.000/dia)

| Usuários ativos/dia | Escritas estimadas/dia | Situação |
|---------------------|------------------------|----------|
| **até 50** | ~250–500 | ✅ Gratuito (2,5% do limite) |
| **até 500** | ~2.500–5.000 | ✅ Gratuito (25% do limite) |
| **até 2.000** | ~10.000–20.000 | ⚠️ Na borda do limite |
| **acima de 2.000** | 20.000+ | 💰 Começa a cobrar |

#### Firebase Storage — Armazenamento (limite: 5 GB)

| Scans acumulados | Tamanho médio foto | Total armazenado | Situação |
|------------------|--------------------|------------------|----------|
| até 5.000 scans | ~500 KB | ~2,5 GB | ✅ Gratuito |
| até 10.000 scans | ~500 KB | ~5 GB | ⚠️ No limite |
| acima de 10.000 | ~500 KB | 5 GB+ | 💰 ~$0,026/GB/mês |

> **Na prática:** com 50 usuários fazendo 5 scans/dia = 250 fotos/dia.  
> Em 20 dias já são 5.000 fotos (~2,5 GB). **O Storage começa a custar em ~40 dias de uso moderado.**

#### Firebase Authentication (limite: 10.000 MAU/mês)

| Usuários cadastrados | Situação | Custo adicional |
|----------------------|----------|-----------------|
| até 10.000 | ✅ Gratuito | $0 |
| 10.001–20.000 | 💰 Paga excedente | ~$55/mês |
| acima de 50.000 | 💰 | ~$220/mês |

> Auth dificilmente será um problema — 10K usuários é muito para o início.

---

### 1.4 Custo Firebase por número de usuários ativos (mensal estimado)

| Usuários ativos | Scans/mês | Firebase/mês | O que começa a cobrar |
|-----------------|-----------|--------------|----------------------|
| **até 50** | ~2.500 | **$0** | Nada — dentro do free |
| **51–100** | ~5.000 | **$0–2** | Storage acumula |
| **101–200** | ~10.000 | **$2–8** | Storage + leituras |
| **201–500** | ~25.000 | **$8–25** | Storage + leituras + escritas |
| **501–1.000** | ~50.000 | **$25–60** | Todos os serviços |
| **acima de 1.000** | 100.000+ | **$60–150+** | Escala linear |

> ✅ **Confirmado:** até ~50 usuários ativos o Firebase é $0.  
> 💰 **Custo real começa** entre 50–100 usuários, puxado primeiro pelo **Storage (fotos)**.

---

### 1.5 Estratégia para adiar o custo do Firebase

| Ação | Economia estimada | Impacto no produto |
|------|------------------|--------------------|
| Comprimir foto antes do upload (qualidade 0.5 → 0.3) | Storage -50% | Foto menos nítida na auditoria |
| Limitar histórico a 90 dias por empresa | Leituras -30% | Exportar CSV antes de arquivar |
| Lazy load no histórico (paginação já implementada) | Leituras -40% | Já implementado ✅ |
| Deletar fotos de scans sem correção após 180 dias | Storage -60% | Automatizar com Cloud Function |

---

## 2. Roboflow — CRÍTICO

Plano atual: **API Key ativa** (free tier ou trial)  
Uso: RF-DETR ensemble — cada scan dispara 1 chamada à Inference API

| Plano | Preço | Inference calls/mês | Suporte |
|-------|-------|---------------------|---------|
| **Starter (Free)** | $0 | ~1.000 | Comunidade |
| **Grow** | ~$249/mês | 100.000 | Email |
| **Pro** | ~$1.249/mês | 1.000.000 | Prioritário |
| **Enterprise** | Sob consulta | Ilimitado | Dedicado |

### Impacto no projeto
- 50 scans/dia = 1.500 chamadas/mês → **ultrapassa free tier**
- 200 scans/dia = 6.000 chamadas/mês → **necessita Grow ($249/mês)**
- **Alternativa de custo zero:** desabilitar Roboflow (`ROBOFLOW_API_KEY=`) e usar apenas YOLO local — sem custo de inferência

---

## 3. Infraestrutura do Backend — CRÍTICO

Atualmente o backend roda **local via Docker**. Para produção, opções:

| Opção | Custo/mês | Uptime | Melhor para |
|-------|-----------|--------|-------------|
| **Railway** (recomendado) | $5–20 | 99,9% | Startup / MVP |
| **Render** | $7–25 | 99,9% | Startup |
| **Fly.io** | $3–15 | 99,9% | Startup |
| **Google Cloud Run** | $0–30 | 99,95% | Escala automática |
| **AWS EC2 t3.small** | $15–20 | 99,9% | Controle total |
| **VPS (Hetzner/DigitalOcean)** | $6–12 | 99,9% | Custo-benefício |

> O backend carrega o modelo YOLO11m (39MB RAM) — recomenda mínimo 1GB RAM.  
> Railway ou Hetzner VPS são as opções mais custo-benefício para MVP.

---

## 4. Cloudflare Tunnel

Plano atual: **Free** (via Zero Trust)

| Plano | Custo | Limite |
|-------|-------|--------|
| **Free** | $0 | Até 50 usuários, tunnels ilimitados |
| **Zero Trust Teams** | $7/usuário/mês | SLA garantido |

> Para o projeto atual o plano **Free é suficiente indefinidamente**.  
> Requer apenas um domínio no Cloudflare (domínios .com a partir de ~$10/ano).

---

## 5. Domínio

Necessário para Cloudflare Tunnel com URL fixa.

| Registrar | Custo/ano |
|-----------|-----------|
| Cloudflare Registrar (.com) | ~$10–12 |
| Namecheap (.com) | ~$10–15 |
| Google Domains (.com) | ~$12 |

---

## 6. Sentry (Monitoramento de erros)

Atualmente: **SENTRY_DSN vazio (desativado)**

| Plano | Custo/mês | Eventos/mês | Retenção |
|-------|-----------|-------------|----------|
| **Developer (Free)** | $0 | 5.000 erros | 30 dias |
| **Team** | $26/membro | 50.000 erros | 90 dias |
| **Business** | $80/membro | 100.000 erros | 90 dias |

> Para MVP o plano **Free é suficiente**. Ativar colocando a DSN no `.env`.

---

## 7. ngrok

Atualmente em uso para desenvolvimento.

| Plano | Custo/mês | Domínio fixo | Agentes |
|-------|-----------|--------------|---------|
| **Free** | $0 | Não (URL muda) | 1 |
| **Personal** | $10 | 1 domínio | 3 |
| **Pro** | $20 | 3 domínios | 5 |

> **Em produção:** substituir pelo Cloudflare Tunnel (gratuito).  
> ngrok só continua como ferramenta de desenvolvimento local.

---

## 8. Apple Developer Program (iOS)

| Item | Custo |
|------|-------|
| Apple Developer Program | **$99/ano** |
| Distribuição TestFlight (beta) | Incluído |
| Publicação na App Store | Incluído |

> Obrigatório para distribuir o app no iPhone (incluindo dispositivo Juliana em produção).

---

## 9. Google Play (Android)

| Item | Custo |
|------|-------|
| Google Play Developer Account | **$25 (taxa única)** |
| Publicação ilimitada de apps | Incluído |

---

## 10. GitHub

Atualmente: **Free (repositório público)**

| Plano | Custo/mês | CI/CD minutos | Storage |
|-------|-----------|---------------|---------|
| **Free** | $0 | 2.000 min/mês | 500MB |
| **Team** | $4/usuário | 3.000 min/mês | 2GB |
| **Enterprise** | $21/usuário | Ilimitado | 50GB |

> Free é suficiente para o projeto atual.

---

## 11. Claude Code (Anthropic) — Ferramenta de Desenvolvimento

Plano atual: **Claude Code CLI** via assinatura Anthropic  
Tipo: **custo de desenvolvimento** — não é cobrado do cliente final, é custo da equipe que constrói e mantém o app.

| Plano | Custo/mês | O que inclui |
|-------|-----------|--------------|
| **Claude.ai Pro** | $20 (~R$ 110) | Claude Code com uso moderado, acesso ao claude.ai |
| **Claude.ai Max (5x)** | $100 (~R$ 550) | Claude Code uso intenso, modelos mais avançados |
| **Claude.ai Max (20x)** | $200 (~R$ 1.100) | Claude Code uso muito intenso, projetos grandes |
| **API Anthropic (pay-per-use)** | Variável | Sonnet 4.6: $3/MTok input · $15/MTok output |

### Como entra no custo do negócio

Claude Code é uma ferramenta de **desenvolvimento e manutenção** — equivale ao salário de um desenvolvedor júnior/pleno para tarefas de código, revisão, testes e documentação. O custo deve ser considerado no **custo de construção do produto**, não no custo operacional por cliente.

| Contexto | Custo Claude Code | Equivalente humano |
|----------|-------------------|--------------------|
| MVP / 1 dev | $20–100/mês | Horas de dev economizadas |
| Time pequeno (2–3 devs) | $60–200/mês | ~R$ 330–1.100/mês |
| Manutenção contínua | $20–100/mês | Substituição parcial de dev junior |

> **Recomendação:** Incluir $20–100/mês (R$ 110–550) no custo fixo de operação  
> como "ferramenta de desenvolvimento e manutenção de software".

---

## 12. Ferramentas 100% gratuitas (sem custo em produção)

| Ferramenta | Uso | Licença |
|------------|-----|---------|
| **YOLO11 (Ultralytics)** | Detecção local | AGPL-3.0 (atenção para uso comercial¹) |
| **FastAPI** | Backend API | MIT |
| **React Native** | App mobile | MIT |
| **Docker** | Containerização | Apache 2.0 |
| **Python / Node.js** | Runtime | Open source |
| **PlantUML** | Diagramas | LGPL |
| **Firebase Admin SDK** | Backend auth | Apache 2.0 |

> ¹ **Atenção YOLO:** A licença AGPL-3.0 exige que o código-fonte seja aberto  
> se você distribuir o software. Para uso **comercial fechado**, é necessário  
> adquirir a **licença comercial da Ultralytics (~$300–500/mês)** ou usar  
> YOLOv5/YOLOv8 com licença alternativa. **Verifique antes do lançamento.**

---

## Resumo Consolidado — Custo Mensal por Cenário

### Cenário 1: MVP / Piloto (5 empresas, ~20 usuários)

| Serviço | Custo/mês (USD) |
|---------|----------------|
| Firebase (Blaze) | $0 (dentro do free) |
| Roboflow | $0 (desabilitar ou free tier) |
| Infraestrutura (Railway/Fly.io) | $5 |
| Cloudflare Tunnel | $0 |
| Domínio (.com/ano) | ~$1 |
| Sentry | $0 (free) |
| Apple Developer (anual) | ~$8 |
| Claude Code (manutenção) | $20 |
| **TOTAL/mês** | **~$34/mês (~R$ 187)** |

---

### Cenário 2: Crescimento (20 empresas, ~100 usuários)

| Serviço | Custo/mês (USD) |
|---------|----------------|
| Firebase | $20–40 |
| Roboflow (se ativo) | $249 ou $0 (só YOLO) |
| Infraestrutura | $15–20 |
| Domínio | $1 |
| Sentry (Team) | $26 |
| Apple Developer | $8 |
| Claude Code (manutenção + novos recursos) | $20–100 |
| **TOTAL com Roboflow** | **~$340–444/mês** |
| **TOTAL só YOLO** | **~$90–195/mês (~R$ 495–1.072)** |

---

### Cenário 3: Escala (100 empresas, ~500 usuários)

| Serviço | Custo/mês (USD) |
|---------|----------------|
| Firebase | $100–200 |
| Roboflow (se ativo) | $249–1.249 |
| Infraestrutura | $30–60 |
| Ultralytics licença comercial | $300–500 |
| Domínio | $1 |
| Sentry (Business) | $80 |
| Apple Developer | $8 |
| Claude Code (equipe / max plan) | $100–200 |
| **TOTAL com Roboflow** | **~$870–2.300/mês** |
| **TOTAL só YOLO + licença** | **~$620–1.050/mês (~R$ 3.400–5.775)** |

---

## Recomendações para Precificação do App

### Estratégia de precificação (SaaS por empresa)

Com base nos custos acima, para o **Cenário 2 (crescimento)**:

- **Custo operacional/empresa:** ~$3,50–17/empresa/mês (dependendo de Roboflow)
- **Margem mínima recomendada:** 5x o custo → **$17–85/empresa/mês**
- **Preço sugerido:** **R$ 150–400/empresa/mês** (conforme funcionalidades)

### Modelo de precificação sugerido

| Plano | Preço/mês | Usuários | Scans/mês | Target |
|-------|-----------|----------|-----------|--------|
| **Starter** | R$ 149 | até 5 | 500 | Pequenas empresas |
| **Business** | R$ 299 | até 20 | 2.000 | Médias empresas |
| **Enterprise** | R$ 599 | Ilimitado | Ilimitado | Grandes operações |

### Decisão estratégica crítica

**Desabilitar Roboflow em produção** reduz o custo de ~$249/mês para $0,  
usando apenas o YOLO local. A qualidade de detecção cai ligeiramente,  
mas o modelo pode ser refinado com o dataset próprio (parafusos/garrafas)  
a custo zero. **Recomendado para o MVP.**

---

*Documento gerado em 16/04/2026 — revisar preços periodicamente.*
