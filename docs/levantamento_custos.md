# Cont.IA — Levantamento de Custos por Ferramenta

> Referência: Abril 2026 · Câmbio referência: USD 1 = R$ 5,50  
> Metodologia: para cada serviço → limite gratuito → consumo por usuário → ponto de cobrança → custo por faixa

---

## 1. Firebase (Google Cloud) — CRÍTICO

Plano atual: **Spark (gratuito)**  
Plano necessário para produção: **Blaze (pay-as-you-go)**  
> Blaze não tem mensalidade fixa — você paga apenas o que ultrapassar o free tier.  
> Migrar para Blaze é obrigatório para usar Storage em produção (Spark bloqueia upload).

### 1.1 Limites exatos do plano Spark (gratuito)

| Serviço | Limite gratuito | Custo após o limite |
|---------|-----------------|---------------------|
| **Firestore — leituras** | 50.000 / dia | $0,06 por 100K leituras |
| **Firestore — escritas** | 20.000 / dia | $0,18 por 100K escritas |
| **Firestore — exclusões** | 20.000 / dia | $0,02 por 100K exclusões |
| **Firestore — armazenamento** | 1 GB total | $0,18 / GB / mês |
| **Storage — armazenamento** | 5 GB total | $0,026 / GB / mês |
| **Storage — download** | 1 GB / dia | $0,12 / GB |
| **Storage — operações upload** | 20.000 / dia | $0,004 / 10K |
| **Authentication — MAU** | 10.000 usuários/mês | $0,0055 por usuário adicional |
| **Cloud Functions** | 2M chamadas / mês | $0,40 / 1M chamadas |

### 1.2 Quanto cada ação do app consome no Firestore

| Ação do usuário | Leituras | Escritas | Observação |
|-----------------|----------|----------|------------|
| Login / abrir app | 2 | 0 | Carrega perfil + empresa |
| Abrir histórico | 10–30 | 0 | Depende do volume de scans |
| Realizar 1 scan (salvar) | 2 | 2 | Lê empresaId + escreve inventário |
| Upload foto (Storage) | 0 | 1 op. Storage | ~300KB–1MB por foto |
| Admin abrir painel | 20–50 | 0 | Lista usuários + scans da empresa |
| Abrir chamado de suporte | 3 | 2 | Lê empresa + escreve chamado |
| Support ver todos os chamados | 30–100 | 0 | Depende do volume de tickets |

**Estimativa por usuário ativo por dia:**
- Usuário comum (2–3 scans): ~30–50 leituras · 5–10 escritas
- Admin (gestão diária): ~80–150 leituras · 10–20 escritas

### 1.3 Ponto exato em que cada serviço começa a custar

| Usuários ativos/dia | Leituras/dia | Situação Firestore | Storage acumulado (30 dias) | Situação Storage |
|---------------------|-------------|--------------------|-----------------------------|-----------------|
| **até 50** | ~2.500 | ✅ Gratuito | ~0,4 GB | ✅ Gratuito |
| **51–100** | ~5.000 | ✅ Gratuito | ~0,9 GB | ✅ Gratuito |
| **101–200** | ~10.000 | ✅ Gratuito | ~1,8 GB | ✅ Gratuito |
| **201–500** | ~25.000 | ✅ Gratuito | ~4,5 GB | ⚠️ Borda do limite |
| **501–800** | ~40.000 | ⚠️ Borda | 5 GB+ | 💰 ~$0,80/mês |
| **acima de 1.000** | 50.000+ | 💰 ~$0,30–1/dia | crescendo | 💰 ~$2–10/mês |

> ✅ Confirmado: até ~50 usuários ativos = $0 no Firestore.  
> 💰 Storage começa a cobrar primeiro, puxado pelas fotos dos scans.

### 1.4 Custo Firebase mensal por faixa de usuários

