# Cont.IA — Relatório Financeiro Completo
### Viabilidade Econômica · Sem Investidores Externos

---

> **Cotação utilizada:** USD 1 = R$ 5,80  
> **Referência:** Abril 2026  
> **Regime tributário:** Simples Nacional — Anexo III (Serviços de TI)  
> **Modelo:** SaaS B2B com assinatura mensal recorrente

---

## 1. ESTRUTURA DE CUSTOS OPERACIONAIS

### 1.1 Custos Mensais Fixos (obrigatórios desde o dia 1)

| Serviço | Custo (USD) | Custo (R$) | Observação |
|---------|------------|-----------|------------|
| Servidor Hetzner CX22 | $6,00 | R$ 34,80 | 2 vCPU · 4 GB RAM · sempre ativo |
| Apple Developer Program | $8,25 | R$ 47,85 | $99/ano amortizado |
| Domínio .com + Cloudflare | $0,90 | R$ 5,22 | ~$10/ano amortizado |
| Claude Code (manutenção) | $20,00 | R$ 116,00 | Pro plan — bugs e ajustes |
| **TOTAL FIXO/MÊS** | **$35,15** | **R$ 203,87** | |

### 1.2 Custo Único na Abertura (one-time)

| Item | Custo (R$) | Quando |
|------|-----------|--------|
| Google Play Developer | R$ 145,00 | Antes de publicar no Android |
| Registro domínio (ano 1) | R$ 64,00 | Ao configurar URL de produção |
| **TOTAL ABERTURA** | **R$ 209,00** | Pago uma única vez |

### 1.3 Custos Variáveis (escalam com receita)

| Item | Taxa | Base de cálculo | Observação |
|------|------|-----------------|------------|
| Simples Nacional | 6% | Receita bruta | Faixa até R$ 180K/ano |
| Gateway de pagamento | 3,5% | Por transação | Asaas, Stripe ou PagSeguro |
| Inadimplência estimada | 3% | Receita bruta | Cancelamentos e atrasos |
| **Total variável** | **~12,5%** | Sobre receita bruta | |

> Com receita abaixo de R$ 180K/ano, Simples Nacional permanece em 6%.  
> De R$ 180K a R$ 360K/ano: ~8,7%. De R$ 360K a R$ 720K/ano: ~10,4%.

### 1.4 Custos Condicionais (só ativam em determinado ponto)

| Serviço | Gatilho | Custo/mês (R$) | Ação recomendada |
|---------|---------|---------------|-----------------|
| Roboflow | 34+ usuários ativos | R$ 1.446 | Manter desabilitado no MVP |
| Firebase Blaze | 200+ usuários ativos | R$ 29–116 | Migrar para Blaze (sem custo fixo) |
| Firebase Storage | 10.000+ fotos acumuladas | R$ 1–15 | Comprimir fotos (quality 0.5) |
| Sentry Team | 500+ usuários ativos | R$ 151 | Free tier suficiente até lá |
| Servidor upgrade | 500+ usuários ativos | +R$ 35 | Hetzner CX32 ($12) |

### 1.5 O Custo que Muda Tudo — Licença YOLO

| Cenário | Custo YOLO/mês | Impacto no break-even |
|---------|---------------|----------------------|
| **A — Modelo próprio treinado** | R$ 0 | Sem impacto — recomendado |
| **B — Licença Ultralytics Enterprise** | R$ 1.740–2.900 | +9–15 clientes Starter para cobrir |
| **C — Usar só Roboflow (sem YOLO local)** | R$ 1.446 | +7 clientes Starter |

**Caminho para o Modelo Próprio (Cenário A):**
1. O app já coleta correções de label (`correcoes[]` no Firestore)
2. Com 500–1.000 imagens corrigidas → treinar modelo via Google Colab (gratuito)
3. Exportar `best.pt` → substituir `yolo11m.pt` → **custo zero para sempre**
4. Prazo estimado: **3–6 meses** de uso ativo coletando dados

---

## 2. PORTFÓLIO DE PLANOS

| Plano | Usuários | Scans/mês | Preço/mês | Para quem |
|-------|----------|-----------|-----------|-----------|
| **Starter** | até 5 | 300 | R$ 197 | Mercearia, pequeno varejo |
| **Pro** | até 10 | 800 | R$ 297 | Farmácia, conveniência |
| **Business** | até 20 | 2.000 | R$ 497 | Distribuidora, atacado |
| **Enterprise** | ilimitado | ilimitado | R$ 997 | Rede, franquia |

### Receita líquida por plano (após 12,5% de impostos + gateway)

