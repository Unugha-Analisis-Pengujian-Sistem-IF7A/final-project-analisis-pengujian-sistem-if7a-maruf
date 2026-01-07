import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock crypto.randomUUID for ToastContext
let uuidCounter = 0;

// eslint-disable-next-line no-undef
if (!globalThis.crypto) {
  // eslint-disable-next-line no-undef
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => `test-uuid-${++uuidCounter}`,
    },
    writable: true,
    configurable: true,
  });
} else if (!globalThis.crypto.randomUUID) {
  // eslint-disable-next-line no-undef
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: () => `test-uuid-${++uuidCounter}`,
    writable: true,
    configurable: true,
  });
}

// Mock window.scrollTo
// eslint-disable-next-line no-undef
Object.defineProperty(globalThis, 'scrollTo', {
  value: vi.fn(),
  writable: true
});

// Mock global Google Maps if needed
global.google = {
  maps: {
    Map: vi.fn(),
    Marker: vi.fn(),
    InfoWindow: vi.fn(),
  },
} as any;
