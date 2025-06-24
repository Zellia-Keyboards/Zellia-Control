<div class="space-y-2">
    <div
        class="flex *:size-14 *:text-wrap *:text-sm *:border *:not-first:ml-2
                [&>*:nth-child(2)]:ml-8 [&>*:nth-child(6)]:ml-8
                [&>*:nth-child(10)]:ml-8 [&>*:nth-child(15)]:ml-8"
    >
        <button>Esc</button>
        <button>F1</button>
        <button>F2</button>
        <button>F3</button>
        <button>F4</button>
        <button>F5</button>
        <button>F6</button>
        <button>F7</button>
        <button>F8</button>
        <button>F9</button>
        <button>F10</button>
        <button>F11</button>
        <button>F12</button>
        <button>None</button>
        <button>Print Screen</button>
        <button>Scroll Lock</button>
        <button>Pause</button>
    </div>
    <div
        class="flex *:size-14 *:text-wrap *:text-sm *:border *:not-first:ml-2 mt-2
                [&>*:nth-child(14)]:w-32 [&>*:nth-child(15)]:ml-8"
    >
        <button>~</button>
        <button>1</button>
        <button>2</button>
        <button>3</button>
        <button>4</button>
        <button>5</button>
        <button>6</button>
        <button>7</button>
        <button>8</button>
        <button>9</button>
        <button>0</button>
        <button>-</button>
        <button>=</button>
        <button>Backspace</button>
        <button>Insert</button>
        <button>Home</button>
        <button>Page Up</button>
    </div>
    <div
        class="flex *:size-14 *:text-wrap *:text-sm *:border *:not-first:ml-2 mt-2
                *:first:w-21 [&>*:nth-child(14)]:w-25 [&>*:nth-child(15)]:ml-8"
    >
        <button>Tab</button>
        <button>Q</button>
        <button>W</button>
        <button>E</button>
        <button>R</button>
        <button>T</button>
        <button>Y</button>
        <button>U</button>
        <button>I</button>
        <button>O</button>
        <button>P</button>
        <button>[</button>
        <button>]</button>
        <button>\</button>
        <button>Delete</button>
        <button>End</button>
        <button>Page Down</button>
    </div>
    <div
        class="flex *:size-14 *:text-wrap *:text-sm *:border *:not-first:ml-2 mt-2
                *:first:w-25 *:last:w-37"
    >
        <button>Caps Lock</button>
        <button>A</button>
        <button>S</button>
        <button>D</button>
        <button>F</button>
        <button>G</button>
        <button>H</button>
        <button>J</button>
        <button>K</button>
        <button>L</button>
        <button>;</button>
        <button>'</button>
        <button>Enter</button>
    </div>
    <div
        class="flex *:size-14 *:text-wrap *:text-sm *:border *:not-first:ml-2 mt-2
                *:first:w-32 [&>*:nth-last-child(2)]:w-46 *:last:ml-24"
    >
        <button>Shift</button>
        <button>Z</button>
        <button>X</button>
        <button>C</button>
        <button>V</button>
        <button>B</button>
        <button>N</button>
        <button>M</button>
        <button>,</button>
        <button>.</button>
        <button>/</button>
        <button>Shift</button>
        <button>↑</button>
    </div>
    <div
        class="flex *:h-14 *:w-18 *:text-wrap *:text-sm *:border *:not-first:ml-2 mt-2
                [&>*:nth-child(4)]:w-100 [&>*:nth-last-child(-n+3)]:w-14
                [&>*:nth-last-child(3)]:ml-8"
    >
        <button>Ctrl</button>
        <button>Win</button>
        <button>Alt</button>
        <button>Space</button>
        <button>Alt</button>
        <button>Fn</button>
        <button>Menu</button>
        <button>Ctrl</button>
        <button>←</button>
        <button>↓</button>
        <button>→</button>
    </div>
</div>

<!-- TODO: Fix text wrapping -->
<div class="flex mt-8 justify-between">
    <div
        class="grid grid-cols-5 grid-rows-5 gap-2 *:size-14 *:border-2 *:border-white **:tracking-wide"
    >
        <button>Num Lock</button>
        <button>/</button>
        <button>*</button>
        <button>-</button>
        <button>=</button>
        <button>7 Home</button>
        <button>8 ↑</button>
        <button>9 PgUp</button>
        <button class="row-span-2 !h-full w-full border-2 border-white"
            >+</button
        >
        <button class="row-start-3">4 ←</button>
        <button class="row-start-3">5</button>
        <button class="row-start-3">6 →</button>
        <button class="row-start-4">1 End</button>
        <button class="row-start-4">2 ↓</button>
        <button class="row-start-4">3 PgDn</button>
        <button
            class="row-span-2 !h-full w-full size-14 border-2 border-white row-start-4"
            >Enter</button
        >
        <button class="col-span-2 row-start-5 !w-full">0 Ins</button>
        <button class="row-start-5">. Del</button>
    </div>

    <div class="grid grid-cols-13  grid-rows-4 *:size-14 *:border-2 gap-2 *:border-white align-top">
        <button class="col-span-2 !w-full">Non-US =~</button>
        <button class="col-span-2 !w-full">Non-US \:</button>
        <button>\</button>
        <button>|</button>
        <button>.</button>
        <button  class="col-span-2 !w-full">無変換</button>
        <button  class="col-span-2 !w-full">変換</button>
        <button  class="col-span-2 !w-full">カタカナひらがな</button>
        <button  class="col-span-2 !w-full">ImeOn</button>
        <button  class="col-span-2 !w-full">ImeOff</button>
    </div>
</div>

<div class="flex gap-2 mt-8 *:nth-[4n+5]:ml-8 *:size-14 *:border-2 *:border-white">
    <button>F13</button>
    <button>F14</button>
    <button>F15</button>
    <button>F16</button>
    <button>F17</button>
    <button>F18</button>
    <button>F19</button>
    <button>F20</button>
    <button>F21</button>
    <button>F22</button>
    <button>F23</button>
    <button>F24</button>
</div>