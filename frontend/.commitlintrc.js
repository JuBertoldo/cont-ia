module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipos permitidos (Conventional Commits)
    'type-enum': [
      2,
      'always',
      [
        'feat',     // nova funcionalidade
        'fix',      // correção de bug
        'refactor', // refatoração sem mudança de comportamento
        'test',     // adição ou correção de testes
        'docs',     // documentação
        'style',    // formatação, sem mudança de lógica
        'chore',    // tarefas de manutenção (deps, config)
        'perf',     // melhoria de performance
        'ci',       // mudanças em CI/CD
        'revert',   // revertendo commit anterior
      ],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'subject-min-length': [2, 'always', 10],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 120],
  },
};
