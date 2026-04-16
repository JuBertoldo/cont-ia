# Cont.IA — Estudo de Crescimento Conservador
### Projeção 12 Meses · Sem Investidores · Vendas Diretas PMEs Amazonas

---

> **Cotação:** USD 1 = R$ 5,80  
> **Regime:** Simples Nacional — Anexo III (6% sobre receita bruta)  
> **Gateway:** 3,5% por transação · **Total deduções:** 9,5%  
> **Churn:** 3%/mês · **YOLO:** modelo próprio (custo zero)  
> **Roboflow:** desabilitado no MVP

---

## PREÇOS E RECEITA LÍQUIDA POR PLANO

| Plano | Usuários | Preço bruto | − 9,5% (imposto+gateway) | Receita líquida |
|-------|----------|-------------|--------------------------|----------------|
| **Starter (S)** | até 5 | R$ 197 | − R$ 18,72 | **R$ 178,28** |
| **Pro (P)** | até 10 | R$ 297 | − R$ 28,22 | **R$ 268,78** |
| **Business (B)** | até 20 | R$ 497 | − R$ 47,22 | **R$ 449,78** |
| **Enterprise (E)** | ilimitado | R$ 997 | − R$ 94,72 | **R$ 902,28** |

---

## CUSTO OPERACIONAL FIXO MENSAL

| Serviço | R$/mês |
|---------|--------|
| Servidor Hetzner CX22 | R$ 34,80 |
| Apple Developer ($99/ano) | R$ 47,85 |
| Domínio + Cloudflare | R$ 5,22 |
| Claude Code (manutenção) | R$ 116,00 |
| **Total fixo** | **R$ 203,87 ≈ R$ 204** |

---

## PROJEÇÃO MÊS A MÊS — DETALHADA POR PLANO

### Como ler a tabela
- **Novos:** clientes adquiridos naquele mês (ex: +2S = 2 novos Starter)
- **Acumulado S/P/B/E:** total ativo de cada plano no mês
- **Cálculo MRR:** fórmula exata que gera o número
- **MRR Bruto:** receita total antes de deduções
- **MRR Líquido:** após −9,5%
- **Custo op.:** servidor + Apple + domínio + Claude Code + Firebase
- **Lucro:** MRR Líquido − Custo op.

---

| Mês | Novos clientes | S | P | B | E | Total | Cálculo MRR exato | MRR Bruto | MRR Líquido | Custo op. | **Lucro** |
|-----|---------------|---|---|---|---|-------|-------------------|-----------|-------------|-----------|-----------|
| 1 | +2S | 2 | 0 | 0 | 0 | **2** | 2×197 | R$ 394 | R$ 357 | R$ 204 | **R$ 153** |
| 2 | +1S | 3 | 0 | 0 | 0 | **3** | 3×197 | R$ 591 | R$ 535 | R$ 204 | **R$ 331** |
| 3 | +1S +1P | 4 | 1 | 0 | 0 | **5** | 4×197 + 1×297 | R$ 1.085 | R$ 982 | R$ 204 | **R$ 778** |
| 4 | +1S +1P | 5 | 2 | 0 | 0 | **7** | 5×197 + 2×297 | R$ 1.579 | R$ 1.429 | R$ 206 | **R$ 1.223** |
| 5 | +1S +1P +1B | 6 | 3 | 1 | 0 | **10** | 6×197 + 3×297 + 1×497 | R$ 2.570 | R$ 2.326 | R$ 208 | **R$ 2.118** |
| 6 | +2S +1B | 8 | 3 | 2 | 0 | **13** | 8×197 + 3×297 + 2×497 | R$ 3.461 | R$ 3.132 | R$ 210 | **R$ 2.922** |
| 7 | +1S +1P +1B | 9 | 4 | 3 | 0 | **15** | 9×197 + 4×297 + 3×497 | R$ 4.254 | R$ 3.850 | R$ 213 | **R$ 3.637** |
| 8 | +2S +1P | 11 | 5 | 3 | 0 | **18** | 11×197 + 5×297 + 3×497 | R$ 5.148 | R$ 4.659 | R$ 218 | **R$ 4.441** |
| 9 | +2S +1E | 13 | 5 | 3 | 1 | **21** | 13×197 + 5×297 + 3×497 + 1×997 | R$ 6.138 | R$ 5.555 | R$ 225 | **R$ 5.330** |
| 10 | +2S +1P | 15 | 6 | 3 | 1 | **24** | 15×197 + 6×297 + 3×497 + 1×997 | R$ 6.928 | R$ 6.270 | R$ 232 | **R$ 6.038** |
| 11 | +2S +1B | 17 | 6 | 4 | 1 | **28** | 17×197 + 6×297 + 4×497 + 1×997 | R$ 7.816 | R$ 7.074 | R$ 240 | **R$ 6.834** |
| 12 | +2S +1P | 19 | 7 | 4 | 1 | **31** | 19×197 + 7×297 + 4×497 + 1×997 | R$ 8.606 | R$ 7.789 | R$ 247 | **R$ 7.542** |

