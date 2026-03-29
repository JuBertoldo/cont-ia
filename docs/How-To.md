---

### `docs/How-To.md`
```markdown
# How-To (Operação do Sistema)

## Como executar o fluxo principal
1. Abrir o app no dispositivo mobile
2. Fazer login
3. Capturar imagem de um item
4. Processar auditoria
5. Visualizar retorno da IA:
   - item
   - classificacao
   - quantidade
   - repetidos
   - descricao
   - local

## Como atualizar a função de IA
1. Editar `functions/index.js`
2. Deploy:
```bash
firebase deploy --only functions:analyzeInventory