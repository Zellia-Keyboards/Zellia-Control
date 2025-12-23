<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { keyboardAPI, keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import { selectedKeys, deselectAll } from '$lib/stores/SelectedKeysStore';
  import KeyboardSelector from './KeyboardSelector.svelte';

  let currentLanguage = $derived($language);

  let isTracking = $state(false);
  let selectedKeyName = $state('');
  let isModalOpen = $state(false);
  let chartCanvas: HTMLCanvasElement;
  let chart: any;
  let trackingData: { x: number; y: number }[] = $state.raw([]);
  let trackingInterval: NodeJS.Timeout | null = null;
  let startTime = 0;
  const WINDOW_MS = 500; // 滑动窗口大小（0.5秒）
  let timer : NodeJS.Timeout;
  let handleDataUpdate: (() => void) | null = null;

  // Props
  interface Props {
    currentSelected: [number, number] | null;
    onSelectKey?: () => void;
  }

  let { currentSelected, onSelectKey }: Props = $props();

  function openKeySelector() {
    isModalOpen = true;
  }

  function handleKeySelected(event: CustomEvent<number>) {
    const keyIndex = event.detail;
    selectedKeyName = `Key ${keyIndex}`;
    // The $effect watching $selectedKeys will handle starting the debug
  }

  function percentToMm(distance: number) {
    return distance * 4.0;
  }


  function startTracking() {
    if (!selectedKeyName) {
      alert('Please select a key first');
      return;
    }

    const controller = keyboardConnectionState.controller;
    const keyIndex = $selectedKeys[0]; // 假设我们只追踪第一个选中的键

    if (!controller || keyIndex === undefined) {
      alert('Controller not connected or no key index found.');
      return;
    }

    isTracking = true;
    startTime = Date.now();
    trackingData = [];
    updateChart(); // 清空图表

    // 1. 创建事件监听器
    handleDataUpdate = () => {
      const keyData = controller.advanced_keys[keyIndex];
      if (keyData) {
        const elapsedTime = Date.now() - startTime;
        // keyData.value 是来自控制器的实时距离值
        trackingData = [...trackingData, { x: elapsedTime, y: keyData.value }];

        // 限制数据点数量以提高性能（可选）
        // if (trackingData.length > 500) {
        //   trackingData.shift(); 
        // }

        updateChart();
      }
    }
  }

  function stopTracking() {
    isTracking = false;
      if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
      }
      // 移除事件监听器
      if (handleDataUpdate && keyboardConnectionState.controller) {
        keyboardConnectionState.controller.removeEventListener('updateData', handleDataUpdate);
        handleDataUpdate = null;
    }
  }

  // 1. 停止调试的函数
  function stopDebug() {
    isTracking = false;
    // 停止轮询
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }
    // 移除事件监听器
    if (handleDataUpdate && keyboardConnectionState.controller) {
      keyboardConnectionState.controller.removeEventListener('updateData', handleDataUpdate);
      handleDataUpdate = null;
    }
    console.log("Debug stopped.");
  }

  // 2. 开始调试的函数
  function startDebug(keyIndex: number) {
    stopDebug(); // 先停止确保干净启动

    const controller = keyboardConnectionState.controller;

    if (!controller) {
      console.error('Controller not connected.');
      return;
    }
    
    isTracking = true;
    startTime = Date.now();
    trackingData = [];
    updateChart(); // 清空图表

    // 创建事件监听器
    handleDataUpdate = () => {
      const keyData = controller.advanced_keys[keyIndex];
      if (keyData) {
        const elapsedTime = Date.now() - startTime;
        // 使用 keyData.value 作为实时距离值
        trackingData = [...trackingData, { x: elapsedTime, y: percentToMm(keyData.value) }];
        updateChart();
      }
    };

    // 注册监听器
    controller.addEventListener('updateData', handleDataUpdate);

    // 启动轮询以请求数据
    trackingInterval = setInterval(() => {
      // 检查 isTracking 状态以确保停止时清除 interval
      if (!isTracking) {
        clearInterval(trackingInterval!);
        return;
      }
      controller.request_debug_at([keyIndex]);
    }, 5); // 100 毫秒间隔
    
    console.log(`Debug started for key index: ${keyIndex}`);
  }

  // 3. 响应式副作用：监听选中的键
  $effect(() => {
    // 满足“selectedKeys只能是一个键”的要求
    if ($selectedKeys.length === 1) {
      const keyIndex = $selectedKeys[0];
      const controller = keyboardConnectionState.controller;

      if (controller) {
        // 满足“选择该键后立即开始调试”的要求
        startDebug(keyIndex);
        selectedKeyName = `Key ${keyIndex}`; // 更新UI显示
      }
    } else {
      // 如果没有键或选择了多个键，则停止调试
      stopDebug();
      selectedKeyName = '';
    }
  });

  function clearChart() {
    trackingData = [];
    selectedKeyName = '';
    deselectAll();
    stopDebug();
    if (chart) {
      chart.data.datasets[0].data = [];
      chart.resetZoom();
      chart.update();
    }
  }

  function resetZoom() {
    if (chart) {
      chart.resetZoom();
      chart.options.scales.y.min = 0;
      chart.options.scales.y.max = 4.0;
      chart.update();
    }
  }

  function updateChart() {
    if (!chart) return;
    
    // 取最后一个时间作为“当前”
    const lastX = trackingData.length ? trackingData[trackingData.length - 1].x : 0;
    const cutoff = Math.max(0, lastX - WINDOW_MS);
  
    // 固定 x 轴显示范围到最近 30s
    if (lastX > WINDOW_MS) {
      chart.options.scales.x.min = cutoff;
      chart.options.scales.x.max = lastX;
    } else {
      chart.options.scales.x.min = 0;
      chart.options.scales.x.max = WINDOW_MS;
    }
  
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
              max: 500,
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
                stepSize: 0.2,
                callback: function (value) {
                  return (value as number).toFixed(3) + t('units.mm', currentLanguage);
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
                  minRange: 500,
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
      stopDebug(); // 使用新的 stopDebug 函数进行清理
      if (themeObserver) {
        themeObserver.disconnect();
      }
    };
  });