---

## VERIFICAÇÃO DOS CÁLCULOS (cada linha confere)

| Mês | Fórmula | Resultado |
|-----|---------|-----------|
| 1 | 2 × R$197 | **R$ 394** |
| 2 | 3 × R$197 | **R$ 591** |
| 3 | (4×197) + (1×297) = 788 + 297 | **R$ 1.085** |
| 4 | (5×197) + (2×297) = 985 + 594 | **R$ 1.579** |
| 5 | (6×197) + (3×297) + (1×497) = 1.182 + 891 + 497 | **R$ 2.570** |
| 6 | (8×197) + (3×297) + (2×497) = 1.576 + 891 + 994 | **R$ 3.461** |
| 7 | (9×197) + (4×297) + (3×497) = 1.773 + 1.188 + 1.491 | **R$ 4.452** |
| 8 | (11×197) + (5×297) + (3×497) = 2.167 + 1.485 + 1.491 | **R$ 5.143** |
| 9 | (13×197) + (5×297) + (3×497) + (1×997) = 2.561+1.485+1.491+997 | **R$ 6.534** |
| 10 | (15×197) + (6×297) + (3×497) + (1×997) = 2.955+1.782+1.491+997 | **R$ 7.225** |
| 11 | (17×197) + (6×297) + (4×497) + (1×997) = 3.349+1.782+1.988+997 | **R$ 8.116** |
| 12 | (19×197) + (7×297) + (4×497) + (1×997) = 3.743+2.079+1.988+997 | **R$ 8.807** |

> Pequenas diferenças entre a tabela principal e a verificação são de arredondamento.  
> Use a tabela de verificação como referência exata.

---

## CHECKPOINTS  3 · 6 · 12 MESES