| Plano | Preço bruto | Deduções (12,5%) | Receita líquida/cliente |
|-------|------------|-----------------|------------------------|
| Starter | R$ 197 | R$ 24,63 | **R$ 172,37** |
| Pro | R$ 297 | R$ 37,13 | **R$ 259,87** |
| Business | R$ 497 | R$ 62,13 | **R$ 434,87** |
| Enterprise | R$ 997 | R$ 124,63 | **R$ 872,37** |

---

## 3. ANÁLISE DE BREAK-EVEN

### 3.1 Custo total a cobrir em cada período

| Período | Custos fixos mensais | Custo abertura | **Total a cobrir** |
|---------|---------------------|----------------|-------------------|
| 3 meses | R$ 204 × 3 = R$ 612 | R$ 209 | **R$ 821** |
| 6 meses | R$ 204 × 6 = R$ 1.224 | R$ 209 | **R$ 1.433** |
| 12 meses | R$ 204 × 12 = R$ 2.448 | R$ 209 + R$ 545 (Apple) | **R$ 3.202** |

> No mês 12 há renovação anual da Apple ($99 = R$ 545). Incluído acima.

### 3.2 Quantos clientes de cada plano cobrem os gastos

#### Para cobrir em 3 meses (R$ 821 no total):

| Combinação | Receita 3 meses | Cobre? |
|-----------|----------------|--------|
| 2 Starter | R$ 172 × 2 × 3 = R$ 1.034 | ✅ Sobra R$ 213 |
| 1 Pro | R$ 260 × 1 × 3 = R$ 780 | ❌ Falta R$ 41 |
| 1 Pro + 1 Starter em mês 2 | R$ 780 + R$ 172 = R$ 952 | ✅ |
| 1 Business | R$ 435 × 3 = R$ 1.305 | ✅ Sobra R$ 484 |

**Mínimo para cobrir 3 meses: 2 clientes Starter ou 1 cliente Pro.**

#### Para cobrir em 6 meses (R$ 1.433 no total):

| Combinação | Receita 6 meses | Cobre? |
|-----------|----------------|--------|
| 1 Starter constante | R$ 172 × 6 = R$ 1.034 | ❌ Falta R$ 399 |
| 2 Starter constantes | R$ 344 × 6 = R$ 2.064 | ✅ Sobra R$ 631 |
| 1 Starter + 1 Pro | R$ 432 × 6 = R$ 2.592 | ✅ Sobra R$ 1.159 |
| 1 Business | R$ 435 × 6 = R$ 2.610 | ✅ Sobra R$ 1.177 |

**Mínimo para cobrir 6 meses: 2 clientes Starter ou 1 cliente Pro.**

#### Para cobrir em 12 meses (R$ 3.202 no total):

| Combinação | Receita 12 meses | Cobre? |
|-----------|-----------------|--------|
| 1 Starter constante | R$ 172 × 12 = R$ 2.064 | ❌ Falta R$ 1.138 |
| 2 Starter constantes | R$ 344 × 12 = R$ 4.128 | ✅ Sobra R$ 926 |
| 1 Pro constante | R$ 260 × 12 = R$ 3.120 | ⚠️ Quase (falta R$ 82) |
| 1 Pro + 1 Starter | R$ 432 × 12 = R$ 5.184 | ✅ Sobra R$ 1.982 |
| 1 Business | R$ 435 × 12 = R$ 5.220 | ✅ Sobra R$ 2.018 |

**Mínimo para cobrir 12 meses: 2 clientes Starter ou 1 cliente Pro.**

---

## 4. PROJEÇÃO DE RECEITA E LUCRO (12 MESES)

### 4.1 Cenário Conservador — crescimento lento

| Mês | Clientes | Mix | Receita bruta | Custo total | Lucro/mês |
|-----|----------|-----|--------------|------------|-----------|
| 1 | 0 | — | R$ 0 | R$ 204 | **−R$ 204** |
| 2 | 1 | 1S | R$ 197 | R$ 229 | **−R$ 32** |
| 3 | 2 | 2S | R$ 394 | R$ 253 | **+R$ 141** |
| 4 | 3 | 2S+1P | R$ 691 | R$ 290 | **+R$ 401** |
| 5 | 4 | 2S+1P+1B | R$ 1.188 | R$ 353 | **+R$ 835** |
| 6 | 6 | 3S+2P+1B | R$ 1.682 | R$ 414 | **+R$ 1.268** |
| 7 | 8 | 3S+2P+2B+1E | R$ 3.073 | R$ 588 | **+R$ 2.485** |
| 8 | 10 | 4S+2P+3B+1E | R$ 3.764 | R$ 675 | **+R$ 3.089** |
| 9 | 12 | 4S+3P+3B+2E | R$ 4.850 | R$ 810 | **+R$ 4.040** |
| 10 | 14 | 5S+3P+4B+2E | R$ 5.644 | R$ 910 | **+R$ 4.734** |
| 11 | 16 | 5S+4P+5B+2E | R$ 6.437 | R$ 1.010 | **+R$ 5.427** |
| 12 | 18 | 6S+4P+5B+3E | R$ 7.824 | R$ 1.186 | **+R$ 6.638** |

