const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Next.js アプリのディレクトリのパスを指定
  dir: './',
});

// Jest のカスタム設定を追加
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

// createJestConfig は非同期なので、次のように記述
module.exports = createJestConfig(customJestConfig);