| Usuários ativos | Custo/mês | Principal driver |
|-----------------|-----------|-----------------|
| até 50 | **$0** | — |
| 51–100 | **$1–5** | Storage fotos |
| 101–300 | **$5–20** | Storage + leituras |
| 301–600 | **$20–50** | Todos os serviços |
| 601–1.000 | **$50–100** | Escala |

### 1.5 Estratégias para adiar o custo

| Ação | Economia | Impacto |
|------|----------|---------|
| Comprimir foto (qualidade 0.9 → 0.5) | Storage -50% | Foto menos nítida na auditoria |
| Deletar fotos após 180 dias | Storage -60% | Automatizar com Cloud Function |
| Paginação no histórico | Leituras -40% | Já implementado ✅ |
| Limitar histórico a 90 dias por empresa | Leituras -30% | Exportar CSV antes de arquivar |

---

## 2. Roboflow (RF-DETR) — CRÍTICO

Plano atual: **API Key ativa** (free tier — ~1.000 chamadas/mês)  
Uso: cada scan dispara **1 chamada** à Inference API do Roboflow

### 2.1 Limites e planos

| Plano | Preço/mês | Calls/mês | Ponto de ruptura |
|-------|-----------|-----------|-----------------|
| **Starter (Free)** | $0 | ~1.000 | ~33 scans/dia |
| **Grow** | $249 | 100.000 | ~3.300 scans/dia |
| **Pro** | $1.249 | 1.000.000 | ~33.000 scans/dia |
| **Enterprise** | sob consulta | ilimitado | — |

### 2.2 Ponto de cobrança por número de usuários

| Usuários ativos | Scans estimados/mês | Situação | Custo |
|-----------------|---------------------|----------|-------|
| até 10 | ~500 | ✅ Free tier | $0 |
| 11–33 | 500–1.000 | ⚠️ Na borda | $0 |
| **34–50** | 1.000–1.500 | 💰 **Ultrapassa free** | $249/mês |
| 51–200 | 1.500–6.000 | 💰 Grow obrigatório | $249/mês |
| 201–3.300 | 6.000–100.000 | 💰 Grow | $249/mês |

> ⚠️ Com apenas **34 usuários fazendo 1 scan/dia** já ultrapassa o free tier.  
> O salto de $0 para $249/mês é abrupto — não tem plano intermediário.

### 2.3 Recomendação: desabilitar Roboflow no MVP

| Cenário | Qualidade detecção | Custo Roboflow |
|---------|-------------------|----------------|
| Apenas YOLO local | 85–90% | **$0** |
| YOLO + Roboflow | 90–95% | **$249/mês** |

**Conclusão:** para o MVP, desabilitar Roboflow (`ROBOFLOW_API_KEY=` vazio) economiza $249/mês com perda mínima de qualidade. Reativar quando o faturamento justificar.

---

## 3. Infraestrutura do Backend — CRÍTICO

Situação atual: **Docker local (gratuito, mas não disponível 24/7)**  
Para produção o backend precisa estar sempre no ar.

### 3.1 O que o servidor precisa suportar

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| RAM | 1 GB (YOLO ocupa ~500 MB) | 2 GB |
| CPU | 1 vCPU | 2 vCPU |
| Disco | 2 GB | 5 GB |
| Banda | 10 GB/mês | 50 GB/mês |

### 3.2 Opções de hospedagem com custo por faixa de uso

| Opção | Plano | Custo/mês (USD) | Até quantos usuários | Observação |
|-------|-------|----------------|----------------------|------------|
| **Railway** | Hobby | $5 | ~100 | Sleep após inatividade |
| **Railway** | Pro | $20 | ~500 | Sempre ativo, 8 GB RAM |
| **Hetzner VPS** | CX22 (2vCPU/4GB) | $6 | ~300 | Melhor custo-benefício |
| **Hetzner VPS** | CX32 (4vCPU/8GB) | $12 | ~1.000 | Escala confortável |
| **Fly.io** | Shared CPU | $3–10 | ~200 | Auto-sleep gratuito |
| **Google Cloud Run** | Pay-per-use | $0–30 | ~500 | Paga só quando usa |
| **AWS EC2 t3.small** | On-demand | $15–18 | ~300 | Mais configuração |

