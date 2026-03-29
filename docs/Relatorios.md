---

### `docs/Relatorios.md`
```markdown
# Relatórios

## Relatório de evolução técnica (MVP)

### Etapas concluídas
- Estrutura base do app React Native + Expo
- Integração Firebase (Auth, Storage, Firestore)
- Criação da Cloud Function `analyzeInventory`
- Proteção da chave da IA via Secret Manager
- Integração da função com Anthropic
- Padronização de retorno JSON
- Testes de ponta a ponta com app

### Pendências
- Ativar/balancear billing da Anthropic para testes contínuos
- Melhorias de UX para mensagens de erro
- Ajustes finos de precisão da classificação/contagem
- Documentação complementar de arquitetura

## Riscos mapeados
- Custo por chamadas de IA
- Dependência de conectividade
- Variação na resposta da IA (necessidade de fallback)