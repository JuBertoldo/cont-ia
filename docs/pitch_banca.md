# Cont.IA — Pitch para Banca de TCC
### Roteiro completo · Slides · Perguntas esperadas

---

## ESTRUTURA DA APRESENTAÇÃO (10–15 minutos)

```
Slide 1  — Abertura e hook                    (1 min)
Slide 2  — O problema                         (1.5 min)
Slide 3  — A solução                          (1 min)
Slide 4  — Como funciona (demo)               (2 min)
Slide 5  — Arquitetura técnica                (1.5 min)
Slide 6  — Diferenciais                       (1 min)
Slide 7  — Modelo de negócio                  (1.5 min)
Slide 8  — Validação e resultados             (1 min)
Slide 9  — Próximos passos                    (1 min)
Slide 10 — Encerramento                       (30 seg)
```

---

## SLIDE 1 — ABERTURA

### Título na tela
```
CONT.IA
Inteligência que conta.
```

### Fala (abertura com gancho)
> "Levantem a mão quem já viu alguém contar estoque na prancheta,
> anotando item por item, na mão, correndo o risco de errar a conta
> no final do dia."
>
> *(pausa)*
>
> "Esse é um problema de décadas que ainda acontece todos os dias
> em mercearias, distribuidoras e atacados do Amazonas.
> O Cont.IA veio resolver isso."

---

## SLIDE 2 — O PROBLEMA

### Conteúdo visual sugerido
```
❌ Contagem manual → erros de 5 a 15% no estoque
❌ Sem foto → impossível auditar depois
❌ Sem histórico → perda de rastreabilidade
❌ Tempo perdido → 4 a 8 horas por auditoria de médio porte
```

### Fala
> "Uma pesquisa da NRF — National Retail Federation — mostra que
> erros de inventário custam às empresas em média 1,5% do faturamento
> anual. Para uma distribuidora que fatura R$ 500 mil por mês,
> isso é R$ 90 mil perdidos por ano só em imprecisão de estoque.
>
> O processo atual é: uma pessoa com uma prancheta, uma caneta
> e uma lista. Sem evidência, sem foto, sem rastreio.
> Se der errado, não tem como provar o que aconteceu.
>
> É exatamente esse problema que o Cont.IA resolve."

---

## SLIDE 3 — A SOLUÇÃO

### Conteúdo visual sugerido
```
           📱 Fotografa
              ↓
           🤖 IA identifica e conta
              ↓
           ✅ Confirma ou corrige
              ↓
           📊 Histórico + foto + GPS salvo
```

### Fala
> "O Cont.IA transforma um smartphone em um auditor inteligente.
>
> O operador simplesmente fotografa os itens.
> A Inteligência Artificial identifica o que está na foto,
> conta automaticamente e registra tudo — com a foto como evidência,
> a localização GPS e o nome de quem fez a contagem.
>
> Se a IA errar, o operador corrige com um toque.
> Essa correção não é jogada fora — ela vira dado de treinamento
> para o modelo ficar cada vez mais preciso."

---

## SLIDE 4 — DEMONSTRAÇÃO (MOSTRAR O APP)

### O que mostrar ao vivo
```
1. Abrir o app no iPhone → tela de scanner
2. Fotografar algo na sala (garrafa de água, caneta, copo)
3. Mostrar o resultado: recorte de cada objeto + label + %
4. Corrigir um label errado (toque no chip → digitar nome correto)
5. Confirmar → mostrar o histórico aparecendo em tempo real
6. Abrir o CSV exportado mostrando os dados estruturados
```

### Fala durante a demo
> "Vou mostrar funcionando ao vivo.
>
> *(abre o app)*
> Essa é a tela de scanner. Vou fotografar...
>
> *(tira a foto)*
> Em segundos a IA processou. Olhem aqui — cada objeto identificado
> tem o recorte exato de onde ele está na foto, o nome e a
> porcentagem de confiança da detecção.
>
> *(corrige um label)*
> Se eu não concordar com o nome, toco aqui e corrijo.
> Essa correção fica registrada para treinar o modelo futuramente.
>
> *(confirma)*
> Confirmei — agora o histórico atualiza em tempo real.
> Está salvo com a foto, o GPS e os dados do operador."

