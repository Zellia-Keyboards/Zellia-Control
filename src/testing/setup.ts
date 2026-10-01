import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Vitest globals are off, so Testing Library cannot register its automatic cleanup.
afterEach(cleanup);

// The vendored controller logs every dynamic key it reads during a load (controller.ts:835);
// restoreMocks (vite.config.ts) restores the real console.debug after each test.
beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
});
