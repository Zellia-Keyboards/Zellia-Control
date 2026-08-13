import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

/** Screenshots and JSON records of the latest capture run (read by compare.mjs). */
export const CAPTURE_DIR = path.join(repoRoot, 'e2e/.artifacts/parity/captures');

/** Google Fonts responses replayed to both apps (kept across runs). */
export const FONT_CACHE_DIR = path.join(repoRoot, 'e2e/.artifacts/font-cache');
