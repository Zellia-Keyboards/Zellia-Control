/** libamp's default script buffers (`SCRIPT_SOURCE_BUFFER_SIZE`, `SCRIPT_BYTECODE_BUFFER_SIZE`). */
export const SCRIPT_BUFFER_BYTES = 1024;

/** The bytes a source takes on the keyboard: UTF-8 and the NUL the controller appends. */
export function scriptSourceBytes(source: string): number {
  return new TextEncoder().encode(source).length + 1;
}

/** More than libamp's default buffer holds; a firmware may use other sizes, so only a warning. */
export function exceedsScriptBuffer(bytes: number): boolean {
  return bytes > SCRIPT_BUFFER_BYTES;
}
