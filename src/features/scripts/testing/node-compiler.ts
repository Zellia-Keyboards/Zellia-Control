/**
 * The real compiler in Vitest (jsdom or node): the Emscripten module reads its wasm from disk,
 * next to vendor/mqjs/mqjs_wasm.js. The app's build finds it through Vite (`compileScript`).
 */
import createMqjsCompiler from 'mqjs-compiler';
import { createCompiler, type Compile, type MqjsFactory } from '../model/compiler';

const createInstance: MqjsFactory = options =>
  createMqjsCompiler({ ...options, locateFile: (path, directory) => directory + path });

export const nodeCompiler: Compile = createCompiler(() => Promise.resolve(createInstance));
