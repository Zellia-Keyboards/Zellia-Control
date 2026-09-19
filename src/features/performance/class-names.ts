/** Joins class names, skipping absent CSS-module classes and false conditions (`class:x={…}`). */
export function cx(...names: readonly (string | false | undefined)[]): string {
  return names.filter(name => name !== undefined && name !== false && name !== '').join(' ');
}