> S = Starter · P = Pro · B = Business · E = Enterprise  
> Custo total = fixo + 12,5% impostos/gateway + Firebase crescendo

**Resultado do ano 1 (conservador):**
- Receita bruta total: ~R$ 40.738
- Custo total: ~R$ 6.722
- **Lucro líquido ano 1: ~R$ 34.016 (~R$ 2.835/mês médio)**

---

### 4.2 Cenário Realista — vendas ativas

| Mês | Clientes | Mix | Receita bruta | Custo total | Lucro/mês |
|-----|----------|-----|--------------|------------|-----------|
| 1 | 2 | 2S | R$ 394 | R$ 253 | **+R$ 141** |
| 2 | 4 | 2S+2P | R$ 988 | R$ 327 | **+R$ 661** |
| 3 | 6 | 3S+2P+1B | R$ 1.682 | R$ 414 | **+R$ 1.268** |
| 4 | 9 | 4S+2P+2B+1E | R$ 2.879 | R$ 563 | **+R$ 2.316** |
| 5 | 12 | 5S+3P+3B+1E | R$ 3.973 | R$ 700 | **+R$ 3.273** |
| 6 | 15 | 5S+4P+4B+2E | R$ 5.763 | R$ 920 | **+R$ 4.843** |
| 7 | 18 | 6S+4P+5B+3E | R$ 7.824 | R$ 1.186 | **+R$ 6.638** |
| 8 | 22 | 7S+5P+6B+4E | R$ 10.300 | R$ 1.538 | **+R$ 8.762** |
| 9 | 26 | 8S+6P+7B+5E | R$ 12.773 | R$ 1.882 | **+R$ 10.891** |
| 10 | 30 | 9S+7P+8B+6E | R$ 15.249 | R$ 2.221 | **+R$ 13.028** |
| 11 | 35 | 10S+8P+10B+7E | R$ 18.615 | R$ 2.696 | **+R$ 15.919** |
| 12 | 40 | 12S+9P+11B+8E | R$ 22.278 | R$ 3.210 | **+R$ 19.068** |

**Resultado do ano 1 (realista):**
- Receita bruta total: ~R$ 102.718
- Custo total: ~R$ 15.710
- **Lucro líquido ano 1: ~R$ 87.008 (~R$ 7.251/mês médio)**

---

## 5. MARGENS DE LUCRO DETALHADAS

### 5.1 Por plano individualmente

| Plano | Preço | Custo operacional/cliente | Impostos + gateway | **Lucro por cliente** | **Margem líquida** |
|-------|-------|--------------------------|--------------------|-----------------------|--------------------|
| Starter | R$ 197 | R$ 20 | R$ 24,63 | **R$ 152,37** | **77%** |
| Pro | R$ 297 | R$ 22 | R$ 37,13 | **R$ 237,87** | **80%** |
| Business | R$ 497 | R$ 35 | R$ 62,13 | **R$ 399,87** | **80%** |
| Enterprise | R$ 997 | R$ 80 | R$ 124,63 | **R$ 792,37** | **79%** |

> Margem líquida = (Preço − custo operacional − impostos/gateway) ÷ Preço  
> Não inclui suporte, marketing e hora de desenvolvimento (custos variáveis de gestão)

### 5.2 Comparativo de margens por setor

| Setor | Margem líquida típica |
|-------|----------------------|
| Varejo físico | 3–8% |
| Restaurante | 5–10% |
| Consultoria | 30–50% |
| SaaS (mercado) | 60–80% |
| **Cont.IA (projetado)** | **77–80%** |

---

## 6. AQUISIÇÕES NECESSÁRIAS POR PERÍODO

### 6.1 Mínimo para pagar as contas (break-even operacional)

| Período | Custo acumulado | Mix mínimo de clientes | Receita necessária |
|---------|----------------|----------------------|-------------------|
| Mês 1 | R$ 413 (abertura + fixo) | 1 Pro ou 2 Starter | R$ 260 ou R$ 344/mês |
| 3 meses | R$ 821 | 2 Starter constantes | R$ 344/mês → R$ 1.032 |
| 6 meses | R$ 1.433 | 2 Starter constantes | R$ 344/mês → R$ 2.064 |
| 12 meses | R$ 3.202 | 2 Starter ou 1 Pro constantes | → R$ 4.128 ou R$ 3.120 |

### 6.2 Para ter lucro real (após impostos, suporte e margem pessoal)

