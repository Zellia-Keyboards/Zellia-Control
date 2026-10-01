import { render, screen } from '@testing-library/react';
import { EditorView } from 'codemirror';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { installCodeMirrorShims, setEditorText } from '../testing/codemirror-jsdom';
import ScriptEditor from './ScriptEditor';

let uninstallShims: () => void;
beforeAll(() => {
  uninstallShims = installCodeMirrorShims();
});
afterAll(() => {
  uninstallShims();
});

function viewOf(content: HTMLElement): EditorView {
  const root = content.closest<HTMLElement>('.cm-editor');
  const view = root ? EditorView.findFromDOM(root) : null;
  if (!view) throw new Error('no editor');
  return view;
}

describe('ScriptEditor', () => {
  it('shows the text in a textbox named by its label', () => {
    render(
      <ScriptEditor value="keyboard.watch(2);" onChange={vi.fn()} label="Script" dark={false} />
    );
    const content = screen.getByRole('textbox', { name: 'Script' });
    expect(viewOf(content).state.doc.toString()).toBe('keyboard.watch(2);');
  });

  it('reports edits, but not the values it is given', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ScriptEditor value="a" onChange={onChange} label="Script" dark={false} />
    );
    const content = screen.getByRole('textbox', { name: 'Script' });

    setEditorText(content, 'function loop() {}');
    expect(onChange).toHaveBeenCalledWith('function loop() {}');

    onChange.mockClear();
    rerender(<ScriptEditor value="b" onChange={onChange} label="Script" dark={false} />);
    expect(viewOf(content).state.doc.toString()).toBe('b');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('follows the dark mode and the label', () => {
    const { rerender } = render(
      <ScriptEditor value="" onChange={vi.fn()} label="Script" dark={false} />
    );
    const content = screen.getByRole('textbox', { name: 'Script' });
    expect(viewOf(content).state.facet(EditorView.darkTheme)).toBe(false);

    rerender(<ScriptEditor value="" onChange={vi.fn()} label="脚本" dark />);

    expect(viewOf(content).state.facet(EditorView.darkTheme)).toBe(true);
    expect(screen.getByRole('textbox', { name: '脚本' })).toBe(content);
  });
});
