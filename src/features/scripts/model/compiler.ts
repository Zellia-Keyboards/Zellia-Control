/**
 * libamp's script compiler (mqjs, vendor/mqjs): compiles a script to the bytecode AOT keyboards
 * run. Every compile gets a fresh instance (a second `callMain` on one instance fails) and runs it
 * as upstream does: `--no-column -m32 -o /out.bin /main.js` on its virtual file system. A failed
 * compile writes no `/out.bin` and prints ANSI-coloured errors such as
 * `Error: unexpected character in expression` and `    at /main.js:2:3`.
 */

/** The part of the Emscripten module the compiler uses. */
export interface MqjsInstance {
  readonly FS: {
    writeFile(path: string, data: string): void;
    readFile(path: string): Uint8Array;
  };
  callMain(args: string[]): number;
}

export interface MqjsOptions {
  readonly print: (text: string) => void;
  readonly printErr: (text: string) => void;
}

/** `createMqjsCompiler` of vendor/mqjs/mqjs_wasm.js, or a stand-in. */
export type MqjsFactory = (options: MqjsOptions) => Promise<MqjsInstance>;

export interface CompileError {
  /** 1-based line of the script, when the compiler names one. */
  readonly line: number | null;
  readonly message: string;
}

export interface CompileResult {
  /** Null when the script did not compile. */
  readonly bytecode: Uint8Array | null;
  readonly stdout: string;
  /** The compiler's error output, without colour codes. */
  readonly stderr: string;
  /** The errors of a failed compile; empty when it compiled. */
  readonly errors: readonly CompileError[];
}

export type Compile = (source: string) => Promise<CompileResult>;

export const COMPILER_ARGS: readonly string[] = [
  '--no-column',
  '-m32',
  '-o',
  '/out.bin',
  '/main.js',
];

// eslint-disable-next-line no-control-regex -- ANSI colour codes start with ESC (0x1b)
const ANSI_CODES = /\x1b\[[0-9;]*m/g;
const ERROR_LINE = /^[A-Za-z]*Error: (.*)$/;
const LOCATION_LINE = /^\s+at \/main\.js:(\d+)/;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_CODES, '');
}

/** Each `…Error: message` line, with the line of the `at /main.js:L` that follows it. */
export function parseCompileErrors(stderr: string): CompileError[] {
  const errors: CompileError[] = [];
  for (const text of stderr.split('\n')) {
    const error = ERROR_LINE.exec(text);
    if (error) {
      errors.push({ line: null, message: error[1] ?? '' });
      continue;
    }
    const location = LOCATION_LINE.exec(text);
    const last = errors.at(-1);
    if (location && last?.line === null) {
      errors[errors.length - 1] = { ...last, line: Number(location[1]) };
    }
  }
  if (errors.length === 0 && stderr.trim() !== '') {
    errors.push({ line: null, message: stderr.trim() });
  }
  return errors;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  // Emscripten's ExitStatus is no Error, but has a message.
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}

/** A compiler that loads the Emscripten module with `load` (once it is needed). */
export function createCompiler(load: () => Promise<MqjsFactory>): Compile {
  return async source => {
    const createInstance = await load();
    let stdout = '';
    let stderr = '';
    const instance = await createInstance({
      print: text => {
        stdout += `${text}\n`;
      },
      printErr: text => {
        stderr += `${text}\n`;
      },
    });
    instance.FS.writeFile('/main.js', source);
    try {
      instance.callMain([...COMPILER_ARGS]);
    } catch (error) {
      stderr += `${messageOf(error)}\n`;
    }
    let bytecode: Uint8Array | null;
    try {
      bytecode = instance.FS.readFile('/out.bin');
    } catch {
      bytecode = null;
    }
    const output = stripAnsi(stderr);
    return { bytecode, stdout, stderr: output, errors: bytecode ? [] : parseCompileErrors(output) };
  };
}
