import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from './en';
import type * as I18nModule from './index';
import { zh } from './zh';

type I18n = typeof I18nModule;

/** Fresh module instance, so the persisted language is read again. */
async function loadI18n(): Promise<I18n> {
  vi.resetModules();
  return import('./index');
}

const ADDED_KEYS = {
  'ui.save': ['Save', '保存'],
  'advancedkey.done': ['Done', '完成'],
  'advancedkey.deleteKey': ['Delete key', '删除按键'],
  'advancedkey.deletePair': ['Delete pair', '删除配对'],
  'advancedkey.trigger': ['Trigger', '触发'],
  'advancedkey.state': ['State', '状态'],
} as const;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = 'en';
});

afterEach(() => {
  cleanup();
});

describe('dictionaries', () => {
  it('have exactly the same keys in both languages', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
  });

  it('keep the ported key set plus the React additions', () => {
    // 263 keys used by the Svelte app, the six it referenced but never defined, the Settings
    // confirmations (PL-012), the Save button's unsaved-changes label (PL-050) and the Lighting
    // copy (PL-047 to PL-049), without the panels' Apply.
    // + 18: Remap's Macro and Script groups (macros and scripts spec).
    // + 39: the Macros page (macros and scripts spec).
    // + 16: the Scripts page (macros and scripts spec).
    // + 2: the sidebar entries of the Macros and Scripts pages.
    expect(Object.keys(en)).toHaveLength(368);
  });

  it('add the unsaved-changes label of the Save button (PL-050)', () => {
    expect(en['ui.unsavedChanges']).toBe('Unsaved changes');
    expect(zh['ui.unsavedChanges']).toBe('有未保存的更改');
  });

  it('add the copy of the Settings confirmations (PL-012), which the Svelte app did not have', () => {
    expect(en).toMatchObject({
      'common.cancel': 'Cancel',
      'settings.bootloaderConfirm':
        'Are you sure you want to enter bootloader mode? The keyboard will disconnect and wait for a firmware update.',
      'settings.factoryResetConfirm':
        'Are you sure you want to reset all settings to factory defaults? This action cannot be undone.',
    });
    expect(zh).toMatchObject({
      'common.cancel': '取消',
      'settings.bootloaderConfirm': '确定要进入引导程序模式吗？键盘将断开连接并等待固件更新。',
      'settings.factoryResetConfirm': '确定要将所有设置恢复为出厂默认值吗？此操作无法撤销。',
    });
  });

  it('add the Lighting copy: mode explanations, Mixed, targets and the save hint', () => {
    expect(en).toMatchObject({
      rgb_mode_jelly_desc:
        'Pressing lights up the keys around it in their own colors; the deeper the press, the farther it reaches.',
      'lighting.saveHint': 'Lighting changes reach the keyboard when you press Save.',
      'lighting.keyCount': '{0} keys',
    });
    expect(zh).toMatchObject({
      rgb_mode_jelly_desc: '按下时，周围的按键以各自的颜色亮起；按得越深，范围越大。',
      'lighting.saveHint': '按下「保存」后，灯光更改才会发送到键盘。',
      'lighting.keyCount': '{0} 个按键',
    });
  });

  it('contain only non-empty strings', () => {
    for (const dictionary of [en, zh]) {
      for (const value of Object.values(dictionary)) {
        expect(typeof value).toBe('string');
        expect(value.trim()).not.toBe('');
      }
    }
  });

  it('add the six keys the Svelte components referenced but never defined', () => {
    for (const [key, [english, chinese]] of Object.entries(ADDED_KEYS)) {
      expect(en).toHaveProperty([key], english);
      expect(zh).toHaveProperty([key], chinese);
    }
  });

  it('drop unused keys, including the zh-only demo entries', () => {
    const keys = Object.keys(zh);
    expect(keys.some(key => key.startsWith('demo.'))).toBe(false);
    expect(keys).not.toContain('ui.sync');
    expect(keys).not.toContain('remap.title');
    expect(keys).not.toContain('update.title');
  });

  it('keep the Svelte key order and text', () => {
    expect(Object.keys(en).slice(0, 10)).toEqual([
      'nav.performance',
      'nav.remap',
      'nav.lighting',
      'nav.advancedkey',
      'nav.debug',
      'nav.settings',
      'nav.about',
      'nav.update',
      'ui.save',
      'ui.disconnect',
    ]);
    expect(en['performance.rapidTriggerDesc']).toBe(
      'Rapid Trigger dynamically actuates and resets your key based on your movement.'
    );
    expect(zh['advancedkey.toggleDescription']).toBe(
      '此按键将在{1}切换{0}。每次触发都会在激活和非激活状态之间切换。'
    );
    expect(en['debug.keyPressReportingDesc']).toBe(
      'Allows the keyboard to report whether a key is considered to be pressed. Pressed keys are indicated by the visual above.'
    );
  });

  it('add the Extension tab’s Macro and Script groups (macros and scripts spec)', () => {
    expect(en).toMatchObject({
      'remap.macroGroup': 'Macro',
      'macros.slot': 'Macro {0}',
      'remap.macroPlayOnceNoGap': 'Play Once\nNo Gaps',
      'remap.scriptSuspend': 'Suspend',
    });
    expect(zh).toMatchObject({
      'remap.macroGroup': '宏',
      'remap.scriptGroup': '脚本',
      'macros.slot': '宏 {0}',
      'remap.macroPlayOnceNoGap': '播放一次\n无间隔',
    });
  });

  it('add the Macros page copy (macros and scripts spec)', () => {
    expect(en).toMatchObject({
      'macros.title': 'Macros',
      'macros.limit': '{0} / {1} actions',
      'macros.fromStart': 'From macro start',
      'macros.noRoom': 'Not enough space for a complete action.',
      'macros.skipped': '{0} keys could not be recorded.',
      'macros.unsupported': 'This keyboard does not support macros',
    });
    expect(zh).toMatchObject({
      'macros.title': '宏',
      'macros.press': '按下',
      'macros.release': '释放',
      'macros.unsupported': '此键盘不支持宏',
    });
  });

  it('add the Scripts page copy (macros and scripts spec)', () => {
    expect(en).toMatchObject({
      'scripts.title': 'Scripts',
      'scripts.compiled': 'Compiled: {0} bytes — sent to the keyboard on Save',
      'scripts.failed': 'Errors: fix them to send this script',
    });
    expect(zh).toMatchObject({
      'scripts.title': '脚本',
      'scripts.unsupported': '此键盘不支持脚本',
    });
  });

  it('add the sidebar entries of the Macros and Scripts pages (macros and scripts spec)', () => {
    expect([en['nav.macros'], en['nav.scripts']]).toEqual(['Macros', 'Scripts']);
    expect([zh['nav.macros'], zh['nav.scripts']]).toEqual(['宏', '脚本']);
  });
});

