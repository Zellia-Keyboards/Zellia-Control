<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  interface KeyEvent {
    time: string;
    type: 'Press' | 'Release';
    key: string;
    delta: number;
  }

  let events: KeyEvent[] = $state([]);
  let isListening = $state(false);
  let lastEventTime = $state<number | null>(null);
  let startTime = $state<number | null>(null);
  let pressedKeys = $state<Set<string>>(new Set());

  function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    return `${seconds}.${milliseconds.toString().padStart(3, '0')}s`;
  }

  function getKeyName(event: KeyboardEvent): string {
    // Handle special keys
    if (event.code) {
      return event.code;
    }
    return event.key || 'Unknown';
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!isListening) return;

    // Prevent default for most keys to avoid browser shortcuts
    event.preventDefault();

    const keyName = getKeyName(event);
    
    // Skip if key is already pressed (prevent repeat events)
    if (pressedKeys.has(keyName)) return;
    
    pressedKeys = new Set([...pressedKeys, keyName]);

    const now = performance.now();
    if (startTime === null) {
      startTime = now;
    }

    const elapsedMs = Math.round(now - startTime);
    const delta = lastEventTime !== null ? Math.round(now - lastEventTime) : 0;
    lastEventTime = now;

    const newEvent: KeyEvent = {
      time: formatTime(elapsedMs),
      type: 'Press',
      key: keyName,
      delta,
    };

    events = [...events, newEvent];
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (!isListening) return;

    event.preventDefault();

    const keyName = getKeyName(event);
    
    // Remove key from pressed set
    const newPressedKeys = new Set(pressedKeys);
    newPressedKeys.delete(keyName);
    pressedKeys = newPressedKeys;

    const now = performance.now();
    if (startTime === null) {
      startTime = now;
    }

    const elapsedMs = Math.round(now - startTime);
    const delta = lastEventTime !== null ? Math.round(now - lastEventTime) : 0;
    lastEventTime = now;

    const newEvent: KeyEvent = {
      time: formatTime(elapsedMs),
      type: 'Release',
      key: keyName,
      delta,
    };

    events = [...events, newEvent];
  }

  function startListening() {
    events = [];
    lastEventTime = null;
    startTime = null;
    isListening = true;
  }

  function stopListening() {
    isListening = false;
  }

  function clearEvents() {
    events = [];
    lastEventTime = null;
    startTime = null;
    pressedKeys = new Set();
  }

  onMount(() => {
    if (browser) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }

    return () => {
      if (browser) {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      }
    };
  });
</script>

<div class="flex gap-5 h-full min-h-[500px]">
  <!-- Left Panel - Info -->
  <div class="w-[280px] flex flex-col gap-4 shrink-0 overflow-visible">
    <!-- Info Card -->
    <div class="glassmorphism-card p-5 rounded-xl">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-2 h-2 rounded-full bg-primary-500"></div>
        <h3 class="text-sm font-bold text-gray-900 dark:text-white">About Key Test</h3>
      </div>
      <div class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-3">
        <p>
          This tool is for general-purpose key testing and works with any keyboard.
        </p>

        <p class="text-amber-600 dark:text-amber-400">
          <strong>Note:</strong> Due to browser limitations, some keys cannot be tested and timing may not be perfectly accurate.
        </p>
      </div>
    </div>

    <!-- Control Card -->
    <div class="glassmorphism-card p-5 rounded-xl">
      <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Controls</h4>
      <div class="flex flex-col gap-3">
        {#if !isListening}
          <button
            type="button"
            class="w-full px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 hover:shadow-xl active:scale-95"
            onclick={startListening}
          >
            Start Listening
          </button>
        {:else}
          <button
            type="button"
            class="w-full px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl active:scale-95"
            onclick={stopListening}
          >
            Stop Listening
          </button>
        {/if}

        <button
          type="button"
          class="w-full px-6 py-2.5 glassmorphism-button rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md"
          onclick={clearEvents}
        >
          Clear Events
        </button>
      </div>

      {#if isListening}
        <div class="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
            <div>
              <p class="text-sm font-semibold text-green-400">Listening Active</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Press any key to record...</p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Right Panel - Event Table -->
  <div class="flex-1 flex flex-col min-w-0">
    <div class="flex-1 rounded-xl glassmorphism-card min-h-0 overflow-hidden flex flex-col">
      <!-- Table Header -->
      <div class="grid grid-cols-4 gap-4 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
        <div class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Time</div>
        <div class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type</div>
        <div class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Key</div>
        <div class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Delta (ms)</div>
      </div>

      <!-- Table Body -->
      <div class="flex-1 overflow-y-auto">
        {#if events.length === 0}
          <div class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 py-12">
            <svg class="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            {#if isListening}
              <p class="text-sm font-medium">Press any key to start recording...</p>
            {:else}
              <p class="text-sm font-medium">Click "Start Listening" to begin</p>
              <p class="text-xs mt-1 text-gray-400">Events will appear here</p>
            {/if}
          </div>
        {:else}
          {#each events as event, index (index)}
            <div
              class="grid grid-cols-4 gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800/50 text-sm transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/30 {event.type === 'Press' ? 'bg-green-50/30 dark:bg-green-900/10' : 'bg-orange-50/30 dark:bg-orange-900/10'}"
            >
              <div class="text-gray-600 dark:text-gray-300 font-mono">{event.time}</div>
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full {event.type === 'Press' ? 'bg-green-500' : 'bg-orange-500'}"></div>
                <span class="{event.type === 'Press' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'} font-semibold">
                  {event.type}
                </span>
              </div>
              <div class="font-mono font-bold text-gray-900 dark:text-white">{event.key}</div>
              <div class="text-gray-500 dark:text-gray-400 font-mono">{event.delta}</div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>
