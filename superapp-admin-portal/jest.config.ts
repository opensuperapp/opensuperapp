import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)$': '<rootDir>/test/__mocks__/fileMock.js',
  // Map Vite-specific service to a Jest-friendly variant
  '^(?:.+/)?services/api\\.service$': '<rootDir>/src/components/tests/unit_tests/api.service.jest.ts',
  '^src/services/api\\.service$': '<rootDir>/src/components/tests/unit_tests/api.service.jest.ts',
  '^\\./api\\.service$': '<rootDir>/src/components/tests/unit_tests/api.service.jest.ts',
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
};

export default config;
