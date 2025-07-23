module.exports = {
  ...require('./jest.config.js'),

  // CI-specific configurations
  ci: true,
  coverage: true,
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Parallel execution
  maxWorkers: '50%',

  // Test results
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-results',
        filename: 'report.html',
      },
    ],
  ],

  // Timeouts for CI
  testTimeout: 30000,

  // Bail on failures
  bail: false,

  // Verbose output
  verbose: true,
};
