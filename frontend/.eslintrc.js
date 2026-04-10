module.exports = {
  root: true,
  extends: [
    '@react-native',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    // ── Qualidade de código ─────────────────────────────────────────────────
    'no-var': 'error',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-shadow': 'error',
    'no-duplicate-imports': 'error',
    'no-return-await': 'error',

    // ── Console ─────────────────────────────────────────────────────────────
    // Permite console.error (usado para logging de erros), proíbe console.log em produção
    'no-console': ['warn', { allow: ['error', 'warn'] }],

    // ── React ────────────────────────────────────────────────────────────────
    'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
    // Inline styles são aceitos no projeto (padrão React Native)
    'react-native/no-inline-styles': 'off',
    'react/self-closing-comp': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // ── Imports ──────────────────────────────────────────────────────────────
    'no-restricted-imports': [
      'error',
      {
        // Proíbe imports diretos do Firebase fora dos services/config
        // (garante que todo acesso ao Firebase passe pelos services)
        patterns: [
          {
            group: ['firebase/auth', 'firebase/firestore', 'firebase/storage'],
            importNames: ['*'],
            message:
              'Importe Firebase apenas dentro de src/services/ ou src/config/. Use os services para acessar Firebase.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // Relaxa a restrição de imports para os services e config que DEVEM importar Firebase
      files: [
        'src/services/**/*.js',
        'src/config/**/*.js',
        'src/navigation/**/*.js',
      ],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
    {
      // Nos testes, permite console.log e acesso mais livre
      files: ['**/__tests__/**', '**/*.test.{js,jsx,ts,tsx}'],
      rules: {
        'no-console': 'off',
        'no-restricted-imports': 'off',
      },
    },
  ],
};
