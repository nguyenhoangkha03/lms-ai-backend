module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts',
  transform: {
    '^.+\\.(t|j)s': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapping: {
    '^@/(.*)': '<rootDir>/$1',
    '^@/common/(.*)': '<rootDir>/common/$1',
    '^@/config/(.*)': '<rootDir>/config/$1',
    '^@/modules/(.*)': '<rootDir>/modules/$1',
    '^@/database/(.*)': '<rootDir>/database/$1',
  },
};
