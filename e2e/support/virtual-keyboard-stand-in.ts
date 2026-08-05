/**
 * Stand-in for src/testing/virtual-keyboard/browser.ts that exercises the `virtualKeyboard`
 * fixture (bundling and injection) without the real simulator.
 */
const hid = {
  getDevices: () => Promise.resolve([]),
  requestDevice: () => Promise.resolve([]),
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
Object.defineProperty(navigator, 'hid', { configurable: true, value: hid });

const state = {
  // Init scripts run before the document is parsed, hence before any app script.
  installedBeforeDocument: document.getElementById('root') === null,
  disconnected: false,
};

window.__virtualKeyboard = {
  device: null,
  hid,
  state,
  sentReports: [],
  disconnect() {
    state.disconnected = true;
  },
};
