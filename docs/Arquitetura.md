# Arquitetura do Cont.IA

## Visão Geral
O **Cont.IA** utiliza arquitetura cliente-servidor com processamento de IA no backend para proteger a chave da API, centralizar regras de negócio e facilitar manutenção.

## Componentes

- **App Mobile (Expo / React Native)**
  - Captura imagem
  - Extrai labels/objetos
  - Chama Cloud Function
  - Exibe e persiste resultado

- **Firebase Authentication**
  - Controle de acesso por usuário autenticado

- **Firebase Cloud Functions (`analyzeInventory`)**
  - Recebe payload (`labels`, `objects`)
  - Monta prompt estruturado
  - Consulta Anthropic API
  - Retorna JSON padronizado

- **Firebase Secret Manager**
  - Armazena com segurança o segredo `ANTHROPIC_API_KEY`

- **Anthropic API (Claude)**
  - Interpreta labels/objetos e retorna classificação estruturada

- **Firestore**
  - Armazena resultados da auditoria e metadados

- **Firebase Storage**
  - Armazena imagens capturadas durante a auditoria

---

## Fluxo de dados (alto nível)

```mermaid
flowchart TD
  A[Usuário captura imagem no app] --> B[App extrai labels/objects]
  B --> C[Chamada Callable: analyzeInventory]
  C --> D[Cloud Function valida auth e entrada]
  D --> E[Cloud Function usa ANTHROPIC_API_KEY do Secret Manager]
  E --> F[Anthropic API processa e retorna JSON]
  F --> G[Cloud Function normaliza resposta]
  G --> H[App exibe resultado]
  H --> I[Firestore salva metadados]
  H --> J[Storage salva imagem]

---

sequenceDiagram
  participant U as Usuário/App
  participant F as Firebase Function
  participant S as Secret Manager
  participant A as Anthropic API

  U->>F: onCall({labels, objects}) + auth
  F->>F: valida autenticação
  F->>F: valida/sanitiza payload
  F->>S: obtém ANTHROPIC_API_KEY
  S-->>F: chave segura
  F->>A: messages.create(prompt)
  A-->>F: resposta textual JSON
  F->>F: limpeza + parse + fallback
  F-->>U: {item, classificacao, quantidade, repetidos, descricao, local}

---

Segurança
A chave da Anthropic não fica no app
O segredo fica no Firebase Secret Manager
A Cloud Function exige usuário autenticado (request.auth)
Erros são tratados de forma controlada com HttpsError
Logs ficam centralizados no backend para auditoria técnica

---

Decisões técnicas importantes
IA no backend para segurança e governança de custo
Resposta JSON padronizada para facilitar integração no app
Fallbacks para entradas vazias e respostas inválidas
Validação e normalização de dados antes de retornar ao cliente
Separação de responsabilidades entre app, backend e persistência

---

Melhorias futuras
Implementar rate limiting por usuário
Criar cache para respostas de imagens semelhantes
Monitorar métricas de custo por chamada
Adicionar testes automatizados da Cloud Function
Ajustar prompt para maior precisão em quantidade/repetição
Criar painel de observabilidade (erros, tempo de resposta, volume)