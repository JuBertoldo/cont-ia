# Cont.IA — Estudo de Crescimento Conservador
### Projeção 12 Meses · Sem Investidores · Vendas Diretas PMEs Amazonas

---

> **Cotação:** USD 1 = R$ 5,80  
> **Regime:** Simples Nacional — Anexo III (6% sobre receita bruta)  
> **Gateway de pagamento:** 3,5% por transação  
> **Churn (cancelamentos):** 3%/mês estimado  
> **Crescimento:** orgânico — indicações + abordagem direta  
> **YOLO:** modelo próprio treinado (custo zero a partir do mês 4)

---

## PLANOS E PREÇOS

| Plano | Usuários | Preço bruto | Receita líquida* |
|-------|----------|-------------|-----------------|
| Starter | até 5 | R$ 197 | R$ 172 |
| Pro | até 10 | R$ 297 | R$ 260 |
| Business | até 20 | R$ 497 | R$ 435 |
| Enterprise | ilimitado | R$ 997 | R$ 872 |

*Após 9,5% (6% Simples + 3,5% gateway)

---

## CUSTO OPERACIONAL MENSAL FIXO

| Serviço | R$/mês |
|---------|--------|
| Servidor (Hetzner CX22) | R$ 34,80 |
| Apple Developer | R$ 47,85 |
| Domínio + Cloudflare | R$ 5,22 |
| Claude Code (manutenção) | R$ 116,00 |
| **Total fixo/mês** | **R$ 203,87** |

---

## PROJEÇÃO MÊS A MÊS

### Mix conservador assumido
> 60% Starter · 25% Pro · 12% Business · 3% Enterprise

| Mês | Novos | Total | Starter | Pro | Business | Enterprise | MRR Bruto | MRR Líquido* | Custo op. | **Lucro/mês** |
|-----|-------|-------|---------|-----|----------|-----------|-----------|-------------|-----------|--------------|
| 1 | 2 | 2 | 2 | — | — | — | R$ 394 | R$ 344 | R$ 204 | **R$ 140** |
| 2 | 1 | 3 | 3 | — | — | — | R$ 591 | R$ 516 | R$ 204 | **R$ 312** |
| 3 | 2 | 5 | 3 | 1 | 1 | — | R$ 1.385 | R$ 1.211 | R$ 208 | **R$ 1.003** |
| 4 | 2 | 7 | 4 | 2 | 1 | — | R$ 1.879 | R$ 1.643 | R$ 212 | **R$ 1.431** |
| 5 | 3 | 10 | 6 | 2 | 1 | 1 | R$ 3.070 | R$ 2.686 | R$ 218 | **R$ 2.468** |
| 6 | 2 | 12 | 7 | 3 | 1 | 1 | R$ 3.464 | R$ 3.031 | R$ 222 | **R$ 2.809** |
| 7 | 3 | 15 | 9 | 4 | 1 | 1 | R$ 4.154 | R$ 3.635 | R$ 230 | **R$ 3.405** |
| 8 | 3 | 18 | 11 | 4 | 2 | 1 | R$ 4.748 | R$ 4.154 | R$ 237 | **R$ 3.917** |
| 9 | 3 | 21 | 13 | 5 | 2 | 1 | R$ 5.638 | R$ 4.933 | R$ 248 | **R$ 4.685** |
| 10 | 3 | 24 | 14 | 6 | 3 | 1 | R$ 6.725 | R$ 5.884 | R$ 262 | **R$ 5.622** |
| 11 | 4 | 28 | 17 | 7 | 3 | 1 | R$ 7.812 | R$ 6.835 | R$ 278 | **R$ 6.557** |
| 12 | 3 | 31 | 19 | 8 | 3 | 1 | R$ 8.408 | R$ 7.357 | R$ 286 | **R$ 7.071** |

*MRR Líquido = bruto após 9,5% de impostos e gateway

---

