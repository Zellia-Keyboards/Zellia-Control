<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import NewZellia80He from '$lib/NewZellia80HE.svelte';
  import { language, t } from '$lib/LanguageStore.svelte';

  let currentLanguage = $state($language);

  let keyPressReporting = false;
  let isTracking = false;
  let selectedKeyName = '';
  let chartCanvas: HTMLCanvasElement;
  let chart: any;
  let trackingData: { x: number; y: number }[] = [];
  let trackingInterval: NodeJS.Timeout | null = null;
  let startTime = 0;
  let CurrentSelected = $state<[number, number] | null>(null);
  //test data to check
  function generateTestData() {
    const data = [];
    const duration = 30000;
    const sampleRate = 100;

    for (let i = 0; i < duration; i += 10) {
      let distance = 4.0;

      if (Math.random() < 0.02) {
        const pressDepth = Math.random() * 4.0;
        distance = 4.0 - pressDepth;
      }

      distance += (Math.random() - 0.5) * 0.05;
      distance = Math.max(0, Math.min(4.0, distance));

      data.push({
        x: i,
        y: distance,
      });
    }

    return data;
  }
  $effect(() => {
    if (CurrentSelected) {
      const keyPosition = `${CurrentSelected[0]},${CurrentSelected[1]}`;
      selectedKeyName = `Key ${keyPosition}`;
    }
  });

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });

  function handleReset() {}

  function handleRebootRecovery() {}

  function scrollToKeyboard() {}

  function startTracking() {
    if (!selectedKeyName) {
      alert('Please select a key first');
      return;
    }

    isTracking = true;
    startTime = Date.now();
    trackingData = [];

    if (browser) {
      setTimeout(() => {
        trackingData = generateTestData();
        updateChart();

        setTimeout(() => {
          stopTracking();
        }, 30000);
      }, 100);
    }
  }

  function stopTracking() {
    isTracking = false;
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }
  }

  function clearChart() {
    trackingData = [];
    if (chart) {
      chart.data.datasets[0].data = [];
      chart.update();
    }
  }

  function updateChart() {
    if (!chart) return;

    chart.data.datasets[0].data = trackingData;
    chart.update('none');
  }

  function updateChartColors() {
    if (!chart) return;

    const computedStyle = getComputedStyle(document.documentElement);
    const textColor = computedStyle.getPropertyValue('--chart-text-color').trim() || '#6b7280';
    const gridColor = computedStyle.getPropertyValue('--chart-grid-color').trim() || '#e5e7eb';

    // Update chart colors
    if (chart.options.scales?.x) {
      chart.options.scales.x.title.color = textColor;
      chart.options.scales.x.ticks.color = textColor;
      chart.options.scales.x.grid.color = gridColor;
    }
    if (chart.options.scales?.y) {
      chart.options.scales.y.title.color = textColor;
      chart.options.scales.y.ticks.color = textColor;
      chart.options.scales.y.grid.color = gridColor;
    }

    chart.update('none');
  }

  function initChart() {
    if (!browser || !chartCanvas) return;

    import('chart.js/auto').then(async Chart => {
      try {
        const { default: zoomPlugin } = await import('chartjs-plugin-zoom');
        Chart.default.register(zoomPlugin);
      } catch (e) {
        console.warn('Zoom plugin not available:', e);
      }

      const ctx = chartCanvas.getContext('2d');
      if (!ctx) return;

      // Get CSS custom properties for theming
      const computedStyle = getComputedStyle(document.documentElement);
      const textColor = computedStyle.getPropertyValue('--chart-text-color').trim() || '#6b7280';
      const gridColor = computedStyle.getPropertyValue('--chart-grid-color').trim() || '#e5e7eb';

      chart = new Chart.default(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: t('debug.keyDistance', currentLanguage),
              data: [],
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderWidth: 1,
              pointRadius: 0,
              pointHoverRadius: 3,
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              min: 0,
              max: 30000,
              title: {
                display: true,
                text: t('debug.timeLabel', currentLanguage),
                color: textColor,
              },
              ticks: {
                color: textColor,
              },
              grid: {
                color: gridColor,
              },
            },
            y: {
              min: 0,
              max: 4.0,
              reverse: true,
              title: {
                display: true,
                text: t('debug.distanceLabel', currentLanguage),
                color: textColor,
              },
              ticks: {
                color: textColor,
                callback: function (value) {
                  return (value as number).toFixed(1) + t('units.mm', currentLanguage);
                },
              },
              grid: {
                color: gridColor,
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            zoom: {
              pan: {
                enabled: true,
                mode: 'x',
              },
              zoom: {
                wheel: {
                  enabled: true,
                },
                pinch: {
                  enabled: true,
                },
                mode: 'x',
              },
              limits: {
                x: {
                  min: 0,
                  max: 30000,
                },
                y: {
                  min: 0,
                  max: 4.0,
                },
              },
            },
          },
          interaction: {
            intersect: false,
            mode: 'index',
          },
        },
      });
    });
  }

  onMount(() => {
    let themeObserver: MutationObserver | null = null;

    if (browser) {
      setTimeout(initChart, 100);

      // Set up theme observer to update chart colors when dark mode changes
      themeObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            setTimeout(updateChartColors, 50);
          }
        });
      });

      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    return () => {
      if (chart) {
        chart.destroy();
      }
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
      if (themeObserver) {
        themeObserver.disconnect();
      }
    };
  });
</script>

<NewZellia80He
  onClick={(x, y, event) => {
    console.log(`Key clicked at (${x}, ${y})`, event);
  }}
  bind:currentSelectedKey={CurrentSelected}
