/**
 * `localStorage` access for persisted preferences and records.
 *
 * Storage can be unavailable (privacy modes, blocked cookies, quota exceeded): every read
 * degrades to "nothing stored" and every write failure is swallowed, so a preference that
 * cannot be persisted still works for the current session. Keys and value formats are shared
 * with the Svelte app (`language`, `darkMode`, `themeColor`, `keyboard-profiles`,
 * `zellia-layout-config`), so existing users keep their settings.
 */

function storage(): Storage {
  // Accessing `window.localStorage` itself throws when storage is blocked.
  return window.localStorage;
}

export function readString(key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): void {
  try {
    storage().setItem(key, value);
  } catch {
    // Unavailable or full storage: keep the in-memory value only.
  }
}

/**
 * Reads a JSON value and validates it with `parse` (the storage boundary). Returns `fallback`
 * when nothing is stored, the JSON is malformed, or `parse` throws to reject the shape.
 */
export function readJson<T>(key: string, parse: (value: unknown) => T, fallback: T): T {
  const raw = readString(key);
  if (raw === null) return fallback;
  try {
    return parse(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  writeString(key, JSON.stringify(value));
}