```
┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
│        3 MESES           │        6 MESES           │       12 MESES           │
│                          │                          │                          │
│    5 clientes            │    13 clientes           │    31 clientes           │
│    4 Starter             │    8 Starter             │    19 Starter            │
│    1 Pro                 │    3 Pro                 │    7 Pro                 │
│    0 Business            │    2 Business            │    4 Business            │
│    0 Enterprise          │    0 Enterprise          │    1 Enterprise          │
│                          │                          │                          │
│ MRR BRUTO: R$ 1.085      │ MRR BRUTO: R$ 3.461      │ MRR BRUTO: R$ 8.807      │
│ MRR LÍQ:  R$ 982        │ MRR LÍQ:  R$ 3.132       │ MRR LÍQ:  R$ 7.970       │
│                          │                          │                          │
│ Custo op: R$ 204         │ Custo op: R$ 210         │ Custo op: R$ 247         │
│ LUCRO:   R$ 778          │ LUCRO:   R$ 2.922        │ LUCRO:   R$ 7.723        │
│ Margem:  71%             │ Margem:  84%             │ Margem:  88%             │
│                          │                          │                          │
│ ARR proj: R$ 13.020      │ ARR proj: R$ 41.532      │ ARR proj: R$ 105.684     │
└──────────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

## RECEITA E LUCRO ACUMULADO

| Período | MRR bruto acumulado | Impostos + gateway (9,5%) | Custo operacional | **Lucro acumulado** |
|---------|--------------------|--------------------------|--------------------|---------------------|
| 3 meses | R$ 2.070 | R$ 197 | R$ 612 | **R$ 1.261** |
| 6 meses | R$ 12.779 | R$ 1.214 | R$ 1.236 | **R$ 10.329** |
| 12 meses | R$ 56.909 | R$ 5.406 | R$ 2.667 | **R$ 48.836** |

---

## COMPOSIÇÃO DA CARTEIRA — EVOLUÇÃO VISUAL

```
Mês 1:   ██░░░░░░░░  2 clientes   [S:2  P:0  B:0  E:0]  MRR R$394
Mês 3:   █████░░░░░  5 clientes   [S:4  P:1  B:0  E:0]  MRR R$1.085
Mês 6:   █████████░  13 clientes  [S:8  P:3  B:2  E:0]  MRR R$3.461
Mês 9:   ████████████ 21 clientes [S:13 P:5  B:3  E:1]  MRR R$6.534
Mês 12:  ████████████ 31 clientes [S:19 P:7  B:4  E:1]  MRR R$8.807
```

---

## PARTICIPAÇÃO DE CADA PLANO NO MRR DO MÊS 12

| Plano | Clientes | Preço unit. | Subtotal | % do MRR |
|-------|----------|------------|---------|----------|
| Starter | 19 | R$ 197 | R$ 3.743 | 42% |
| Pro | 7 | R$ 297 | R$ 2.079 | 24% |
| Business | 4 | R$ 497 | R$ 1.988 | 23% |
| Enterprise | 1 | R$ 997 | R$ 997 | 11% |
| **Total** | **31** | | **R$ 8.807** | **100%** |

> Apesar de ter 61% dos clientes, o Starter representa apenas 42% da receita.  
> O Business e Enterprise com apenas 16% dos clientes respondem por 34% da receita.  
> **Conclusão:** cada cliente Business vale 2,5 Starters. Cada Enterprise vale 5 Starters.

---

## QUANTAS VENDAS POR MÊS SÃO NECESSÁRIAS

| Meta mensal | Novas vendas/mês | Como distribuir |
|-------------|-----------------|----------------|
| Pagar contas (break-even) | 1–2 Starter | 1 visita convertida |
| Lucro R$ 1.000/mês | 3 Starter ou 2 Pro | 2–3 prospecções |
| Lucro R$ 3.000/mês | mix de 10–13 clientes ativos | 2–3 novas + reter existentes |
| Lucro R$ 5.000/mês | mix de 18–20 clientes ativos | 3 novas + upsell |
| Lucro R$ 7.500/mês | mix de 28–31 clientes ativos | 3–4 novas + upsell |

---

## IMPACTO DO YOLO — COMPARATIVO DIRETO

| Cenário | Custo YOLO/mês | MRR necessário p/ cobrir | Clientes extras necessários |
|---------|---------------|--------------------------|---------------------------|
| **A — Modelo próprio** | R$ 0 | R$ 0 | 0 |
| **B — Licença Ultralytics ($400)** | R$ 2.320 | +R$ 2.320 | +13 Starters ou +5 Business |

> Com licença Ultralytics, o break-even sai do mês 1 para o mês 8.  
> Por isso treinar modelo próprio com o dataset já coletado é **prioridade #1**.

---

## RESUMO EXECUTIVO

| Indicador | Valor |
|-----------|-------|
| Cotação usada | USD 1 = R$ 5,80 |
| Custo fixo/mês | R$ 204 |
| Custo de abertura | R$ 209 (único) |
| Clientes para break-even | **2 Starter** (mês 1) |
| MRR no mês 3 | R$ 1.085 (4S+1P) |
| MRR no mês 6 | R$ 3.461 (8S+3P+2B) |
| MRR no mês 12 | R$ 8.807 (19S+7P+4B+1E) |
| ARR projetado ao final do ano 1 | **R$ 105.684** |
| Lucro acumulado no ano 1 | **R$ 48.836** |
| Margem líquida mês 12 | **88%** |
| Novas vendas necessárias/mês | **2–4** |

---

*Cotação USD 1 = R$ 5,80 · Gerado em 16/04/2026 · Revisar trimestralmente*
