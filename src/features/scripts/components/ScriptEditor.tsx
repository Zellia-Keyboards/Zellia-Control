/**
 * The script editor: CodeMirror 6 with JavaScript highlighting, auto-indent, search and the
 * completion of libamp's script API. The Scripts page loads it lazily, so CodeMirror is fetched
 * with that page only.
 */
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { Compartment, EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, basicSetup } from 'codemirror';
import { useEffect, useRef, useState } from 'react';
import { libampCompletions } from './script-editor/completions';

export interface ScriptEditorProps {
  readonly value: string;
  /** Called with the text after each edit made in the editor (not for new `value`s). */
  readonly onChange: (source: string) => void;
  /** The editor's accessible name. */
  readonly label: string;
  readonly dark: boolean;
}

export default function ScriptEditor({ value, onChange, label, dark }: ScriptEditorProps) {
  const parent = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const [theme] = useState(() => new Compartment());
  const [name] = useState(() => new Compartment());
  // The editor is created once: its first state and its listener read the latest props here.
  const latest = useRef({ value, onChange, label, dark });
  useEffect(() => {
    latest.current = { value, onChange, label, dark };
  });

  useEffect(() => {
    const element = parent.current;
    if (!element) return;
    const initial = latest.current;
    const editor = new EditorView({
      parent: element,
      state: EditorState.create({
        doc: initial.value,
        extensions: [
          basicSetup,
          javascript(),
          javascriptLanguage.data.of({ autocomplete: libampCompletions }),
          name.of(EditorView.contentAttributes.of({ 'aria-label': initial.label })),
          theme.of(initial.dark ? oneDark : []),
          EditorView.updateListener.of(update => {
            if (!update.docChanged) return;
            const text = update.state.doc.toString();
            // A new `value` is no edit.
            if (text !== latest.current.value) latest.current.onChange(text);
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, [theme, name]);

  // A new `value` (an opened file, the example) replaces the text.
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: theme.reconfigure(dark ? oneDark : []) });
  }, [dark, theme]);

  useEffect(() => {
    view.current?.dispatch({
      effects: name.reconfigure(EditorView.contentAttributes.of({ 'aria-label': label })),
    });
  }, [label, name]);

  return (
    <div
      ref={parent}
      className="min-h-[24rem] flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm [&_.cm-editor]:h-full"
    />
  );
}
