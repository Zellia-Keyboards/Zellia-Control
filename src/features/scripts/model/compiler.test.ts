import { describe, expect, it } from 'vitest';
import { nodeCompiler } from '../testing/node-compiler';
import {
  createCompiler,
  parseCompileErrors,
  stripAnsi,
  type MqjsFactory,
  type MqjsInstance,
} from './compiler';
import { EXAMPLE_SCRIPT } from './example';

describe('parseCompileErrors', () => {
  it('reads each error with the line of the location after it', () => {
    expect(
      parseCompileErrors('Error: unexpected character in expression\n    at /main.js:2:3\n')
    ).toEqual([{ line: 2, message: 'unexpected character in expression' }]);
    expect(parseCompileErrors('SyntaxError: first\nError: second\n    at /main.js:7\n')).toEqual([
      { line: null, message: 'first' },
      { line: 7, message: 'second' },
    ]);
  });

  it('keeps output it cannot read as one error without a line', () => {
    expect(parseCompileErrors('out of memory\n')).toEqual([
      { line: null, message: 'out of memory' },
    ]);
    expect(parseCompileErrors('')).toEqual([]);
  });
});

describe('stripAnsi', () => {
  it('removes the colour codes', () => {
    expect(stripAnsi('\u001b[31;1mError: x\u001b[0m\n')).toBe('Error: x\n');
  });
});

describe('createCompiler', () => {
  interface Run {
    args: string[] | null;
    readonly files: Map<string, string | Uint8Array>;
  }

  it("compiles each script on a fresh instance with upstream's arguments", async () => {
    const runs: Run[] = [];
    // A stand-in for the Emscripten module: it "compiles" anything but `broken`.
    const createInstance: MqjsFactory = ({ printErr }) => {
      const run: Run = { args: null, files: new Map() };
      runs.push(run);
      const instance: MqjsInstance = {
        FS: {
          writeFile: (path, data) => {
            run.files.set(path, data);
          },
          readFile: path => {
            const file = run.files.get(path);
            if (!(file instanceof Uint8Array)) throw new Error(`ENOENT: ${path}`);
            return file;
          },
        },
        callMain: args => {
          run.args = args;
          if (run.files.get('/main.js') === 'broken') {
            printErr('\u001b[31;1mError: nope\n    at /main.js:1:7\u001b[0m');
          } else {
            run.files.set('/out.bin', Uint8Array.of(0xfb, 0xac));
          }
          return 0;
        },
      };
      return Promise.resolve(instance);
    };
    const compile = createCompiler(() => Promise.resolve(createInstance));

    expect(await compile('fine')).toEqual({
      bytecode: Uint8Array.of(0xfb, 0xac),
      stdout: '',
      stderr: '',
      errors: [],
    });
    expect(await compile('broken')).toEqual({
      bytecode: null,
      stdout: '',
      stderr: 'Error: nope\n    at /main.js:1:7\n',
      errors: [{ line: 1, message: 'nope' }],
    });
    expect(runs).toHaveLength(2);
    expect(runs[0]?.args).toEqual(['--no-column', '-m32', '-o', '/out.bin', '/main.js']);
  });

  it('leaves out what the module prints while it loads', async () => {
    // Emscripten prints its fallback while it loads a wasm served without `application/wasm`.
    const createInstance: MqjsFactory = ({ print, printErr }) => {
      print('loading');
      printErr(
        "wasm streaming compile failed: TypeError: Incorrect response MIME type. Expected 'application/wasm'."
      );
      printErr('falling back to ArrayBuffer instantiation');
      const files = new Map<string, string | Uint8Array>();
      const instance: MqjsInstance = {
        FS: {
          writeFile: (path, data) => {
            files.set(path, data);
          },
          readFile: path => {
            const file = files.get(path);
            if (!(file instanceof Uint8Array)) throw new Error(`ENOENT: ${path}`);
            return file;
          },
        },
        callMain: () => {
          print('compiled');
          files.set('/out.bin', Uint8Array.of(0xfb, 0xac));
          return 0;
        },
      };
      return Promise.resolve(instance);
    };
    const compile = createCompiler(() => Promise.resolve(createInstance));

    expect(await compile('fine')).toEqual({
      bytecode: Uint8Array.of(0xfb, 0xac),
      stdout: 'compiled\n',
      stderr: '',
      errors: [],
    });
  });
});

// The real compiler (vendor/mqjs). The messages are mquickjs's: if a rebuilt compiler words them
// differently, use its words here and in ScriptsPage.test.tsx.
describe("libamp's compiler", () => {
  it('compiles the example to bytecode', async () => {
    const result = await nodeCompiler(EXAMPLE_SCRIPT);
    expect(result.errors).toEqual([]);
    expect(result.stderr).toBe('');
    expect(Array.from(result.bytecode?.subarray(0, 2) ?? [])).toEqual([0xfb, 0xac]);
  });

  it('reports a syntax error with its line and writes no bytecode', async () => {
    const result = await nodeCompiler('function loop() {\n  let x = ;\n}\n');
    expect(result.bytecode).toBeNull();
    expect(result.stderr).toBe('Error: unexpected character in expression\n    at /main.js:2:3\n');
    expect(result.errors).toEqual([{ line: 2, message: 'unexpected character in expression' }]);
  });

  it('compiles again after a failure', async () => {
    await nodeCompiler('let = ;');
    expect((await nodeCompiler('function loop() {}\n')).bytecode).not.toBeNull();
  });

  it('gives compiles started at once each their own result', async () => {
    const [fine, broken] = await Promise.all([
      nodeCompiler('function loop() {\n  var x = 1;\n}\n'),
      nodeCompiler('function loop() {\n  var x = ;\n}\n'),
    ]);
    expect(fine.errors).toEqual([]);
    expect(fine.stderr).toBe('');
    expect(Array.from(fine.bytecode?.subarray(0, 2) ?? [])).toEqual([0xfb, 0xac]);
    expect(broken.bytecode).toBeNull();
    expect(broken.errors).toEqual([{ line: 2, message: 'unexpected character in expression' }]);
  });

  it('compiles an empty source to bytecode', async () => {
    const result = await nodeCompiler('');
    expect(result.errors).toEqual([]);
    expect(result.stderr).toBe('');
    expect(Array.from(result.bytecode?.subarray(0, 2) ?? [])).toEqual([0xfb, 0xac]);
  });
});
