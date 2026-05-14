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

## 2. MobileSAM — Segmentação Local (sem custo operacional)

**Pipeline atual:** YOLO11 detecta objetos → MobileSAM gera máscara de segmentação precisa  
**Custo por scan:** $0 — ambos os modelos rodam 100% no servidor Docker local

### 2.1 Comparativo com abordagem anterior (Roboflow RF-DETR)

| Abordagem | Custo por scan | Dependência externa | Qualidade |
|-----------|---------------|--------------------|-----------| 
| YOLO + Roboflow RF-DETR (anterior) | $249/mês a partir de 34 usuários | API externa (falha se offline) | Detecção dupla |
| **YOLO + MobileSAM (atual)** | **$0** | **Nenhuma** | **Detecção + segmentação precisa** |

### 2.2 Vantagem estratégica

O MobileSAM (Meta AI, 2023) é um modelo de segmentação destilado do SAM original, com apenas 38 MB e ~150ms de latência em CPU. O checkpoint é baixado uma única vez no build do Docker e não gera custo recorrente.

- Sem API Key
- Sem plano pago
- Sem risco de ruptura de limite
- Máscaras de segmentação precisas para separar objetos encostados (caso real em prateleiras)

> Esta mudança eliminou um risco de $249/mês que surgiria com 34+ usuários ativos.

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
| **Usar modelo próprio treinado** | $0 (após treino) | Dataset próprio = sem restrição de licença |

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

## 12. IA de Validação de Dataset (Claude API / Gemini)

**Função:** validar automaticamente se o label de um scan corresponde à imagem antes de entrar no dataset de treino. Reduz trabalho manual do Super Admin e melhora a qualidade do modelo.

**Arquitetura:** camada de abstração com variável de ambiente `AI_PROVIDER=gemini|claude`. Troca de provedor sem alterar lógica de negócio.

### 12.1 Custo por provedor

| Provedor | Modelo | Custo por validação | 500 validações/mês | 5.000 validações/mês |
|----------|--------|--------------------|--------------------|----------------------|
| **Gemini Flash** | gemini-1.5-flash | **$0** (free tier) | **$0** | **$0** |
| **Claude Haiku 4.5** | claude-haiku-4-5 | ~$0.001 | ~$0.50 | ~$5 |
| **Claude Sonnet 4.6** | claude-sonnet-4-6 | ~$0.008 | ~$4 | ~$40 |

> Estratégia: **Gemini Flash** como provedor padrão (free tier generoso: 1M tokens/dia).  
> Claude Haiku entra quando volume superar o free tier ou quando precisar de maior precisão.

### 12.2 Custo mensal estimado por faixa de clientes

| Faixa | Validações/mês | Gemini Flash | Claude Haiku | Claude Sonnet |
|-------|---------------|-------------|-------------|--------------|
| até 5 empresas | ~500 | **$0** | ~$0.50 | ~$4 |
| 5–20 empresas | ~2.000 | **$0** | ~$2 | ~$16 |
| 20–50 empresas | ~5.000 | **$0** | ~$5 | ~$40 |
| 50–200 empresas | ~20.000 | ~$2 (acima do free) | ~$20 | ~$160 |

### 12.3 Regra de negócio por plano

| Plano | Validação de dataset | Provedor | Custo repassado |
|-------|---------------------|----------|----------------|
| **Starter** | Manual (Super Admin) | — | $0 |
| **Business** | Semi-automática (regras heurísticas) | Sem IA externa | $0 |
| **Enterprise** | IA automática (Gemini/Claude) + relatório de qualidade | Gemini Flash → Claude | Absorvido na margem |

> A validação IA é **feature exclusiva do plano Enterprise** (R$997/mês).  
> O custo de Claude Haiku (~$5–20/mês para 20–50 empresas Enterprise) é absorvido  
> pela margem de 92% do plano, sem impacto no preço ao cliente.

### 12.4 Ponto de migração Gemini → Claude

| Evento | Ação |
|--------|------|
| Volume de validações < 1M tokens/dia | Continuar com Gemini Flash ($0) |
| Volume supera free tier OU precisão insatisfatória | Migrar para Claude Haiku ($0.001/val) |
| Clientes Enterprise > 50 OU validações > 50k/mês | Avaliar Claude Sonnet para maior precisão |

---

## 13. Ferramentas sem custo (open source)

| Ferramenta | Licença | Custo |
|------------|---------|-------|
| FastAPI | MIT | $0 |
| React Native | MIT | $0 |
| Docker | Apache 2.0 | $0 |
| Python / Node.js | Open source | $0 |
| Firebase Admin SDK | Apache 2.0 | $0 |

---

## CALCULADORA DE PRECIFICAÇÃO

### Custo total real por faixa de usuários ativos (sem licença YOLO — MobileSAM é gratuito)

| Usuários | Firebase | Servidor | Domínio | Apple Dev | Sentry | Claude Code | **TOTAL/mês** | **TOTAL R$/mês** |
|----------|---------|---------|---------|-----------|--------|-------------|--------------|-----------------|
| **até 50** | $0 | $6 | $0,90 | $8,25 | $0 | $20 | **$35,15** | **~R$ 193** |
| **51–100** | $2 | $6 | $0,90 | $8,25 | $0 | $20 | **$37** | **~R$ 204** |
| **101–200** | $8 | $6 | $0,90 | $8,25 | $0 | $20 | **$43** | **~R$ 237** |
| **201–500** | $25 | $12 | $0,90 | $8,25 | $26 | $100 | **$172** | **~R$ 946** |
| **501–1.000** | $60 | $30 | $0,90 | $8,25 | $26 | $100 | **$225** | **~R$ 1.238** |

> MobileSAM não gera custo adicional — é executado localmente no servidor.  
> Se licença YOLO necessária: somar $300–500/mês a partir do 1º cliente.

---

### Precificação sugerida por plano

Fórmula: **Custo total ÷ nº clientes × margem mínima 5x**

#### Cenário: 10 clientes pagantes (mix Starter + Business)

| Plano | Usuários | Scans/mês | Validação IA | Custo/cliente | Preço sugerido | Margem |
|-------|----------|-----------|-------------|---------------|----------------|--------|
| **Starter** | até 5 | 300 | Manual | ~R$ 20 | **R$ 197/mês** | ~90% |
| **Business** | até 20 | 1.500 | Heurística | ~R$ 35 | **R$ 497/mês** | ~93% |
| **Enterprise** | ilimitado | ilimitado | IA (Gemini/Claude) | ~R$ 90 | **R$ 997/mês** | ~91% |

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

### Alerta: os custos que mudam o jogo

| Custo | Quando aparece | Impacto |
|-------|---------------|---------|
| **Licença YOLO** | Ao cobrar o 1º cliente | +R$ 1.650–2.750/mês → exige 8–14 clientes Starter para cobrir |
| **Claude API (Haiku)** | Quando volume superar free tier Gemini | +~R$ 10–110/mês (absorvido na margem Enterprise) |
| **Claude API (Sonnet)** | Escala acima de 50 empresas Enterprise | +~R$ 220/mês → ainda dentro da margem de 91% |

> Estratégia: começar com **Gemini Flash gratuito** → migrar para **Claude Haiku** quando necessário.  
> O custo de IA de validação nunca ultrapassa 5% da receita do plano Enterprise.  
> Se resolver a licença YOLO via modelo próprio, os preços são sustentáveis desde o 2º cliente.  
> MobileSAM não adiciona custo — pipeline 100% local.

---

*Documento gerado em 16/04/2026 — revisar preços semestralmente.*