describe('translate', () => {
  it('looks up the text for the language', async () => {
    const { translate } = await loadI18n();
    expect(translate('nav.remap', 'en')).toBe('Remap');
    expect(translate('nav.remap', 'zh')).toBe('按键映射');
  });

  it('falls back to the key when a key has no text (untyped callers)', async () => {
    const { translate } = await loadI18n();
    const untyped = translate as (key: string, language: 'en' | 'zh') => string;
    expect(untyped('missing.key', 'en')).toBe('missing.key');
    expect(untyped('missing.key', 'zh')).toBe('missing.key');
  });

  it('fills {n} placeholders with the arguments by index', async () => {
    const { translate } = await loadI18n();
    expect(translate('advancedkey.quickTap', 'en', '200')).toBe('Quick tap (under 200ms)');
    expect(translate('advancedkey.toggleDescription', 'en', 'Caps Lock', 'when pressed')).toBe(
      'This key will toggle Caps Lock when pressed. Each trigger will switch between active and inactive states.'
    );
    expect(translate('advancedkey.toggleDescription', 'zh', '大写锁定', '按下时')).toBe(
      '此按键将在按下时切换大写锁定。每次触发都会在激活和非激活状态之间切换。'
    );
  });

  it('leaves placeholders without an argument untouched', async () => {
    const { translate } = await loadI18n();
    expect(translate('advancedkey.selectKeycodeForBinding', 'en')).toBe(
      'Select a keycode for binding {0}'
    );
  });

  it('inserts arguments literally', async () => {
    const { translate } = await loadI18n();
    expect(translate('advancedkey.selectKeycodeForBinding', 'en', '$& $1 $$')).toBe(
      'Select a keycode for binding $& $1 $$'
    );
  });
});

