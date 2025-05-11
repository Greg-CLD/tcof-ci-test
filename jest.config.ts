
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@db': '<rootDir>/db/index.ts',
    '@shared/(.*)': '<rootDir>/shared/$1',
  },
  testMatch: ['**/tests/smoke/**/*.spec.ts'],
  setupFiles: ['<rootDir>/tests/smoke/setup.ts'],
};

export default config;