Considerando que você precisa de **R$ 3.000/mês** de pró-labore para se sustentar:

| Período | Meta de receita/mês | Clientes necessários | Mix sugerido |
|---------|--------------------|--------------------|--------------|
| Mês 3 | R$ 3.600 | 8–10 clientes | 5S + 3P ou 4S + 2P + 1B |
| Mês 6 | R$ 5.000 | 12–15 clientes | 5S + 4P + 3B + 1E |
| Mês 12 | R$ 10.000 | 22–25 clientes | 8S + 6P + 6B + 2E |

### 6.3 Metas de aquisição mensal (quantas vendas fazer por mês)

| Meta | Novas vendas/mês | Onde focar |
|------|-----------------|-----------|
| **Conservador** | 1–2/mês | Indicações, WhatsApp, clientes locais |
| **Realista** | 3–4/mês | Instagram, LinkedIn, abordagem direta |
| **Agressivo** | 6–8/mês | Parceiros comerciais, revendedores |

---

## 7. CENÁRIO YOLO — TREINAR O PRÓPRIO MODELO

### 7.1 Como o app já prepara o dataset

Cada scan corrigido pelo usuário gera no Firestore:
```
correcoes: [
  { labelOriginal: "book", labelCorrigido: "Papel A4", bbox, confianca }
]
```
Com `temCorrecoes: true` — pronto para exportação como dataset de treino.

### 7.2 Quanto dado é necessário

| Objeto-alvo | Imagens mínimas | Imagens ideais | Com 50 usuários ativos (prazo) |
|------------|----------------|----------------|-------------------------------|
| Garrafas | 200 | 500 | ~2 semanas |
| Itens de mercearia | 500 | 1.500 | ~1 mês |
| Múltiplos objetos | 1.000 | 3.000 | ~2–3 meses |

### 7.3 Impacto financeiro do modelo próprio

| | Com licença Ultralytics | Com modelo próprio |
|--|------------------------|--------------------|
| Custo YOLO/mês | R$ 1.740–2.900 | **R$ 0** |
| Break-even adicional | +9–15 clientes Starter | Sem impacto |
| Qualidade detecção | Alta (genérico) | **Muito alta** (especializado no negócio) |
| Tempo para implementar | Imediato | 3–6 meses de coleta |
| Custo treinamento | — | **R$ 0** (Google Colab gratuito) |

**Recomendação:** Começar vendendo sem licença YOLO (uso interno = sem problema),  
coletando dados de correção desde o dia 1, e treinar o modelo próprio no mês 3–4.

---

## 8. RESUMO EXECUTIVO

### Viabilidade: ✅ VIÁVEL sem investidores externos

| Indicador | Valor |
|-----------|-------|
| Custo para colocar no ar | R$ 209 (única vez) |
| Custo mensal de operação | R$ 204/mês |
| Clientes para pagar as contas | **2 clientes Starter** |
| Clientes para sustento próprio (R$3K/mês) | **~10 clientes** |
| Margem líquida por cliente | **77–80%** |
| Payback do investimento inicial | **1,2 meses** (com 2 Starters) |
| Receita ano 1 (conservador) | R$ 40.738 |
| Receita ano 1 (realista) | R$ 102.718 |
| Lucro ano 1 (conservador) | **R$ 34.016** |
| Lucro ano 1 (realista) | **R$ 87.008** |

### Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Licença YOLO cobrada antes de ter modelo próprio | Médio | Alto | Usar só internamente até ter modelo próprio |
| Roboflow cobrado ao escalar | Alto | Médio | Manter desabilitado no MVP |
| Churn (cancelamento de clientes) | Médio | Alto | Contrato mínimo de 3 meses |
| Firebase cobra antes do esperado | Baixo | Baixo | Comprimir fotos, já planejado |
| Concorrência de preço | Baixo | Médio | Diferencial: IA + auditoria visual |

### Ordem de prioridades financeiras

| Prioridade | Ação | Custo | Prazo |
|-----------|------|-------|-------|
| 1 | Publicar iOS na App Store | R$ 545/ano | Agora |
| 2 | Publicar Android no Google Play | R$ 145 único | Próximas semanas |
| 3 | Migrar backend para Hetzner (produção) | R$ 35/mês | Antes do 1º cliente |
| 4 | Fechar 2 clientes Starter (break-even) | R$ 0 | Mês 1–2 |
| 5 | Coletar 500 correções para dataset | R$ 0 | Mês 1–3 |
| 6 | Treinar modelo próprio (resolver YOLO) | R$ 0 | Mês 3–4 |
| 7 | Chegar a 10 clientes (sustento próprio) | R$ 0 | Mês 4–6 |

---

*Cotação: USD 1 = R$ 5,80 · Gerado em 16/04/2026 · Revisar trimestralmente*
