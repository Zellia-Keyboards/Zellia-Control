import { Suspense, lazy, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { SECONDARY_BUTTON } from '../../../components/ui';
import { useT, type TranslationKey } from '../../../lib/i18n';
import { useDarkMode } from '../../../lib/theme';
import { deviceSession, deviceStore } from '../../device';
import {
  EXAMPLE_SCRIPT,
  SCRIPT_BUFFER_BYTES,
  exceedsScriptBuffer,
  formatHex,
  scriptSourceBytes,
  type Compile,
  type CompileError,
} from '../model';

const ScriptEditor = lazy(() => import('./ScriptEditor'));

/** The pause after the last edit before the page compiles (spec). */
const COMPILE_DELAY_MS = 500;

type CompileStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'compiling' }
  | { readonly kind: 'compiled'; readonly bytes: number }
  | { readonly kind: 'failed'; readonly errors: readonly CompileError[] }
  /** The compiler itself did not load (its chunk or its WebAssembly): not a script error. */
  | { readonly kind: 'unavailable' };

type Translate = (key: TranslationKey, ...args: string[]) => string;

function statusText(t: Translate, aot: boolean, status: CompileStatus): string {
  if (!aot) return t('scripts.jit');
  switch (status.kind) {
    case 'idle':
      return '';
    case 'compiling':
      return t('scripts.compiling');
    case 'compiled':
      return t('scripts.compiled', String(status.bytes));
    case 'failed':
      return t('scripts.failed');
    case 'unavailable':
      return t('scripts.compilerUnavailable');
  }
}

function downloadScript(source: string): void {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'script.js';
  link.click();
  URL.revokeObjectURL(url);
}

export interface ScriptWorkspaceProps {
  /** The staged script's source: the editor's first text. */
  readonly initialSource: string;
  /** The staged bytecode. */
  readonly bytecode: readonly number[];
  /** An ahead-of-time keyboard: the page compiles; otherwise the keyboard does. */
  readonly aot: boolean;
  readonly compile: Compile;
}

/**
 * The editor, its file buttons, the compile status and the bytecode. AOT keyboards: the text is
 * compiled 500 ms after the last edit, and only a script that compiles is staged, with its
 * bytecode. JIT keyboards: the text is staged as it is typed.
 */
export function ScriptWorkspace({ initialSource, bytecode, aot, compile }: ScriptWorkspaceProps) {
  const t = useT();
  const { isDark } = useDarkMode();
  const fileInput = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState(initialSource);
  // The text waiting to be compiled; a new object for every edit, so each edit compiles.
  const [pending, setPending] = useState<{ readonly source: string } | null>(null);
  const [status, setStatus] = useState<CompileStatus>({ kind: 'idle' });

  useEffect(() => {
    if (pending === null) return;
    let current = true;
    const timer = setTimeout(() => {
      compile(pending.source).then(
        result => {
          if (!current) return;
          if (result.bytecode) {
            // The keyboard is loading a configuration (profile switch, reset): the session would
            // reject the edit, and the load starts the workspace over on the new script anyway.
            if (deviceStore.getState().reloading) {
              setStatus({ kind: 'idle' });
              return;
            }
            deviceSession.setScript({
              source: pending.source,
              bytecode: Array.from(result.bytecode),
            });
            setStatus({ kind: 'compiled', bytes: result.bytecode.length });
          } else {
            setStatus({ kind: 'failed', errors: result.errors });
          }
        },
        () => {
          // The compiler's chunk or its WebAssembly did not load (network loss, a misconfigured
          // host): the script is not at fault, so no error list.
          if (current) setStatus({ kind: 'unavailable' });
        }
      );
    }, COMPILE_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [pending, compile]);

  const edit = (next: string) => {
    setSource(next);
    if (aot) {
      setPending({ source: next });
      setStatus({ kind: 'compiling' });
    } else {
      deviceSession.setScript({ source: next, bytecode: [] });
    }
  };

  const openFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // The same file can be opened again.
    input.value = '';
    if (file) edit(await file.text());
  };

  const sourceBytes = scriptSourceBytes(source);
  const warnings: string[] = [];
  if (exceedsScriptBuffer(sourceBytes)) {
    warnings.push(t('scripts.sourceTooLarge', String(sourceBytes), String(SCRIPT_BUFFER_BYTES)));
  }
  if (aot && exceedsScriptBuffer(bytecode.length)) {
    warnings.push(
      t('scripts.bytecodeTooLarge', String(bytecode.length), String(SCRIPT_BUFFER_BYTES))
    );
  }

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={() => {
            fileInput.current?.click();
          }}
        >
          {t('scripts.open')}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".js,text/javascript"
          className="hidden"
          aria-label={t('scripts.open')}
          onChange={event => {
            void openFile(event);
          }}
        />
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={() => {
            downloadScript(source);
          }}
        >
          {t('scripts.save')}
        </button>
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={() => {
            edit(EXAMPLE_SCRIPT);
          }}
        >
          {t('scripts.example')}
        </button>
      </div>
      <Suspense
        fallback={
          <div className="min-h-[24rem] flex-1 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
            {t('scripts.loadingEditor')}
          </div>
        }
      >
        <ScriptEditor value={source} onChange={edit} label={t('scripts.editor')} dark={isDark} />
      </Suspense>
      <p
        role="status"
        className={`min-h-5 text-sm ${aot && status.kind === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}
      >
        {statusText(t, aot, status)}
      </p>
      {aot && status.kind === 'failed' && (
        <ul className="space-y-1 font-mono text-sm text-red-600 dark:text-red-400">
          {status.errors.map((error, index) => (
            <li key={index}>
              {error.line === null
                ? error.message
                : t('scripts.errorLine', String(error.line), error.message)}
            </li>
          ))}
        </ul>
      )}
      {warnings.map(warning => (
        <p key={warning} className="text-sm text-amber-600 dark:text-amber-400">
          {warning}
        </p>
      ))}
      {aot && bytecode.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-700 dark:text-gray-300">
            {t('scripts.bytecode', String(bytecode.length))}
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-100 dark:bg-gray-800 p-3 font-mono text-xs text-gray-800 dark:text-gray-200">
            {formatHex(bytecode)}
          </pre>
        </details>
      )}
    </div>
  );
}
