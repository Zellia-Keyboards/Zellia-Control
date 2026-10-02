/**
 * Translations and the persisted language preference (port of the Svelte `LanguageStore`).
 *
 * The language lives in a tiny external store persisted under the `language` key (same key
 * and values as the Svelte app) and mirrored to `<html lang>`. Hard-coded English strings in
 * components stay hard-coded (parity), only dictionary keys are translated.
 */
import { Fragment, createElement, useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { createSignal } from '../signal';
import { readString, writeString } from '../storage';
import { en, type TranslationKey } from './en';
import { zh } from './zh';

export type { TranslationKey };
export type Language = 'en' | 'zh';

const LANGUAGE_KEY = 'language';

const dictionaries: Readonly<Record<Language, Readonly<Record<TranslationKey, string>>>> = {
  en,
  zh,
};

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'zh';
}

/** Text for `key`, or the key itself when there is none (Svelte `t`). */
function lookup(key: TranslationKey, language: Language): string {
  return dictionaries[language][key] || key;
}

/**
 * Translates `key`, replacing the first `{0}`, `{1}`, … with `args` in order (Svelte
 * `t`/`tPlaceholder`). Arguments are inserted literally.
 */
export function translate(key: TranslationKey, language: Language, ...args: string[]): string {
  let text = lookup(key, language);
  args.forEach((arg, index) => {
    text = text.replace(`{${index}}`, () => arg);
  });
  return text;
}

/**
 * Like `translate`, but placeholders take React nodes (e.g. a `<strong>` key name), so rich
 * messages never need `dangerouslySetInnerHTML`.
 */
export function translateRich(
  key: TranslationKey,
  language: Language,
  ...args: ReactNode[]
): ReactNode {
  const text = lookup(key, language);
  const slots = args
    .map((node, index) => ({ node, token: `{${index}}`, at: text.indexOf(`{${index}}`) }))
    .filter(slot => slot.at !== -1)
    .sort((a, b) => a.at - b.at);
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const slot of slots) {
    parts.push(text.slice(cursor, slot.at), slot.node);
    cursor = slot.at + slot.token.length;
  }
  parts.push(text.slice(cursor));
  // Adjacent strings become one text node, as in Svelte: Chrome shapes each text node on its
  // own, so split runs would shift glyphs by sub-pixels.
  const runs: ReactNode[] = [];
  for (const part of parts) {
    const value = typeof part === 'number' ? String(part) : part;
    const previous = runs[runs.length - 1];
    if (typeof value === 'string' && typeof previous === 'string') {
      runs[runs.length - 1] = previous + value;
    } else if (value !== '') {
      runs.push(value);
    }
  }
  return createElement(Fragment, null, ...runs);
}

// --- Language store -------------------------------------------------------------------------

const languageChanged = createSignal();
let current: Language | undefined;

function readPersistedLanguage(): Language {
  const stored = readString(LANGUAGE_KEY);
  return isLanguage(stored) ? stored : 'en';
}

function applyDocumentLanguage(language: Language): void {
  document.documentElement.lang = language;
}

export function getLanguage(): Language {
  current ??= readPersistedLanguage();
  return current;
}

export function setLanguage(language: Language): void {
  writeString(LANGUAGE_KEY, language);
  applyDocumentLanguage(language);
  if (language === getLanguage()) return;
  current = language;
  languageChanged.emit();
}

export function toggleLanguage(): void {
  setLanguage(getLanguage() === 'en' ? 'zh' : 'en');
}

/** Applies the persisted language to `<html lang>`; call once before the first render. */
export function bootstrapLanguage(): void {
  applyDocumentLanguage(getLanguage());
}

function useCurrentLanguage(): Language {
  return useSyncExternalStore(languageChanged.subscribe, getLanguage);
}

export function useLanguage(): {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
} {
  return { language: useCurrentLanguage(), setLanguage, toggleLanguage };
}

export function useT(): (key: TranslationKey, ...args: string[]) => string {
  const language = useCurrentLanguage();
  return useCallback(
    (key: TranslationKey, ...args: string[]) => translate(key, language, ...args),
    [language]
  );
}

export function useTRich(): (key: TranslationKey, ...args: ReactNode[]) => ReactNode {
  const language = useCurrentLanguage();
  return useCallback(
    (key: TranslationKey, ...args: ReactNode[]) => translateRich(key, language, ...args),
    [language]
  );
}