## CHECKPOINTS 3 · 6 · 12 MESES

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CRESCIMENTO CONSERVADOR                          │
│              Vendas diretas · PMEs Amazonas · Sem investidor        │
├─────────────────┬─────────────────────────┬─────────────────────────┤
│    3 MESES      │       6 MESES           │      12 MESES           │
│                 │                         │                         │
│   5 clientes    │     12 clientes         │     31 clientes         │
│                 │                         │                         │
│  MRR R$ 1.385  │    MRR R$ 3.464         │    MRR R$ 8.408         │
│  ARR R$ 16.620 │    ARR R$ 41.568        │    ARR R$ 100.896       │
│                 │                         │                         │
│  Lucro R$ 1.003│    Lucro R$ 2.809       │    Lucro R$ 7.071       │
│  Margem: 72%   │    Margem: 81%          │    Margem: 84%          │
└─────────────────┴─────────────────────────┴─────────────────────────┘
```

---

## COMPARATIVO COM PROJEÇÃO ANTERIOR (todos Starter)

| Checkpoint | Slide anterior (100% Starter) | Nosso modelo (mix real) | Diferença |
|-----------|-------------------------------|------------------------|-----------|
| 3 meses (5 clientes) | R$ 985 MRR | **R$ 1.385 MRR** | +R$ 400 (+41%) |
| 6 meses (12 clientes) | R$ 2.364 MRR | **R$ 3.464 MRR** | +R$ 1.100 (+47%) |
| 12 meses (31 clientes) | R$ 6.107 MRR | **R$ 8.408 MRR** | +R$ 2.301 (+38%) |

> A diferença existe porque mesmo no cenário conservador,
> alguns clientes naturalmente contratam Pro ou Business.

---

## BREAK-EVEN E SUSTENTABILIDADE

### Quando o app paga as próprias contas

| Marco | Quando acontece | O que garante |
|-------|----------------|---------------|
| Paga servidor | **Mês 1** (2 Starter) | Operação no ar |
| Break-even completo | **Mês 1** (lucro R$ 140) | Sem prejuízo desde o início |
| Pró-labore R$ 2.000/mês | **Mês 5** | Sustento parcial |
| Pró-labore R$ 3.500/mês | **Mês 7** | Sustento confortável |
| Pró-labore R$ 5.000/mês | **Mês 10** | Dedicação integral |
| Pró-labore R$ 7.000/mês | **Mês 12** | Expansão / contratação |

---

## ACUMULADO AO FINAL DE CADA PERÍODO

| Período | Receita bruta acumulada | Custo acumulado | **Lucro acumulado** |
|---------|------------------------|-----------------|---------------------|
| 3 meses | R$ 7.140 | R$ 1.836 | **R$ 5.304** |
| 6 meses | R$ 26.754 | R$ 4.572 | **R$ 22.182** |
| 12 meses | R$ 72.036 | R$ 10.008 | **R$ 62.028** |

---

## MARGENS DE LUCRO POR PERÍODO

| Período | Receita bruta | Custos totais | Margem bruta | Impostos+gateway | **Margem líquida** |
|---------|--------------|--------------|--------------|-----------------|-------------------|
| 3 meses | R$ 7.140 | R$ 1.836 | 74% | R$ 678 | **65%** |
| 6 meses | R$ 26.754 | R$ 4.572 | 83% | R$ 2.542 | **72%** |
| 12 meses | R$ 72.036 | R$ 10.008 | 86% | R$ 6.843 | **77%** |

---

## QUANTAS AQUISIÇÕES POR MÊS SÃO NECESSÁRIAS

| Meta de lucro/mês | Clientes totais necessários | Novas vendas/mês (com 3% churn) |
|-------------------|-----------------------------|----------------------------------|
| Break-even (pagar contas) | 2 Starter | 1/mês |
| R$ 1.000 lucro/mês | 5–6 clientes | 1–2/mês |
| R$ 2.000 lucro/mês | 8–10 clientes | 2/mês |
| R$ 3.500 lucro/mês | 12–14 clientes | 2–3/mês |
| R$ 5.000 lucro/mês | 18–20 clientes | 3/mês |
| R$ 7.000 lucro/mês | 28–30 clientes | 3–4/mês |

> Com 3% de churn (cancelamento), para chegar a 30 clientes você precisa
> ter adquirido ~38 no acumulado. A taxa de 3 novas vendas/mês é factível
> com abordagem direta em Manaus.

---

## IMPACTO DO YOLO — DOIS CENÁRIOS

### Cenário A — Modelo próprio (recomendado)
Custo adicional: R$ 0  
Prazo: treinar no mês 3–4 com dataset já coletado pelo app

| Período | Lucro | Ação necessária |
|---------|-------|----------------|
| Mês 1–3 | Normal | Coletar correções dos scans |
| Mês 3–4 | Normal | Treinar modelo no Google Colab |
| Mês 5+ | Normal | Modelo próprio rodando, custo zero |

### Cenário B — Licença Ultralytics ($400/mês = R$ 2.320)
Custo adicional: R$ 2.320/mês desde o 1º cliente pago

| Período | Clientes para cobrir só o YOLO | Impacto no lucro |
|---------|-------------------------------|-----------------|
| Mês 1–3 | 14 Starter só para cobrir o YOLO | ❌ Inviável no início |
| Mês 6 | Precisaria de 26 clientes antes de ter lucro | ❌ Não recomendado |
| Mês 12 | Com 31 clientes: lucro cai de R$7.071 para R$4.751 | Viável, mas inferior |

**Conclusão: Cenário A é obrigatório para viabilidade do MVP.**

---

## PLANO DE AQUISIÇÃO MÊS A MÊS

| Mês | Meta de novos clientes | Canal recomendado | Perfil alvo |
|-----|----------------------|-------------------|-------------|
| 1 | 2 Starter | WhatsApp direto / indicação pessoal | Mercearia / mini mercado |
| 2 | 1 Starter | Visita presencial | Papelaria / conveniência |
| 3 | 1 Pro + 1 Business | Indicação do cliente | Farmácia / atacadista pequeno |
| 4 | 2 Pro | Demonstração ao vivo | Distribuidora |
| 5 | 2 Pro + 1 Enterprise | Parceiro comercial | Rede de lojas pequena |
| 6 | 2 Business | LinkedIn / indicação | Atacado médio |
| 7–12 | 3–4/mês | Mix de canais | Consolidar base local |

---

## RESUMO EXECUTIVO

| Indicador | Valor |
|-----------|-------|
| Cotação usada | USD 1 = R$ 5,80 |
| Custo para lançar | R$ 209 (único) |
| Custo mensal fixo | R$ 204 |
| Break-even | Mês 1 (2 Starters) |
| MRR mês 3 | R$ 1.385 |
| MRR mês 6 | R$ 3.464 |
| MRR mês 12 | R$ 8.408 |
| ARR ao final do ano 1 | **R$ 100.896** |
| Lucro acumulado ano 1 | **R$ 62.028** |
| Margem líquida média | **77%** |
| Pró-labore possível no mês 7 | R$ 3.500/mês |
| Novas vendas necessárias/mês | 2–4 |

---

> Projeção conservadora baseada em:  
> — Sem investimento externo  
> — Apenas vendas diretas para PMEs locais no Amazonas  
> — YOLO com modelo próprio (sem custo de licença)  
> — Roboflow desabilitado no MVP  
> — Churn de 3%/mês (realista para mercado local)  

*Gerado em 16/04/2026 · Revisar trimestralmente conforme dados reais*
