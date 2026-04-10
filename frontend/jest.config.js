module.exports = {
  preset: 'react-native',

  // ── Cobertura de testes (QC) ─────────────────────────────────────────────
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/config/**',
    '!src/constants/**',
    '!src/navigation/**',
  ],

  coverageThreshold: {
    global: { lines: 60, functions: 60, branches: 50, statements: 60 },
    './src/services/': { lines: 70, functions: 70 },
    './src/hooks/': { lines: 70, functions: 70 },
    './src/utils/': { lines: 80, functions: 80 },
  },

  coverageReporters: ['text', 'lcov', 'html'],

  // ── Mocks de módulos nativos ─────────────────────────────────────────────
  moduleNameMapper: {
    '^react-native-image-picker$': '<rootDir>/__mocks__/react-native-image-picker.js',
    '^react-native-fs$': '<rootDir>/__mocks__/react-native-fs.js',
    '^react-native-share$': '<rootDir>/__mocks__/react-native-share.js',
    '^react-native-config$': '<rootDir>/__mocks__/react-native-config.js',
    '^react-native-vector-icons/(.*)$': '<rootDir>/__mocks__/react-native-vector-icons.js',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
    '^react-native-gesture-handler$':
      '<rootDir>/__mocks__/react-native-gesture-handler.js',
    '^react-native-safe-area-context$':
      '<rootDir>/node_modules/react-native-safe-area-context/jest/mock.tsx',
  },

  // ── Transformações ───────────────────────────────────────────────────────
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|firebase|@firebase|react-native-vector-icons|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context)/)',
  ],

  testTimeout: 10000,
};