---

## SLIDE 5 — ARQUITETURA TÉCNICA

### Conteúdo visual sugerido
```
📱 React Native (iOS + Android)
        │
        ├─────────────────────────────┐
        ▼                             ▼
🔥 Firebase                    ⚙️ Backend (FastAPI + Docker)
   Auth · Firestore                   │
   Storage · Messaging          ┌─────┴─────┐
                                ▼           ▼
                            YOLO11      Roboflow
                          (local CPU)  (API nuvem)
                                │           │
                                └─────┬─────┘
                                      ▼
                               Ensemble NMS
                               (merge inteligente)
```

### Fala
> "Por dentro, o Cont.IA usa dois modelos de IA ao mesmo tempo.
>
> O primeiro é o YOLO11 — modelo de detecção de objetos de última geração
> rodando no próprio servidor. O segundo é o Roboflow RF-DETR,
> uma API de visão computacional na nuvem especializada em contagem.
>
> Os dois rodam em paralelo e os resultados são combinados por um
> algoritmo chamado NMS — Non-Maximum Suppression — que elimina
> duplicatas e retorna o melhor resultado.
>
> Tudo isso acontece em menos de 2 segundos."

---

## SLIDE 6 — DIFERENCIAIS

### Conteúdo visual sugerido
```
             CONT.IA           CONCORRÊNCIA
             ───────           ────────────
Identificação  IA automática   Cadastro manual
Evidência      Foto auditável  Nenhuma
Aprendizado    Auto-treino     Não existe
Suporte        SLA por tipo    E-mail genérico
Segurança      4 perfis        Admin/user
```

### Fala
> "O que diferencia o Cont.IA não é só a IA — é o ciclo completo.
>
> A maioria dos sistemas de inventário exige que alguém cadastre
> cada produto antes de usar. O Cont.IA não precisa de nada disso.
> Aponta, fotografa, pronto.
>
> Mas o diferencial mais único é o auto-aprendizado.
> Cada vez que um operador corrige um label errado da IA,
> essa correção é salva. O Super Admin valida as correções.
> Com 100 imagens validadas, treinamos um modelo especializado
> nos produtos daquela empresa — no Google Colab, gratuitamente.
>
> Nenhum concorrente direto no Brasil tem esse ciclo."

---

## SLIDE 7 — MODELO DE NEGÓCIO

### Conteúdo visual sugerido
```
SaaS — Assinatura mensal

Starter   R$ 197   até 5 usuários   mercearia
Pro       R$ 297   até 10 usuários  farmácia
Business  R$ 497   até 20 usuários  distribuidora
Enterprise R$ 997  até 56 usuários  rede/franquia

Break-even:  2 clientes Starter
Margem:      77 a 80% líquida
Custo fixo:  R$ 204/mês (servidor + ferramentas)
```

### Fala
> "O modelo de negócio é SaaS — Software como Serviço.
> O cliente paga uma mensalidade e usa sem instalar nada.
>
> Temos 4 planos baseados no tamanho da equipe.
> O plano Starter, de R$ 197 por mês, atende uma mercearia
> com até 5 pessoas.
>
> O custo operacional fixo é de R$ 204 por mês — servidor,
> ferramentas, domínio. Com 2 clientes Starter, o produto
> já paga a si mesmo.
>
> A margem líquida após impostos e gateway de pagamento
> fica entre 77 e 80% por cliente — padrão de SaaS maduro.
>
> Projeção conservadora: com 31 clientes ao fim do primeiro ano,
> o MRR alcança R$ 8.800 mensais."

---

## SLIDE 8 — VALIDAÇÃO E RESULTADOS

