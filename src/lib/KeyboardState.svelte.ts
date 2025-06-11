import { writable } from 'svelte/store';

const KeyboardDisplayValues = writable([
    ['ESC', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'PSC', 'SLK', 'PAU'],
    ['`\n~', '1\n!', '2\n@', '#\n3', '4\n$', '5\n%', '6\n^', '7\n&', '8\n*', '9\n(', '0\n)', '-\n_', '=\n+', 'BACKSPACE', 'INS', 'HOM', 'PGU'],
    ['TAB', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[\n{', ']\n}', '\\\n|', 'DEL', 'END', 'PGD'],
    ['CAPS', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';\n:', "'\n\"", 'ENTER'],
    ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',\n<', '.\n>', '/\n?', 'SHIFT', '↑'],
    ['CTRL', 'WIN', 'ALT', 'SPACE', 'ALT', 'FN', 'CTRL', '←', '↓', '→'],
]);

const KeyboardKeySizes = writable([
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1, 1, 1],
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
    [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75, 1],
    [1.5, 1, 1.5, 7, 1.5, 1, 1.5, 1, 1, 1],
]);

export { KeyboardDisplayValues, KeyboardKeySizes };