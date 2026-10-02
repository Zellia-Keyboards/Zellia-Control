import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ParityScenario } from '../../e2e/parity/scenario';

const SCENARIO_DIR = fileURLToPath(new URL('../../e2e/parity/scenarios/', import.meta.url));
const NAME = /^[a-z0-9][a-z0-9-]*$/;
const RESERVED_STORAGE_KEYS = new Set(['darkMode', 'language']);

export interface ScenarioModule {
  /** Repository-relative file, for error messages. */
  readonly file: string;
  readonly exports: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertStorage(value: unknown, where: string): void {
  if (!isRecord(value)) throw new Error(`${where}: storage must map keys to strings`);
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string') throw new Error(`${where}: storage.${key} must be a string`);
    if (RESERVED_STORAGE_KEYS.has(key)) {
      throw new Error(`${where}: storage.${key} is set per variant by the harness`);
    }
  }
}

function assertScenario(value: unknown, where: string): asserts value is ParityScenario {
  if (!isRecord(value)) throw new Error(`${where}: a scenario must be an object`);
  const { name, path: scenarioPath, setup, virtualKeyboard, storage, reactOnly } = value;
  if (typeof name !== 'string' || !NAME.test(name)) {
    throw new Error(`${where}: name must be kebab-case (got ${JSON.stringify(name)})`);
  }
  if (typeof scenarioPath !== 'string' || !scenarioPath.startsWith('/')) {
    throw new Error(`${where}: path must start with "/" (got ${JSON.stringify(scenarioPath)})`);
  }
  if (setup !== undefined && typeof setup !== 'function') {
    throw new Error(`${where}: setup must be a function`);
  }
  if (
    virtualKeyboard !== undefined &&
    typeof virtualKeyboard !== 'boolean' &&
    (!isRecord(virtualKeyboard) || Array.isArray(virtualKeyboard))
  ) {
    throw new Error(`${where}: virtualKeyboard must be a boolean or an options object`);
  }
  if (reactOnly !== undefined && typeof reactOnly !== 'boolean') {
    throw new Error(`${where}: reactOnly must be a boolean`);
  }
  if (storage !== undefined) assertStorage(storage, where);
}

/** Validates the default exports of scenario files; names must be unique across files. */
export function validateScenarios(modules: readonly ScenarioModule[]): ParityScenario[] {
  const origins = new Map<string, string>();
  const scenarios: ParityScenario[] = [];
  for (const { file, exports } of modules) {
    const list: unknown = isRecord(exports) ? exports.default : undefined;
    if (!Array.isArray(list)) {
      throw new Error(`${file}: the default export must be an array of parity scenarios`);
    }
    list.forEach((item: unknown, index) => {
      assertScenario(item, `${file}[${index}]`);
      const origin = origins.get(item.name);
      if (origin !== undefined) {
        throw new Error(`Duplicate parity scenario "${item.name}" in ${origin} and ${file}`);
      }
      origins.set(item.name, file);
      scenarios.push(item);
    });
  }
  return scenarios;
}

/** Loads e2e/parity/scenarios/*.ts (one file per feature), in file name order. */
export async function loadScenarios(dir: string = SCENARIO_DIR): Promise<ParityScenario[]> {
  const files = (await readdir(dir))
    .filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'))
    .sort();
  const modules: ScenarioModule[] = [];
  for (const file of files) {
    const exports: unknown = await import(pathToFileURL(path.join(dir, file)).href);
    modules.push({ file: `e2e/parity/scenarios/${file}`, exports });
  }
  return validateScenarios(modules);
}
