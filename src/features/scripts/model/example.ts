/**
 * The Scripts page's example ("Load example"): it does what the upstream configurator's demo
 * does — watch key 2 and, when it goes down, tap A for 100 ms and log it — in our own words.
 */
export const EXAMPLE_SCRIPT = `// Runs once when the script starts: report the presses of key 2.
keyboard.watch(2);

// Runs on every keyboard tick.
function loop() {}

// A watched key went down.
function onKeyDown(key) {
  if (key.id == 2) {
    // Tap A (keycode 0x04) for 100 ms and say so in the keyboard's console.
    keyboard.tap(0x0004, 100);
    console.log("Key " + key.id + " pressed");
  }
}

// A watched key went up.
function onKeyUp(key) {}
`;
