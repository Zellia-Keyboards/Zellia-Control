<script lang="ts">
  interface Props {
    direction: number;
    onDirectionChange: (value: number) => void;
  }

  let { direction, onDirectionChange }: Props = $props();

  let isDragging = $state(false);

  function handlePointerDown(e: PointerEvent) {
    isDragging = true;
    updateDirectionFromEvent(e);
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (isDragging) {
      updateDirectionFromEvent(e);
    }
  }

  function handlePointerUp(e: PointerEvent) {
    isDragging = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
  }

  function updateDirectionFromEvent(e: PointerEvent) {
    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;

    let angle = Math.atan2(-y, x) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    angle = (angle + 180) % 360;

    onDirectionChange(Math.round(angle));
  }
</script>

<div class="flex items-center gap-3">
  <!-- Compact circular dial -->
  <svg
    class="w-16 h-16"
    viewBox="0 0 64 64"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointerleave={handlePointerUp}
    style="touch-action: none;"
  >
    <!-- Background ring -->
    <circle
      cx="32"
      cy="32"
      r="26"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      class="text-gray-200 dark:text-gray-700"
    />

    <!-- Active arc -->
    {#if direction > 0}
      {@const startSvg = 180}  <!-- Our 0° = left = SVG 180° -->
      {@const endSvg = (180 + direction + 360) % 360}  <!-- Convert our direction to SVG angle -->
      {@const startX = 32 + 26 * Math.cos(startSvg * Math.PI / 180)}
      {@const startY = 32 - 26 * Math.sin(startSvg * Math.PI / 180)}
      {@const endX = 32 + 26 * Math.cos(endSvg * Math.PI / 180)}
      {@const endY = 32 - 26 * Math.sin(endSvg * Math.PI / 180)}
      {@const largeArc = direction <= 180 ? 1 : 0}
      <path
        d="M {startX} {startY} A 26 26 0 {largeArc} 1 {endX} {endY}"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        class="text-primary"
      />
    {/if}

    <!-- Direction indicator -->
    {#if true}
      {@const indicatorAngle = ((direction - 180 + 360) % 360) * Math.PI / 180}
      {@const indX = 32 + 26 * Math.cos(indicatorAngle)}
      {@const indY = 32 - 26 * Math.sin(indicatorAngle)}
      <circle
        cx={indX}
        cy={indY}
        r="4"
        fill="currentColor"
        class="text-primary"
      />
    {/if}

    <!-- Center arrow -->
    <g transform="translate(32, 32)">
      {#if true}
        {@const arrowAngle = ((direction - 180 + 360) % 360) * Math.PI / 180}
        <path
          d="M {Math.cos(arrowAngle) * 10} {-Math.sin(arrowAngle) * 10}
             L {Math.cos(arrowAngle + 2.3) * 5} {-Math.sin(arrowAngle + 2.3) * 5}
             L {Math.cos(arrowAngle - 2.3) * 5} {-Math.sin(arrowAngle - 2.3) * 5}
             Z"
          fill="currentColor"
          class="text-gray-600 dark:text-gray-400"
        />
      {/if}
    </g>
  </svg>

  <!-- Degree display and input -->
  <div class="min-w-[4rem]">
    <input
      type="number"
      min="0"
      max="360"
      value={direction}
      oninput={(e) => onDirectionChange(Math.min(360, Math.max(0, Number((e.target as HTMLInputElement).value) || 0)))}
      class="w-full px-2 py-1 text-xl font-semibold text-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all glassmorphism-button"
    />
    <div class="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-0.5">
      {#if direction === 0}
        ← RTL
      {:else if direction === 90}
        ↑ DTU
      {:else if direction === 180}
        → LTR
      {:else if direction === 270}
        ↓ UTD
      {:else}
        Custom
      {/if}
    </div>
  </div>
</div>

<style>
  svg {
    cursor: grab;
  }
  svg:active {
    cursor: grabbing;
  }
</style>