### 3.3 Custo por faixa de usuários ativos

| Usuários | Requisições/mês | Servidor necessário | Custo/mês |
|----------|-----------------|---------------------|-----------|
| até 50 | ~1.500 | Hetzner CX22 ou Railway Hobby | **$5–6** |
| 51–200 | ~6.000 | Hetzner CX22 | **$6** |
| 201–500 | ~15.000 | Hetzner CX32 ou Railway Pro | **$12–20** |
| 501–1.000 | ~30.000 | Hetzner CX42 (8vCPU/16GB) | **$30** |
| acima de 1.000 | 50.000+ | Load balancer + múltiplos servers | **$60+** |

> **Recomendação MVP:** Hetzner CX22 ($6/mês ≈ R$ 33/mês).  
> Excelente custo-benefício, sempre ativo, 4 GB RAM — confortável até 300 usuários.

---

## 4. Cloudflare Tunnel + Domínio

### 4.1 Cloudflare Tunnel

| Plano | Custo/mês | Limite de usuários finais | SLA |
|-------|-----------|--------------------------|-----|
| **Zero Trust Free** | $0 | 50 usuários de equipe interna | Sem SLA |
| **Zero Trust Teams** | $7/usuário/mês | Ilimitado | 99,9% |

> O "limite de 50" do Cloudflare Tunnel Free refere-se a usuários do painel  
> de gestão (equipe interna), **não aos usuários do app**.  
> Para o Cont.IA, o tunnel expõe o backend para o app mobile —  
> **o plano Free é suficiente indefinidamente**, independente de quantos  
> usuários usam o app.

### 4.2 Domínio

| Custo | Frequência |
|-------|-----------|
| ~$10–12/ano (~R$ 55–66/ano) | Anual (renovação) |
| ~$0,90/mês amortizado | Mensal |

**Custo total Cloudflare + Domínio: ~$0,90/mês para sempre.**

---

## 5. Sentry (Monitoramento de erros)

Situação atual: **desativado** (DSN vazio no .env)

### 5.1 Planos e limites

| Plano | Custo/mês | Erros/mês | Retenção | Quando usar |
|-------|-----------|-----------|----------|-------------|
| **Developer (Free)** | $0 | 5.000 | 30 dias | MVP, até ~100 usuários |
| **Team** | $26/membro | 50.000 | 90 dias | 100–500 usuários |
| **Business** | $80/membro | 100.000 | 90 dias | 500+ usuários |

### 5.2 Quando o free tier de 5.000 erros/mês é excedido

| Usuários ativos | Erros estimados/mês | Situação |
|-----------------|---------------------|----------|
| até 200 | ~500–2.000 | ✅ Free (se app estável) |
| 201–500 | ~2.000–5.000 | ⚠️ Borda do free tier |
| acima de 500 | 5.000+ | 💰 Team: $26/mês |

> Com app estável e bem testado, o free tier dura muito.  
> **Recomendação:** ativar o free agora (sem custo) e só pagar quando necessário.

---

## 6. Apple Developer Program (iOS)

| Item | Custo | Frequência | Amortizado/mês |
|------|-------|-----------|----------------|
| Apple Developer Program | $99 | Anual | **$8,25/mês** |
| Publicação App Store | Incluído | — | — |
| TestFlight (beta) | Incluído | — | — |

> Obrigatório para distribuir o app em qualquer iPhone.  
> Sem este programa, o app só roda em modo dev com cabo conectado.  
> **Custo fixo independente do número de usuários ou clientes.**

---

## 7. Google Play (Android)

| Item | Custo | Frequência |
|------|-------|-----------|
| Conta Developer Google Play | $25 | **Taxa única** |
| Publicação ilimitada de apps | Incluído | — |

