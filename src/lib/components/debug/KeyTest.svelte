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
      key: getKeyName(event),
      delta,
    };

    events = [...events, newEvent];
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (!isListening) return;

    event.preventDefault();

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
      key: getKeyName(event),
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

<div class="flex gap-6 h-[600px]">
  <!-- Left Panel - Info -->
  <div class="w-[320px] flex flex-col gap-4 shrink-0">
    <div class="p-5 rounded-xl glassmorphism-card">
      <p class="text-sm text-gray-300 leading-relaxed mb-4">
        This tool is intended for general-purpose key testing and can be used with any keyboard, but
        it is not suitable for specialized purposes such as latency testing.
      </p>

      <p class="text-sm text-gray-300 leading-relaxed">
        Due to the limitations of the browser environment, some keys cannot be tested and the
        obtained time may not be accurate.
      </p>
    </div>

    <div class="p-5 rounded-xl glassmorphism-card">
      <div class="flex flex-col gap-3">
        {#if !isListening}
          <button
            type="button"
            class="w-full px-6 py-2.5 glassmorphism-button rounded-lg text-sm font-medium"
            onclick={startListening}
          >
            Start Listening
          </button>
        {:else}
          <button
            type="button"
            class="w-full px-6 py-2.5 glassmorphism-button rounded-lg text-sm font-medium"
            onclick={stopListening}
          >
            Stop Listening
          </button>
        {/if}

        <button
          type="button"
          class="w-full px-6 py-2.5 glassmorphism-button rounded-lg text-sm font-medium"
          onclick={clearEvents}
        >
          Clear
        </button>
      </div>

      {#if isListening}
        <div class="mt-4 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span class="text-sm text-green-400">Listening for key events...</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Right Panel - Event Table -->
  <div class="flex-1 flex flex-col min-w-0">
    <div class="flex-1 rounded-xl glassmorphism-card p-4 min-h-0 overflow-hidden flex flex-col">
      <!-- Table Header -->
      <div
        class="grid grid-cols-4 gap-4 px-4 py-3 border-b border-gray-700/50 text-sm font-medium text-gray-400"
      >
        <div>Time</div>
        <div>Type</div>
        <div>Key</div>
        <div>Delta (ms)</div>
      </div>

      <!-- Table Body -->
      <div class="flex-1 overflow-y-auto">
        {#if events.length === 0}
          <div class="flex items-center justify-center h-full text-gray-500">
            {#if isListening}
              Press any key to start recording...
            {:else}
              Click "Start Listening" to begin
            {/if}
          </div>
        {:else}
          {#each events as event, index (index)}
            <div
              class="grid grid-cols-4 gap-4 px-4 py-2.5 border-b border-gray-800/50 text-sm {event.type ===
              'Press'
                ? 'text-green-400'
                : 'text-orange-400'}"
            >
              <div class="text-gray-300">{event.time}</div>
              <div class={event.type === 'Press' ? 'text-green-400' : 'text-orange-400'}>
                {event.type}
              </div>
              <div class="font-mono text-white">{event.key}</div>
              <div class="text-gray-400">{event.delta}</div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>