### Conteúdo visual sugerido
```
✅ Testado em iPhone (dispositivo real — Juliana)
✅ 48 testes automatizados — 100% passando
✅ Detectou: keyboard, bottle, cup, scissors, cell phone...
✅ 20 telas implementadas
✅ 7 coleções Firestore em produção
✅ 14 diagramas UML documentados
✅ 4 documentos financeiros gerados
```

### Fala
> "O Cont.IA não é um protótipo de papel.
>
> Foi testado em dispositivo físico real — esse iPhone aqui.
> Tem 48 testes automatizados passando, 20 telas implementadas,
> toda a comunicação com Firebase em produção.
>
> Detectamos garrafas, teclados, tesouras, celulares, copos —
> objetos reais em ambientes reais, com iluminação real.
>
> O sistema de documentação inclui 14 diagramas UML cobrindo
> casos de uso, arquitetura, sequência, estados — documentação
> no nível de produto comercial, não de TCC."

---

## SLIDE 9 — PRÓXIMOS PASSOS

### Conteúdo visual sugerido
```
Imediato (0–3 meses)
  → Publicar App Store + Google Play
  → Primeiro cliente piloto em Manaus
  → Coletar 100 correções para treinar modelo próprio

Médio prazo (3–6 meses)
  → Modelo YOLO especializado por segmento
  → Gateway de pagamento recorrente
  → Expansão para outros estados do Norte

Longo prazo (6–12 meses)
  → 31 clientes → MRR R$ 8.800
  → Funcionalidade de RFID/QR Code
  → API para integração com ERP
```

### Fala
> "O produto está pronto para ir ao mercado.
>
> Os próximos passos são publicar nas lojas — Apple App Store
> e Google Play — e fechar o primeiro cliente piloto em Manaus.
>
> Em paralelo, cada scan feito no piloto alimenta o dataset
> de treinamento. Em 3 meses temos dados suficientes para
> treinar um modelo especializado em produtos do comércio local.
>
> A meta conservadora para 12 meses é 31 clientes,
> gerando R$ 8.800 de receita mensal recorrente —
> sem investidor externo, sustentado pela própria operação."

---

## SLIDE 10 — ENCERRAMENTO

### Conteúdo visual sugerido
```
CONT.IA

"Fotografe. A IA conta.
 Você foca no que importa."

github.com/JuBertoldo/cont-ia
```

### Fala
> "O Cont.IA resolve um problema real, de um jeito que nenhum
> sistema no mercado brasileiro resolve hoje — com IA que aprende
> com as correções do próprio cliente.
>
> Obrigada pela atenção. Estou à disposição para perguntas."

---

## PERGUNTAS PROVÁVEIS DA BANCA E RESPOSTAS

---

### "Por que usar dois modelos de IA ao mesmo tempo?"

> "Cada modelo tem pontos fortes diferentes. O YOLO11 é extremamente
> rápido e eficiente em objetos comuns do COCO dataset. O Roboflow
> RF-DETR é especialista em contagem de objetos específicos.
> Combinando os dois com NMS, eliminamos os falsos positivos de um
> e compensamos os pontos cegos do outro. O resultado é mais preciso
> do que qualquer um dos dois sozinho."

---

### "Como vocês garantem a privacidade das fotos dos clientes?"

> "As fotos ficam no Firebase Storage do próprio projeto — não
> são compartilhadas com terceiros. O acesso é controlado por
> regras Firestore granulares: cada empresa só acessa seus próprios
> dados. O Super Admin tem acesso global, mas é identificado em todo
> acesso. Além disso, implementamos Firebase Auth com JWT em todas
> as requisições ao backend."

---

### "E se o cliente não tiver internet?"

> "O app usa o Firebase SDK, que tem cache local nativo. O usuário
> consegue ver o histórico offline. O scanner precisa de internet
> para processar as imagens no backend — mas na prática, qualquer
> conexão 4G é suficiente, o processamento leva menos de 2 segundos."

