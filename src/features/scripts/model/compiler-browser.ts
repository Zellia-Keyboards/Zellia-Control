/** The app's compiler: vendor/mqjs, fetched with its wasm on the first compile. */
import { createCompiler, type Compile } from './compiler';

export const compileScript: Compile = createCompiler(
  async () => (await import('mqjs-compiler')).default
);
