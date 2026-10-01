import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import {
  KEY_MEMBERS,
  SCRIPT_CALLBACKS,
  SCRIPT_GLOBALS,
  SCRIPT_MEMBERS,
  type ScriptApiEntry,
} from '../../model';

const IDENTIFIER = /^[\w$]*$/;

function completion(entry: ScriptApiEntry): Completion {
  return { label: entry.label, type: entry.kind, detail: entry.detail, info: entry.info };
}

const TOP_LEVEL: readonly Completion[] = [...SCRIPT_GLOBALS, ...SCRIPT_CALLBACKS].map(completion);
const MEMBERS: ReadonlyMap<string, readonly Completion[]> = new Map([
  ...Object.entries(SCRIPT_MEMBERS).map(([object, entries]): [string, readonly Completion[]] => [
    object,
    entries.map(completion),
  ]),
  // Keys, by the callbacks' parameter name in the example.
  ['key', KEY_MEMBERS.map(completion)],
]);

/**
 * Completes libamp's script API: the globals and callbacks at the start of a name, the members of
 * `keyboard.`, `led.` and `console.`, and the members of keys after `key.`.
 */
export function libampCompletions(context: CompletionContext): CompletionResult | null {
  const member = context.matchBefore(/[A-Za-z_$][\w$]*\.[\w$]*/);
  if (member) {
    const dot = member.text.indexOf('.');
    const options = MEMBERS.get(member.text.slice(0, dot));
    return options ? { from: member.from + dot + 1, options, validFor: IDENTIFIER } : null;
  }
  const word = context.matchBefore(/[A-Za-z_$][\w$]*/);
  if (!word && !context.explicit) return null;
  return { from: word ? word.from : context.pos, options: TOP_LEVEL, validFor: IDENTIFIER };
}