---

### "Como o modelo aprende? Vocês retreinam continuamente?"

> "Não é retreinamento contínuo — isso seria inviável em produção.
> O ciclo é: coleta passiva de correções dos usuários → curadoria
> do Super Admin → quando acumula 100+ imagens validadas → treino
> manual no Google Colab com GPU gratuita → deploy do novo modelo.
> É o que a indústria chama de 'active learning' — supervisionado,
> com custo próximo de zero."

---

### "Qual é a precisão atual da detecção?"

> "O modelo atual é o YOLO11m pré-treinado no dataset COCO —
> reconhece 80 classes de objetos comuns com precisão mAP50 acima
> de 0.5 para a maioria das classes. Para objetos específicos do
> comércio local que não estão no COCO — como garrafas de marcas
> regionais — a precisão melhora drasticamente com o modelo próprio
> que treinamos com os dados reais dos clientes."

---

### "Por que não usar só o ChatGPT ou uma API pronta?"

> "APIs de visão geral como GPT-4V são lentas (2–5 segundos por
> imagem), caras (centavos por chamada que somam muito em uso intenso)
> e não são especializadas em contagem. O YOLO local é milissegundos,
> sem custo por chamada, e a precisão em detecção de objetos é superior.
> A estratégia é usar a ferramenta certa para cada problema."

---

### "Como vocês pretendem competir com grandes ERPs?"

> "Não competimos — complementamos. Grandes ERPs como TOTVS ou SAP
> são sistemas de gestão empresarial complexos e caros. O Cont.IA
> é uma camada de coleta de dados de inventário que pode exportar
> CSV e futuramente integrar via API com qualquer ERP.
> Nosso público inicial são PMEs que não podem pagar R$ 5.000/mês
> por um ERP — elas podem pagar R$ 197."

---

### "O que acontece se o Roboflow ou o Firebase ficar fora do ar?"

> "O sistema foi construído com degradação graciosa — graceful degradation.
> Se o Roboflow falha, o sistema usa só o YOLO local e continua
> funcionando. Se o Firebase Storage fica fora, a foto não é salva
> mas o scan é registrado sem foto. O usuário sempre vê uma resposta,
> nunca uma tela de erro sem explicação."

---

### "O modelo é seu ou da Ultralytics?"

> "Essa é uma pergunta excelente e mostra que a banca leu a documentação.
> O modelo YOLO11 usa licença AGPL-3.0, que exige código aberto para
> uso comercial. Nossa estratégia é treinar um modelo próprio com os
> dados dos clientes — aí a licença é nossa. Documentamos isso no projeto
> como prioridade antes do primeiro contrato comercial.
> Para fins acadêmicos, estamos em conformidade pois não estamos cobrando."

---

## DICAS PARA A APRESENTAÇÃO

### Linguagem
- Use palavras simples para explicar a IA: "a câmera aprende a contar"
- Evite siglas sem explicar: NMS = "elimina duplicatas", YOLO = "modelo de visão computacional"
- Fale em benefícios para o cliente, não em tecnologia

### Demo ao vivo
- Teste o app antes com Wi-Fi da sala garantido
- Tenha uma foto salva no celular como backup se a câmera falhar
- Deixe o backend e o ngrok rodando antes de entrar na sala

### Postura
- A banca vai tentar achar o ponto fraco — está tudo documentado, confie no produto
- "Não sei, mas está documentado para implementação futura" é uma resposta válida
- Mostrar o app funcionando ao vivo vale mais do que qualquer slide

### O que NÃO dizer
- ❌ "É só um protótipo" — é um MVP completo testado em produção
- ❌ "Ainda não está pronto" — está pronto, tem pendências de publicação nas lojas
- ❌ "A IA não é perfeita" — nenhuma IA é, e vocês têm o ciclo de correção para isso

---

*Pitch preparado em 16/04/2026 · Cont.IA TCC*