> Não há custo recorrente. $25 uma vez e pronto.

---

## 8. YOLO11 — Licença Comercial ⚠️ URGENTE

Situação atual: **AGPL-3.0 (gratuito, mas com restrições comerciais)**

### 8.1 O problema da licença AGPL

A licença AGPL-3.0 exige que qualquer software distribuído que use código AGPL  
tenha seu **código-fonte disponibilizado publicamente**. Ao cobrar clientes  
por um app fechado que usa YOLO, você está em violação da licença.

### 8.2 Opções e custos

| Opção | Custo/mês | Detalhe |
|-------|-----------|---------|
| **Ultralytics Enterprise** | ~$300–500 | Licença comercial fechada, suporte |
| **YOLOv5 (licença GPL-3.0)** | $0 | Mesmo problema |
| **YOLOv8 com licença alternativa** | $0–300 | Verificar versão específica |
| **Treinar modelo próprio** | $0 (após treino) | Dataset próprio = sem restrição |
| **Usar API externa apenas** | $0 (via Roboflow) | Sem código local = sem problema de licença |

### 8.3 Impacto por cenário

| Quando | Ação necessária |
|--------|----------------|
| **Agora (desenvolvimento)** | Sem problema — uso interno |
| **Ao cobrar o 1º cliente** | Precisa de licença ou modelo próprio |
| **Escala** | Licença Ultralytics ou dataset treinado |

> **Solução de médio prazo:** usar o dataset de correções que o app já está  
> coletando (campo `correcoes` no Firestore) para treinar um modelo próprio.  
> Modelo próprio = licença própria = custo zero para sempre.

---

## 9. Claude Code (Anthropic) — Ferramenta de Desenvolvimento

Tipo: **custo da equipe de desenvolvimento**, não repassado ao cliente final.

### 9.1 Planos

| Plano | Custo/mês | Capacidade | Melhor para |
|-------|-----------|-----------|-------------|
| **Claude.ai Pro** | $20 (~R$ 110) | Uso moderado | Manutenção, bugs pontuais |
| **Claude.ai Max (5x)** | $100 (~R$ 550) | Uso intenso | Novos recursos ativos |
| **Claude.ai Max (20x)** | $200 (~R$ 1.100) | Uso muito intenso | Time completo |
| **API pay-per-use** | Variável | Sonnet 4.6: $3/MTok input · $15/MTok output | Integração futura no produto |

### 9.2 Como calcular no negócio

| Fase | Plano recomendado | Custo/mês | Equivalente humano |
|------|-------------------|-----------|--------------------|
| MVP / manutenção leve | Pro | $20 | 2–3h de dev freelance |
| Crescimento / novos recursos | Max 5x | $100 | ~10h de dev pleno |
| Equipe ativa | Max 20x | $200 | ~20h de dev pleno |

> Incluir como custo fixo de operação da empresa (não por cliente).

---

## 10. GitHub

Situação atual: **Free (repositório público)**

| Plano | Custo/mês | CI/CD min/mês | Quando usar |
|-------|-----------|---------------|-------------|
| **Free** | $0 | 2.000 | MVP, repositório público |
| **Team** | $4/usuário | 3.000 | Time com repositório privado |

> Para repositório privado com time de 2 pessoas: $8/mês.  
> O plano Free atual é suficiente — repositório já está público.

---

## 11. ngrok

Situação: **apenas desenvolvimento local** — não entra em produção.

| Plano | Custo/mês | Uso |
|-------|-----------|-----|
| **Free** | $0 | Desenvolvimento local (URL temporária) |

> Em produção usa Cloudflare Tunnel (gratuito). ngrok = $0 permanente.

---

## 12. Ferramentas sem custo (open source)

| Ferramenta | Licença | Custo |
|------------|---------|-------|
| FastAPI | MIT | $0 |
| React Native | MIT | $0 |
| Docker | Apache 2.0 | $0 |
| Python / Node.js | Open source | $0 |
| Firebase Admin SDK | Apache 2.0 | $0 |