>
  {#snippet body(x, y)}
    <div
      class="hover:scale-90 transition-all duration-300 h-14 bg-gray-50 dark:bg-black border-gray-400 dark:border-gray-700 data-[selected=true]:bg-gray-500 data-[selected=true]:border-gray-700 data-[selected=true]:border-4 border rounded-lg flex flex-col items-center justify-center hover:cursor-pointer gap-1 font-sans text-white"
    ></div>{/snippet}
</NewZellia80He>
<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow glassmorphism-card text-black dark:text-white border-0 dark:border dark:border-gray-600 flex flex-col bg-primary-50 dark:bg-black"
>
  <div class="flex items-center justify-between -mt-4 mb-2">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
      {t('debug.title', currentLanguage)}
    </h2>
  </div>

  <div class="rounded-xl shadow p-6 space-y-8 flex-1 border border-gray-200 dark:border-gray-600">
    <!-- Key Press Reporting -->
    <div
      class="p-5 rounded-lg border glassmorphism-card border-gray-200 dark:border-gray-600 bg-primary-50 dark:bg-black"
    >
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          {t('debug.keyPressReporting', currentLanguage)}
        </h3>
        <button
          class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none"
          aria-label="Key Press Reporting Toggle"
          class:bg-blue-600={keyPressReporting}
          class:bg-gray-300={!keyPressReporting}
          on:click={() => (keyPressReporting = !keyPressReporting)}
        >
          <span
            class="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow"
            class:translate-x-6={keyPressReporting}
            class:translate-x-1={!keyPressReporting}
          ></span>
        </button>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {t('debug.keyPressReportingDesc', currentLanguage)}
      </p>
    </div>
    <!-- Reset Configuration -->
    <div
      class="p-5 rounded-lg border glassmorphism-card border-gray-200 dark:border-gray-600 bg-primary-50 dark:bg-black"
    >
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {t('debug.reset', currentLanguage)}
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('debug.resetDesc', currentLanguage)}
      </p>
      <button
        type="button"
        class="inline-block min-w-[120px] text-white border-none rounded-md px-4 py-2 font-semibold transition-colors duration-200 bg-red-700 hover:bg-red-600 hover:opacity-90 glassmorphism-button"
        on:click={handleReset}
      >
        {t('debug.resetButton', currentLanguage)}
      </button>
    </div>
    <!-- Recovery Mode -->
    <div
      class="p-5 rounded-lg border glassmorphism-card border-gray-200 dark:border-gray-600 bg-primary-50 dark:bg-black"
    >
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {t('debug.recoveryMode', currentLanguage)}
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('debug.recoveryModeDesc', currentLanguage)}
      </p>
      <button
        type="button"
        class="inline-block min-w-[120px] text-white border-none rounded-md px-4 py-2 font-semibold transition-colors duration-200 bg-purple-600 hover:bg-purple-500 hover:opacity-90"
        on:click={handleRebootRecovery}
      >
        {t('debug.recoveryModeButton', currentLanguage)}
      </button>
    </div>
    <!-- Key Tracking Section -->
    <div
      class="p-5 rounded-lg border glassmorphism-card border-gray-200 dark:border-gray-600 bg-primary-50 dark:bg-black"
    >
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t('debug.keyTracking', currentLanguage)}
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('debug.keyTrackingDesc', currentLanguage)}
      </p>

      <div class="flex items-start gap-4 mb-4">
        <!-- Left column: controls -->
        <div class="flex flex-col gap-3 min-w-[200px]">
          <!-- Select Key -->
          <button
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors glassmorphism-button"
            on:click={scrollToKeyboard}
          >
            {t('debug.selectKey', currentLanguage)}
          </button>

          <!-- Selected key display -->
          <div class="text-sm text-gray-700 dark:text-gray-300">
            {selectedKeyName
              ? `${t('debug.selectedKey', currentLanguage)}: ${selectedKeyName}`
              : t('debug.noKeySelected', currentLanguage)}
          </div>

          <!-- Start/Stop Tracking -->
          {#if !isTracking}
            <button
              type="button"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 glassmorphism-button"
              on:click={startTracking}
              disabled={!selectedKeyName}
            >
              {t('debug.startTracking', currentLanguage)}
            </button>
          {:else}
            <button
              type="button"
              class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors glassmorphism-button"
              on:click={stopTracking}
            >
              {t('debug.stopTracking', currentLanguage)}
            </button>
          {/if}
          <!-- Clear button -->
          <button
            type="button"
            class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors glassmorphism-button"
            on:click={clearChart}
          >
            {t('debug.clearChart', currentLanguage)}
          </button>
        </div>
        <!-- Right column: chart -->
        <div class="flex-1 min-h-[400px]">
          <div
            class="border glassmorphism-card border-gray-300 dark:border-gray-600 rounded-lg p-4 h-full bg-primary-25 dark:bg-primary-975"
          >
            <canvas bind:this={chartCanvas} class="w-full h-full"></canvas>
          </div>
        </div>
      </div>

      <!-- Chart controls -->
      <div class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <span>💡 Tip: Use mouse wheel to zoom horizontally, drag to pan</span>
      </div>
    </div>
  </div>
</div>

<style>
  :global(:root) {
    --chart-text-color: #6b7280; /* gray-500 */
    --chart-grid-color: #e5e7eb; /* gray-200 */
  }

  :global(.dark) {
    --chart-text-color: #9ca3af; /* gray-400 */
    --chart-grid-color: #374151; /* gray-700 */
  }
</style>
