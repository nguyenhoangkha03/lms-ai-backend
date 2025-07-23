module.exports = {
  // Basic configuration
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  // Coverage configuration
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.e2e-spec.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/database/migrations/**',
    '!src/database/seeds/**',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test environment
  testEnvironment: 'node',

  // Module name mapping for path aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/common/(.*)$': '<rootDir>/common/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1',
    '^@/modules/(.*)$': '<rootDir>/modules/$1',
    '^@/database/(.*)$': '<rootDir>/database/$1',
    '^@/cache/(.*)$': '<rootDir>/cache/$1',
    '^@/logger/(.*)$': '<rootDir>/logger/$1',
    '^@/decorators/(.*)$': '<rootDir>/decorators/$1',
    '^@/validators/(.*)$': '<rootDir>/validators/$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],

  // Timeout configuration
  testTimeout: 10000,

  // Parallel test execution
  maxWorkers: '50%',

  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/../.jest-cache',

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/../node_modules/',
    '<rootDir>/../dist/',
    '<rootDir>/../coverage/',
  ],

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit.xml',
        suiteName: 'LMS AI Backend Tests',
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './test-results',
        filename: 'report.html',
        expand: true,
      },
    ],
  ],

  // Test match patterns
  testMatch: ['**/__tests__/**/*.(t|j)s', '**/*.(test|spec).(t|j)s'],

  // Global test variables
  globals: {
    'ts-jest': {
      tsconfig: {
        compilerOptions: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    },
  },
};