---

## CALCULADORA DE PRECIFICAÇÃO

### Custo total real por faixa de usuários ativos (sem Roboflow, sem licença YOLO)

| Usuários | Firebase | Servidor | Domínio | Apple Dev | Sentry | Claude Code | **TOTAL/mês** | **TOTAL R$/mês** |
|----------|---------|---------|---------|-----------|--------|-------------|--------------|-----------------|
| **até 50** | $0 | $6 | $0,90 | $8,25 | $0 | $20 | **$35,15** | **~R$ 193** |
| **51–100** | $2 | $6 | $0,90 | $8,25 | $0 | $20 | **$37** | **~R$ 204** |
| **101–200** | $8 | $6 | $0,90 | $8,25 | $0 | $20 | **$43** | **~R$ 237** |
| **201–500** | $25 | $12 | $0,90 | $8,25 | $26 | $100 | **$172** | **~R$ 946** |
| **501–1.000** | $60 | $30 | $0,90 | $8,25 | $26 | $100 | **$225** | **~R$ 1.238** |

> Se Roboflow ativo: somar $249/mês a partir de 34 usuários.  
> Se licença YOLO necessária: somar $300–500/mês a partir do 1º cliente.

---

### Precificação sugerida por plano

Fórmula: **Custo total ÷ nº clientes × margem mínima 5x**

#### Cenário: 10 clientes pagantes (mix Starter + Business)

| Plano | Usuários | Scans/mês | Custo/cliente (estimado) | Preço sugerido | Margem |
|-------|----------|-----------|--------------------------|----------------|--------|
| **Starter** | até 5 | 300 | ~R$ 20 | **R$ 197/mês** | ~90% |
| **Business** | até 20 | 1.500 | ~R$ 35 | **R$ 497/mês** | ~93% |
| **Enterprise** | ilimitado | ilimitado | ~R$ 80 | **R$ 997/mês** | ~92% |

#### Break-even por número de clientes

| Clientes | Receita/mês | Custo/mês | Lucro/mês | Break-even? |
|----------|-------------|-----------|-----------|-------------|
| 1 Starter | R$ 197 | R$ 193 | R$ 4 | ✅ Paga o servidor |
| 2 Starter | R$ 394 | R$ 195 | R$ 199 | ✅ Lucro real |
| 5 Starter | R$ 985 | R$ 200 | R$ 785 | ✅ 80% margem |
| 3 Business | R$ 1.491 | R$ 210 | R$ 1.281 | ✅ 86% margem |
| 1 Enterprise | R$ 997 | R$ 195 | R$ 802 | ✅ 80% margem |

#### Receita projetada (conservador)

| Mês | Clientes | Mix | Receita | Custo | Lucro |
|-----|----------|-----|---------|-------|-------|
| 1–3 | 3 | 3 Starter | R$ 591 | R$ 193 | **R$ 398** |
| 4–6 | 8 | 5S + 3B | R$ 2.476 | R$ 210 | **R$ 2.266** |
| 7–12 | 20 | 10S + 8B + 2E | R$ 7.942 | R$ 260 | **R$ 7.682** |
| Ano 2 | 50 | mix | ~R$ 20.000 | ~R$ 600 | **~R$ 19.400** |

---

### Alerta: os dois custos que mudam o jogo

| Custo | Quando aparece | Impacto |
|-------|---------------|---------|
| **Licença YOLO** | Ao cobrar o 1º cliente | +R$ 1.650–2.750/mês → exige 8–14 clientes Starter para cobrir |
| **Roboflow** | Com 34+ usuários ativos | +R$ 1.370/mês → exige 7 clientes Starter a mais |

> Se resolver a licença YOLO via modelo próprio (dataset que já está sendo coletado),  
> os preços propostos são sustentáveis e com margem saudável desde o 2º cliente.

---

*Documento gerado em 16/04/2026 — revisar preços semestralmente.*
