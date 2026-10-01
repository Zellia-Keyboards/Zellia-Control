/**
 * Scripts page against the real device layer (a virtual Trinity Pad, an AOT keyboard) and the
 * real compiler (vendor/mqjs, read from disk). The editor is CodeMirror in jsdom.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest';
import { connectVirtualKeyboard, type ConnectedKeyboard } from '../../testing/app-keyboard';
import { deviceStore } from '../device';
import { ScriptWorkspace } from './components/ScriptWorkspace';
import { EXAMPLE_SCRIPT, type Compile } from './model';
import { ScriptsPage } from './ScriptsPage';
import { installCodeMirrorShims, setEditorText } from './testing/codemirror-jsdom';
import { nodeCompiler } from './testing/node-compiler';

const BROKEN = 'function loop() {\n  let x = ;\n}\n';
/** Compiling waits 500 ms for the edits to pause; a busy machine needs more. */
const COMPILED = { timeout: 5_000 };

let uninstallShims: () => void;
beforeAll(() => {
  uninstallShims = installCodeMirrorShims();
});
afterAll(() => {
  uninstallShims();
});

function renderPage(compile: Compile = nodeCompiler) {
  return render(
    <MemoryRouter>
      <ScriptsPage compile={compile} />
    </MemoryRouter>
  );
}

/** The editor, once its chunk has loaded. */
function editor(): Promise<HTMLElement> {
  return screen.findByRole('textbox', { name: 'Script' });
}

function staged() {
  return deviceStore.getState().config?.script;
}

it('renders nothing until a keyboard configuration is loaded', () => {
  const { container } = renderPage();
  expect(container).toBeEmptyDOMElement();
});

it('says when the keyboard does not support scripts (Zellia Starlight)', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const keyboard = await connectVirtualKeyboard({ seedDynamicKeys: false });
  onTestFinished(keyboard.dispose);

  renderPage();

  expect(
    screen.getByRole('heading', { name: 'This keyboard does not support scripts' })
  ).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

describe('ScriptsPage (Trinity Pad, AOT)', { timeout: 20_000 }, () => {
  let keyboard: ConnectedKeyboard;

  beforeEach(async () => {
    // The vendored controller logs every load step.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    keyboard = await connectVirtualKeyboard({ model: 'trinity-pad', seedDynamicKeys: false });
  });

  afterEach(() => {
    keyboard.dispose();
  });

  it('compiles the example after the edit and stages it with its bytecode', async () => {
    const user = userEvent.setup();
    renderPage();
    await editor();
    expect(staged()).toEqual({ source: '', bytecode: [] });

    await user.click(screen.getByRole('button', { name: 'Load example' }));

    expect(screen.getByRole('status')).toHaveTextContent('Compiling…');
    await screen.findByText(/^Compiled: \d+ bytes — sent to the keyboard on Save$/, {}, COMPILED);
    expect(staged()?.source).toBe(EXAMPLE_SCRIPT);
    expect(staged()?.bytecode.slice(0, 2)).toEqual([0xfb, 0xac]);
    const bytes = staged()?.bytecode.length ?? 0;
    expect(screen.getByRole('status')).toHaveTextContent(
      `Compiled: ${bytes} bytes — sent to the keyboard on Save`
    );
    expect(screen.getByText(`Bytecode (${bytes} bytes)`)).toBeInTheDocument();
    expect(deviceStore.getState().unsaved).toBe(true);
  });

  it('shows the errors with their lines and keeps the last compiled script staged', async () => {
    renderPage();
    const content = await editor();
    act(() => {
      setEditorText(content, 'function loop() {}\n');
    });
    await screen.findByText(/^Compiled: \d+ bytes/, {}, COMPILED);
    const compiled = staged();

    act(() => {
      setEditorText(content, BROKEN);
    });

    await screen.findByText('Errors: fix them to send this script', {}, COMPILED);
    expect(screen.getByText('Line 2: unexpected character in expression')).toBeInTheDocument();
    expect(staged()).toEqual(compiled);
    expect(compiled?.source).toBe('function loop() {}\n');
  });

  it('compiles once the edits pause', async () => {
    const compile = vi.fn<Compile>(nodeCompiler);
    renderPage(compile);
    const content = await editor();

    act(() => {
      setEditorText(content, 'function loop() {');
    });
    act(() => {
      setEditorText(content, 'function loop() {}');
    });

    await screen.findByText(/^Compiled: \d+ bytes/, {}, COMPILED);
    expect(compile).toHaveBeenCalledTimes(1);
    expect(compile).toHaveBeenCalledWith('function loop() {}');
  });

  it("warns when the script or its bytecode exceed libamp's default 1 KB buffers", async () => {
    renderPage();
    const content = await editor();

    // 1117 bytes and the terminating NUL; the bytecode holds the 1100-character string as well.
    act(() => {
      setEditorText(content, `console.log("${'x'.repeat(1100)}");\n`);
    });

    await screen.findByText(/^Compiled: \d+ bytes/, {}, COMPILED);
    expect(
      screen.getByText('The script is 1118 bytes; libamp keyboards hold 1024 by default.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^The bytecode is \d+ bytes; libamp keyboards hold 1024 by default\.$/)
    ).toBeInTheDocument();
  });

  it('opens a .js file in the editor and saves the text as script.js', async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation(object => {
      if (object instanceof Blob) blobs.push(object);
      return 'blob:script';
    });
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const downloads: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloads.push({ href: this.href, download: this.download });
    });
    renderPage();
    const content = await editor();

    await user.upload(
      screen.getByLabelText('Open .js'),
      new File(['function loop() {}\n'], 'mine.js', { type: 'text/javascript' })
    );
    await waitFor(() => {
      expect(content).toHaveTextContent('function loop() {}');
    });
    await user.click(screen.getByRole('button', { name: 'Save .js' }));

    expect(downloads).toEqual([{ href: 'blob:script', download: 'script.js' }]);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:script');
    expect(blobs[0]?.type).toBe('text/javascript');
    expect(await blobs[0]?.text()).toBe('function loop() {}\n');
  });

  it('stages the text as it is typed on keyboards that compile scripts themselves (JIT)', async () => {
    const compile = vi.fn<Compile>(nodeCompiler);
    render(<ScriptWorkspace initialSource="" bytecode={[]} aot={false} compile={compile} />);
    const content = await editor();
    expect(screen.getByRole('status')).toHaveTextContent(
      'This keyboard compiles scripts itself: the text is sent to it on Save.'
    );

    act(() => {
      setEditorText(content, 'function loop() {}');
    });

    expect(staged()).toEqual({ source: 'function loop() {}', bytecode: [] });
    expect(compile).not.toHaveBeenCalled();
    expect(screen.queryByText(/^Bytecode/)).not.toBeInTheDocument();
  });
});
