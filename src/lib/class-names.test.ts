import { describe, expect, it } from 'vitest';
import { cx } from './class-names';

describe('cx', () => {
  it('joins the present class names in order', () => {
    expect(cx('a', 'b c', 'd')).toBe('a b c d');
  });

  it('skips false conditions, absent module classes and empty strings', () => {
    const styles: Record<string, string | undefined> = { active: 'active_x1' };
    expect(cx('key', false, styles.active, styles.missing, null, '', 'end')).toBe(
      'key active_x1 end'
    );
    expect(cx()).toBe('');
  });
});
