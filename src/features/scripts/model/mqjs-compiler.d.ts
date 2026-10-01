/**
 * libamp's script compiler: vendor/mqjs/mqjs_wasm.js, an Emscripten ES module that Vite aliases
 * as `mqjs-compiler`. Generated code is never type-checked; this is the part of its API the app
 * uses.
 */
declare module 'mqjs-compiler' {
  export interface MqjsModule {
    readonly FS: {
      writeFile(path: string, data: string | Uint8Array): void;
      readFile(path: string): Uint8Array;
    };
    callMain(args: string[]): number;
  }

  export interface MqjsModuleOptions {
    print?: (text: string) => void;
    printErr?: (text: string) => void;
    /** Where `mqjs_wasm.wasm` is; next to the module (`import.meta.url`) by default. */
    locateFile?: (path: string, scriptDirectory: string) => string;
  }

  export default function createMqjsCompiler(options?: MqjsModuleOptions): Promise<MqjsModule>;
}
