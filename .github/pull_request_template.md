## Descrição
<!-- O que foi feito e por quê? -->

## Tipo de mudança
- [ ] `feat` — nova funcionalidade
- [ ] `fix` — correção de bug
- [ ] `refactor` — refatoração sem mudança de comportamento
- [ ] `test` — adição ou correção de testes
- [ ] `chore` — manutenção (deps, config, CI)
- [ ] `docs` — documentação

## Checklist QA — antes de abrir o PR

### Código
- [ ] O código passa no lint sem avisos (`npm run lint` / `ruff check`)
- [ ] O código está formatado (`npm run format:check` / `ruff format --check`)
- [ ] Não há `console.log` ou `print` desnecessários no código de produção
- [ ] Não há credenciais, tokens ou chaves hardcoded
- [ ] Variáveis de ambiente novas foram adicionadas ao `.env.example`

### Testes
- [ ] Testes foram adicionados/atualizados para a mudança
- [ ] Todos os testes existentes passam (`npm test` / `pytest`)
- [ ] Cobertura não caiu abaixo do threshold definido

### Segurança
- [ ] Inputs do usuário são validados antes do uso
- [ ] Não há SQL injection / XSS / IDOR possível
- [ ] Permissões de acesso foram verificadas (regras Firebase / autenticação)

### Backend (se aplicável)
- [ ] Endpoint novo tem resposta documentada no schema Pydantic
- [ ] Erros retornam códigos HTTP corretos (400/422/500)
- [ ] Modelo YOLO não é carregado desnecessariamente

### Frontend (se aplicável)
- [ ] Estados de loading e erro estão cobertos na UI
- [ ] Subscriptions do Firestore são canceladas no `useEffect` cleanup
- [ ] Não há chamadas diretas ao Firebase fora de `src/services/`

## Prints / evidência (opcional)
<!-- Adicione capturas de tela se a mudança afetar UI -->

## Issues relacionadas
<!-- Fecha #123 -->
