export type ParityTheme = 'light' | 'dark';
export type ParityLanguage = 'en' | 'zh';

export interface ParityVariant {
  readonly theme: ParityTheme;
  readonly language: ParityLanguage;
  readonly viewport: { readonly width: number; readonly height: number };
}

const THEMES: readonly ParityTheme[] = ['dark', 'light'];
const LANGUAGES: readonly ParityLanguage[] = ['en', 'zh'];
// 2560 wide exercises the `--ui-scale` breakpoint of app.css.
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 2560, height: 1440 },
] as const;

/** Every scenario is captured in each of these variants (the app defaults come first). */
export const PARITY_VARIANTS: readonly ParityVariant[] = VIEWPORTS.flatMap(viewport =>
  THEMES.flatMap(theme => LANGUAGES.map(language => ({ theme, language, viewport })))
);

/** File-name-safe id of one capture, e.g. `welcome--dark-en-1440x900`. */
export function captureId(scenario: string, variant: ParityVariant): string {
  const { theme, language, viewport } = variant;
  return `${scenario}--${theme}-${language}-${viewport.width}x${viewport.height}`;
}

/**
 * localStorage seeded before the first page script: the scenario's entries plus the preference
 * keys both apps read (`darkMode` 'true'/'false', `language` 'en'/'zh').
 */
export function seededStorage(
  variant: ParityVariant,
  scenarioStorage: Readonly<Record<string, string>>
): Record<string, string> {
  return {
    ...scenarioStorage,
    darkMode: String(variant.theme === 'dark'),
    language: variant.language,
  };
}
