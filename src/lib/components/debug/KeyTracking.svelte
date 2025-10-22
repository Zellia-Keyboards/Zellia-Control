<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { keyboardAPI, keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import { selectedKeys } from '$lib/stores/SelectedKeysStore';

  let currentLanguage = $derived($language);

  let isTracking = $state(false);
  let selectedKeyName = $state('');
  let chartCanvas: HTMLCanvasElement;
  let chart: any;
  let trackingData: { x: number; y: number }[] = $state.raw([]);
  let trackingInterval: NodeJS.Timeout | null = null;
  let startTime = 0;
  const WINDOW_MS = 30_000; // 滑动窗口大小（30秒）
  let timer : NodeJS.Timeout;
  let handleDataUpdate: (() => void) | null = null;

  // Props
  interface Props {
    currentSelected: [number, number] | null;
    onSelectKey?: () => void;
  }

  let { currentSelected, onSelectKey }: Props = $props();

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
    if (chart) {
      chart.data.datasets[0].data = [];
      updateChart(); // 清空图表
      chart.update();
    }
  }

  function updateChart() {
    if (!chart) return;
    
    // 取最后一个时间作为“当前”
    const lastX = trackingData.length ? trackingData[trackingData.length - 1].x : 0;
    const cutoff = Math.max(0, lastX - WINDOW_MS);
    
    // 丢弃 30s 之前的数据（避免内存增长）
    if (trackingData.length && trackingData[0].x < cutoff) {
      const idx = trackingData.findIndex(p => p.x >= cutoff);
      if (idx > 0) {
        trackingData = trackingData.slice(idx);
      }
    }
  
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

      <!-- Selected key display -->
      <div class="text-sm text-gray-700 dark:text-gray-300">
        {selectedKeyName
          ? `${t('debug.selectedKey', currentLanguage)}: ${selectedKeyName}`
          : t('debug.noKeySelected', currentLanguage)}
      </div>

      <!-- Start/Stop Tracking -->
      {#if !isTracking}
        <div>
        </div>
      {:else}
        <button
          type="button"
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors glassmorphism-button"
          onclick={stopDebug}
        >
          {t('debug.stopTracking', currentLanguage)}
        </button>
      {/if}

      <!-- Clear button -->
      <button
        type="button"
        class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors glassmorphism-button"
        onclick={clearChart}
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
