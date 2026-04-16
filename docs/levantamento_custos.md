# Cont.IA — Levantamento de Custos por Ferramenta

> Referência: Abril 2026 · Valores em USD (converter para BRL conforme câmbio atual)

---

## 1. Firebase (Google Cloud) — CRÍTICO

Plano atual: **Spark (gratuito)**  
Plano necessário para produção: **Blaze (pay-as-you-go)**

### Limites gratuitos vs custo após

| Serviço | Gratuito (Spark) | Custo após limite |
|---------|-----------------|-------------------|
| **Firestore — leituras** | 50.000/dia | $0,06 por 100K |
| **Firestore — escritas** | 20.000/dia | $0,18 por 100K |
| **Firestore — exclusões** | 20.000/dia | $0,02 por 100K |
| **Firestore — armazenamento** | 1 GB | $0,18/GB/mês |
| **Storage (fotos)** | 5 GB | $0,026/GB armazenado + $0,12/GB download |
| **Authentication** | 10.000 MAU/mês | $0,0055 por MAU adicional |
| **Cloud Functions** | 2M chamadas/mês | $0,40 por 1M chamadas |

### Estimativa por escala (mensal)

| Escala | Empresas | Usuários ativos | Scans/dia | Custo Firebase/mês |
|--------|----------|-----------------|-----------|-------------------|
| Piloto | 5 | 20 | 50 | **~$0** (dentro do free) |
| Pequeno | 20 | 100 | 200 | **~$15–30** |
| Médio | 50 | 300 | 600 | **~$60–120** |
| Grande | 150 | 1.000 | 2.000 | **~$200–400** |

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

## 11. Ferramentas 100% gratuitas (sem custo em produção)

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

| Serviço | Custo/mês |
|---------|-----------|
| Firebase (Blaze) | $0 (dentro do free) |
| Roboflow | $0 (desabilitar ou free tier) |
| Infraestrutura (Railway/Fly.io) | $5 |
| Cloudflare Tunnel | $0 |
| Domínio (.com/ano) | ~$1 |
| Sentry | $0 (free) |
| **TOTAL/mês** | **~$6/mês** |
| Apple Developer (anual) | $99/ano (~$8/mês) |
| **TOTAL real** | **~$14/mês** |

---

### Cenário 2: Crescimento (20 empresas, ~100 usuários)

| Serviço | Custo/mês |
|---------|-----------|
| Firebase | $20–40 |
| Roboflow (se ativo) | $249 ou $0 (só YOLO) |
| Infraestrutura | $15–20 |
| Domínio | $1 |
| Sentry (Team) | $26 |
| Apple Developer | $8 |
| **TOTAL com Roboflow** | **~$320–344/mês** |
| **TOTAL só YOLO** | **~$70–95/mês** |

---

### Cenário 3: Escala (100 empresas, ~500 usuários)

| Serviço | Custo/mês |
|---------|-----------|
| Firebase | $100–200 |
| Roboflow (se ativo) | $249–1.249 |
| Infraestrutura | $30–60 |
| Ultralytics licença comercial | $300–500 |
| Domínio | $1 |
| Sentry (Business) | $80 |
| Apple Developer | $8 |
| **TOTAL com Roboflow** | **~$770–2.100/mês** |
| **TOTAL só YOLO + licença** | **~$520–850/mês** |

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
