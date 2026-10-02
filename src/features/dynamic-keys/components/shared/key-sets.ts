/** Immutable updates of the key-id sets the configured lists animate (deleting, newly added). */

export function withKey(keys: ReadonlySet<string>, key: string): ReadonlySet<string> {
  return new Set(keys).add(key);
}

export function withKeys(keys: ReadonlySet<string>, added: Iterable<string>): ReadonlySet<string> {
  return new Set([...keys, ...added]);
}

export function withoutKey(keys: ReadonlySet<string>, key: string): ReadonlySet<string> {
  const next = new Set(keys);
  next.delete(key);
  return next;
}

export const NO_KEYS: ReadonlySet<string> = new Set();
