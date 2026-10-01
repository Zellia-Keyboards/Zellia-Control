/**
 * CodeMirror in jsdom: jsdom has no layout, and its Range lacks the geometry CodeMirror measures.
 * `installCodeMirrorShims` adds empty rectangles (call it in `beforeAll`, its undo in
 * `afterAll`); `setEditorText` replaces an editor's text as typing would.
 */
import { EditorView } from 'codemirror';

export function installCodeMirrorShims(): () => void {
  const rects = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects');
  const box = Object.getOwnPropertyDescriptor(Range.prototype, 'getBoundingClientRect');
  Range.prototype.getClientRects = function getClientRects() {
    return document.createElement('div').getClientRects();
  };
  Range.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return document.createElement('div').getBoundingClientRect();
  };
  return () => {
    const originals = [
      ['getClientRects', rects],
      ['getBoundingClientRect', box],
    ] as const;
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(Range.prototype, name, descriptor);
      else Reflect.deleteProperty(Range.prototype, name);
    }
  };
}

/** Replaces the text of the editor that `element` is part of, as typing it would. */
export function setEditorText(element: HTMLElement, text: string): void {
  const root = element.closest<HTMLElement>('.cm-editor');
  const view = root ? EditorView.findFromDOM(root) : null;
  if (!view) throw new Error('setEditorText: the element is not in a CodeMirror editor');
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
    userEvent: 'input.type',
  });
}