</script>

<!-- Key Tracking Section -->
<div class="flex gap-6 h-[600px]">
  <!-- Left Sidebar - Two info panels -->
  <div class="w-[320px] flex flex-col gap-4 shrink-0">
    <!-- Description Panel -->
    <div class="p-5 rounded-xl glassmorphism-card flex-1 overflow-auto">
      <p class="text-sm text-gray-300 dark:text-gray-300 leading-relaxed mb-4">
        This tool allows you to track the pressing distance of a key in real time and visualize it in a chart for observation and analysis.
      </p>
      
      <p class="text-sm text-gray-300 dark:text-gray-300 leading-relaxed mb-4">
        Due to fundamental limitations, the keyboard itself cannot distinguish 'normal pressing' from the following objectively existing conditions (including but not limited to). When parameters are set extremely low (e.g., around 0.01mm or even lower), the impact of these conditions becomes very significant.
      </p>
      
      <ul class="space-y-2 text-sm text-gray-300 dark:text-gray-300">
        <li class="flex items-start gap-2">
          <span class="text-gray-500">•</span>
          <span>Hand movement during key press <span class="text-gray-500 cursor-help">ⓘ</span></span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-gray-500">•</span>
          <span>Force changes after the key bottoms out <span class="text-gray-500 cursor-help">ⓘ</span></span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-gray-500">•</span>
          <span>Pressing the key with greater force (compared to a 'normal press') <span class="text-gray-500 cursor-help">ⓘ</span></span>
        </li>
      </ul>
      
      <p class="text-sm text-gray-300 dark:text-gray-300 leading-relaxed mt-4">
        Since the above factors are unavoidable during manual operation, unintended key releases under extremely low settings are considered normal and do not indicate an issue with the keyboard itself.
      </p>
      
      <p class="text-sm text-gray-300 dark:text-gray-300 leading-relaxed mt-4">
        You can simulate in-game operations and compare
      </p>
    </div>

    <!-- Troubleshooting Panel -->
    <div class="p-5 rounded-xl glassmorphism-card">
      <p class="text-sm text-gray-300 dark:text-gray-300 leading-relaxed">
        You can zoom in and out of the chart using the mouse scroll wheel to closely observe changes during triggers or resets. Unintended triggers and resets caused by the mentioned objective factors usually happen very quickly and subtly, requiring zooming in to be properly seen.
      </p>
      
      <button
        type="button"
        class="mt-4 px-6 py-2 glassmorphism-button rounded-lg text-sm font-medium"
        onclick={clearChart}
      >
        Clear
      </button>
    </div>
  </div>

  <!-- Right Side - Chart Area -->
  <div class="flex-1 flex flex-col min-w-0">
    <!-- Chart Container -->
    <div class="flex-1 rounded-xl glassmorphism-card p-4 min-h-0">
      <canvas bind:this={chartCanvas} class="w-full h-full"></canvas>
    </div>
  </div>
</div>

<!-- Bottom Controls Bar -->
<div class="mt-4 flex items-center gap-4 flex-wrap">
  <!-- Key selection -->
  <div class="flex items-center gap-3">
    <span class="text-sm text-gray-400 dark:text-gray-400">Select the key to track</span>
    <button
      onclick={openKeySelector}
      class="px-4 py-2 text-sm font-medium glassmorphism-button rounded-lg min-w-[80px]"
      disabled={!keyboardConnectionState.controller}
    >
      {selectedKeyName || 'None'}
    </button>
  </div>
  
  <!-- Spacer -->
  <div class="flex-1"></div>
  
  <!-- Action buttons -->
  <div class="flex items-center gap-2">
    {#if !isTracking}
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium glassmorphism-button rounded-lg {!selectedKeyName ? 'opacity-50 cursor-not-allowed' : ''}"
        disabled={!selectedKeyName}
        onclick={() => {
          const keyIndex = $selectedKeys[0];
          if (keyIndex !== undefined) startDebug(keyIndex);
        }}
      >
        Start
      </button>
    {:else}
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium glassmorphism-button rounded-lg"
        onclick={stopDebug}
      >
        Stop
      </button>
    {/if}
  </div>
  
  <!-- Zoom controls -->
  <div class="flex items-center gap-2">
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium glassmorphism-button rounded-lg"
      onclick={resetZoom}
    >
      Reset zoom
    </button>
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium glassmorphism-button rounded-lg"
      onclick={() => {
        if (chart) {
          chart.options.scales.y.min = 3.9;
          chart.options.scales.y.max = 4.0;
          chart.update();
        }
      }}
    >
      Zoom to the bottom 0.1mm
    </button>
  </div>
</div>

<!-- Keyboard Selector Modal -->
<KeyboardSelector bind:isOpen={isModalOpen} on:selectKey={handleKeySelected} />

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
