/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/final-project-analisis-pengujian-sistem-if7a-maruf/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/setupTests.ts',
  testTimeout: 15000,

  include: [
    'src/tests/**/*.test.ts',
    'src/tests/**/*.test.tsx',
  ],

  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],

    // HANYA source code, bukan test
    include: [
      'src/components/**/*.{ts,tsx}',
      'src/pages/**/*.{ts,tsx}',
      'src/context/**/*.{ts,tsx}',
      'src/services/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/utils/**/*.{ts,tsx}',
      'src/App.tsx'
    ],

    exclude: [
      '**/*.test.ts',
      '**/*.test.tsx',
      'src/tests/**',
      'src/setupTests.ts',
      'src/services/__mocks__/**',
      'src/index.tsx',
      'src/types.ts',
      '**/*.css',
      '**/*.d.ts',
      '**/*.md'
    ]
  }
}
    };
});
