/**
 * Joins class names, skipping absent CSS-module classes and false conditions — the React form of
 * Svelte's `class:name={condition}` directives: `cx('key', selected && styles.selected)`.
 */
export function cx(...names: readonly (string | false | null | undefined)[]): string {
  return names.filter(name => typeof name === 'string' && name !== '').join(' ');
}