describe('language preference', () => {
  it('defaults to English when nothing is stored', async () => {
    const { getLanguage } = await loadI18n();
    expect(getLanguage()).toBe('en');
  });

  it('reads the persisted language', async () => {
    localStorage.setItem('language', 'zh');
    const { getLanguage } = await loadI18n();
    expect(getLanguage()).toBe('zh');
  });

  it('ignores an invalid persisted value', async () => {
    localStorage.setItem('language', 'fr');
    const { getLanguage } = await loadI18n();
    expect(getLanguage()).toBe('en');
  });

  it('persists changes and syncs <html lang>', async () => {
    const { setLanguage, getLanguage } = await loadI18n();
    setLanguage('zh');
    expect(getLanguage()).toBe('zh');
    expect(localStorage.getItem('language')).toBe('zh');
    expect(document.documentElement.lang).toBe('zh');
  });

  it('toggles between English and Chinese', async () => {
    const { toggleLanguage, getLanguage } = await loadI18n();
    toggleLanguage();
    expect(getLanguage()).toBe('zh');
    expect(localStorage.getItem('language')).toBe('zh');
    toggleLanguage();
    expect(getLanguage()).toBe('en');
    expect(localStorage.getItem('language')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('bootstrapLanguage applies the persisted language to <html lang>', async () => {
    localStorage.setItem('language', 'zh');
    const { bootstrapLanguage } = await loadI18n();
    bootstrapLanguage();
    expect(document.documentElement.lang).toBe('zh');
  });

  it('keeps working in memory when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const { setLanguage, getLanguage } = await loadI18n();
    setLanguage('zh');
    expect(getLanguage()).toBe('zh');
  });
});

describe('hooks', () => {
  it('useT re-renders with the new language', async () => {
    const { useT, setLanguage } = await loadI18n();
    function Label() {
      const t = useT();
      return <span>{t('ui.disconnect')}</span>;
    }
    render(<Label />);
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
    act(() => {
      setLanguage('zh');
    });
    expect(screen.getByText('断开连接')).toBeInTheDocument();
  });

  it('useT forwards placeholder arguments', async () => {
    const { useT } = await loadI18n();
    function Label() {
      const t = useT();
      return <span>{t('advancedkey.holdOver', '300')}</span>;
    }
    render(<Label />);
    expect(screen.getByText('Hold (over 300ms)')).toBeInTheDocument();
  });

  it('useLanguage exposes the language and its setters', async () => {
    const { useLanguage } = await loadI18n();
    function Switch() {
      const { language, setLanguage, toggleLanguage } = useLanguage();
      return (
        <div>
          <span data-testid="language">{language}</span>
          <button
            type="button"
            onClick={() => {
              setLanguage('zh');
            }}
          >
            set
          </button>
          <button type="button" onClick={toggleLanguage}>
            toggle
          </button>
        </div>
      );
    }
    render(<Switch />);
    expect(screen.getByTestId('language')).toHaveTextContent('en');
    act(() => {
      screen.getByRole('button', { name: 'set' }).click();
    });
    expect(screen.getByTestId('language')).toHaveTextContent('zh');
    act(() => {
      screen.getByRole('button', { name: 'toggle' }).click();
    });
    expect(screen.getByTestId('language')).toHaveTextContent('en');
  });
});

describe('rich placeholders', () => {
  it('interleaves React nodes in placeholder order', async () => {
    const { translateRich } = await loadI18n();
    const { container } = render(
      <p>
        {translateRich(
          'advancedkey.toggleDescription',
          'zh',
          <strong className="text-primary-600">Caps Lock</strong>,
          '按下时'
        )}
      </p>
    );
    expect(container.innerHTML).toBe(
      '<p>此按键将在按下时切换<strong class="text-primary-600">Caps Lock</strong>。每次触发都会在激活和非激活状态之间切换。</p>'
    );
  });

  it('matches translate() output for string arguments', async () => {
    const { translateRich, translate } = await loadI18n();
    const { container } = render(<p>{translateRich('advancedkey.quickTap', 'en', '150')}</p>);
    expect(container.textContent).toBe(translate('advancedkey.quickTap', 'en', '150'));
  });

  it('renders each run of text as one text node, like Svelte', async () => {
    // Chrome shapes every text node on its own, so split runs shift glyphs by sub-pixels.
    const { translateRich } = await loadI18n();
    const { container } = render(
      <p>
        {translateRich('advancedkey.toggleDescription', 'zh', <strong>Caps Lock</strong>, '按下时')}
      </p>
    );
    const nodes = [...(container.firstElementChild?.childNodes ?? [])];
    expect(nodes.map(node => node.nodeName)).toEqual(['#text', 'STRONG', '#text']);
    expect(nodes[0]?.textContent).toBe('此按键将在按下时切换');

    const { container: numbers } = render(
      <p>{translateRich('advancedkey.quickTap', 'en', 150)}</p>
    );
    expect(numbers.firstElementChild?.childNodes).toHaveLength(1);
  });

  it('useTRich follows the current language', async () => {
    const { useTRich, setLanguage } = await loadI18n();
    function Description() {
      const tRich = useTRich();
      return <p>{tRich('advancedkey.holdOver', <b>250</b>)}</p>;
    }
    const { container } = render(<Description />);
    expect(container.innerHTML).toBe('<p>Hold (over <b>250</b>ms)</p>');
    act(() => {
      setLanguage('zh');
    });
    expect(container.innerHTML).toBe('<p>按住（超过 <b>250</b> 毫秒）</p>');
  });
});
