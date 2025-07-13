<script lang="ts">
  import { darkMode, glassmorphismMode } from '$lib/DarkModeStore.svelte';
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
  let CurrentSelected= $state<[number, number] | null> (null);
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
        y: distance
      });
    }
    
    return data;
  }
    $effect(() => {if (CurrentSelected) {
    const keyPosition = `${CurrentSelected[0]},${CurrentSelected[1]}`;
    selectedKeyName = `Key ${keyPosition}`;
  }})

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });
  
  function handleReset() {

  }
  
  function handleRebootRecovery() {

  }
  
  function scrollToKeyboard() {

  }
  
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
  
  function initChart() {
    if (!browser || !chartCanvas) return;
    
    import('chart.js/auto').then(async (Chart) => {
      try {
        const { default: zoomPlugin } = await import('chartjs-plugin-zoom');
        Chart.default.register(zoomPlugin);
      } catch (e) {
        console.warn('Zoom plugin not available:', e);
      }
      
      const ctx = chartCanvas.getContext('2d');
      if (!ctx) return;

      chart = new Chart.default(ctx, {
        type: 'line',        data: {
          datasets: [{
            label: t('debug.keyDistance', currentLanguage),
            data: [],
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 3,
            tension: 0.1
          }]
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
              max: 30000,              title: {
                display: true,
                text: t('debug.timeLabel', currentLanguage),
                color: $darkMode ? '#9ca3af' : '#6b7280'
              },
              ticks: {
                color: $darkMode ? '#9ca3af' : '#6b7280'
              },
              grid: {
                color: $darkMode ? '#374151' : '#e5e7eb'
              }            },
            y: {
              min: 0,
              max: 4.0,
              reverse: true,              title: {
                display: true,
                text: t('debug.distanceLabel', currentLanguage),
                color: $darkMode ? '#9ca3af' : '#6b7280'
              },              ticks: {
                color: $darkMode ? '#9ca3af' : '#6b7280',
                callback: function(value) {
                  return (value as number).toFixed(1) + t('units.mm', currentLanguage);
                }
              },
              grid: {
                color: $darkMode ? '#374151' : '#e5e7eb'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            zoom: {
              pan: {
                enabled: true,
                mode: 'x'
              },
              zoom: {
                wheel: {
                  enabled: true
                },
                pinch: {
                  enabled: true
                },
                mode: 'x',
              },
              limits: {
                x: {
                  min: 0,
                  max: 30000
                },
                y: {
                  min: 0,
                  max: 4.0
                }
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      });
    });
  }
  
  onMount(() => {
    
    if (browser) {
      setTimeout(initChart, 100);
    }
    
    return () => {
      if (chart) {
        chart.destroy();
      }
      if (trackingInterval) {
        clearInterval(trackingInterval);
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
  {/snippet}
</NewZellia80He>
<div
  class="rounded-2xl shadow p-8 mt-2 mb-4 grow {$glassmorphismMode ? 'glassmorphism-card' : ''} {$darkMode
    ? 'border border-gray-600 text-white'
    : 'text-black'} flex flex-col"
  style="background-color: {$darkMode
    ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
    : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};"
>  <div class="flex items-center justify-between -mt-4 mb-2">
    <h2 class="text-2xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'}">{t('debug.title', currentLanguage)}</h2>
  </div>
  
  <div class="rounded-xl shadow p-6 space-y-8 flex-1  {$darkMode ? 'border-gray-600' : ''}">    <!-- Key Press Reporting -->
    <div class="p-5 rounded-lg border {$glassmorphismMode ? 'glassmorphism-card' : ''} {$darkMode ? 'border-gray-600' : 'border-gray-200'}" 
         style="background-color: {$darkMode
           ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
           : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};">      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'}">{t('debug.keyPressReporting', currentLanguage)}</h3>
        <button 
          class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none"
          aria-label="Key Press Reporting Toggle"
          class:bg-blue-600={keyPressReporting} 
          class:bg-gray-300={!keyPressReporting}
          on:click={() => keyPressReporting = !keyPressReporting}>
          <span 
            class="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow"
            class:translate-x-6={keyPressReporting}
            class:translate-x-1={!keyPressReporting}></span>
        </button>
      </div>
      <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'}">
        {t('debug.keyPressReportingDesc', currentLanguage)}
      </p>
    </div>
      <!-- Reset Configuration -->
    <div class="p-5 rounded-lg border {$glassmorphismMode ? 'glassmorphism-card' : ''} {$darkMode ? 'border-gray-600' : 'border-gray-200'}" 
         style="background-color: {$darkMode
           ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
           : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};">      <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">{t('debug.reset', currentLanguage)}</h3>
      <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
        {t('debug.resetDesc', currentLanguage)}
      </p>
      <button 
        type="button" 
        class="action-button red {$glassmorphismMode ? 'glassmorphism-button' : ''}"
        on:click={handleReset}>
        {t('debug.resetButton', currentLanguage)}
      </button>
    </div>
      <!-- Recovery Mode -->
    <div class="p-5 rounded-lg border {$glassmorphismMode ? 'glassmorphism-card' : ''} {$darkMode ? 'border-gray-600' : 'border-gray-200'}" 
         style="background-color: {$darkMode
           ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
           : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};">      <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-2">{t('debug.recoveryMode', currentLanguage)}</h3>
      <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
        {t('debug.recoveryModeDesc', currentLanguage)}
      </p>
      <button 
        type="button" 
        class="action-button purple"
        on:click={handleRebootRecovery}>
        {t('debug.recoveryModeButton', currentLanguage)}
      </button>
    </div>
      <!-- Key Tracking Section -->
    <div class="p-5 rounded-lg border {$glassmorphismMode ? 'glassmorphism-card' : ''} {$darkMode ? 'border-gray-600' : 'border-gray-200'}" 
         style="background-color: {$darkMode
           ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)`
           : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`};">      
           <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">{t('debug.keyTracking', currentLanguage)}</h3>
      <p class="text-sm {$darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
        {t('debug.keyTrackingDesc', currentLanguage)}
      </p>
      
      <div class="flex items-start gap-4 mb-4 " >
        <!-- Left column: controls -->
        <div class="flex flex-col gap-3 min-w-[200px] ">          
          <!-- Select Key -->
          <button 
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors {$glassmorphismMode ? 'glassmorphism-button' : ''}"
            on:click={scrollToKeyboard}>
            {t('debug.selectKey', currentLanguage)}
          </button>
          
          <!-- Selected key display -->
          <div class="text-sm  {$darkMode ? 'text-gray-300' : 'text-gray-700'}">
            {selectedKeyName ? `${t('debug.selectedKey', currentLanguage)}: ${selectedKeyName}` : t('debug.noKeySelected', currentLanguage)}
          </div>
          
          <!-- Start/Stop Tracking -->
          {#if !isTracking}
            <button
              type="button"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 {$glassmorphismMode ? 'glassmorphism-button' : ''}"
              on:click={startTracking}
              disabled={!selectedKeyName}
            >
              {t('debug.startTracking', currentLanguage)}
            </button>
          {:else}
            <button
              type="button"
              class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors {$glassmorphismMode ? 'glassmorphism-button' : ''}"
              on:click={stopTracking}
            >
              {t('debug.stopTracking', currentLanguage)}
            </button>
          {/if}
            <!-- Clear button -->
          <button
            type="button"
            class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors {$glassmorphismMode ? 'glassmorphism-button' : ''}"
            on:click={clearChart}
          >
            {t('debug.clearChart', currentLanguage)}
          </button>
        </div>       
         <!-- Right column: chart -->
        <div class="flex-1 min-h-[400px] ">
          <div class="border {$glassmorphismMode ? 'glassmorphism-card' : ''}  {$darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-lg p-4 h-full" 
               style="background-color: {$darkMode
                 ? `color-mix(in srgb, var(--theme-color-primary) 3%, black)`
                 : `color-mix(in srgb, var(--theme-color-primary) 8%, white)`};">
            <canvas bind:this={chartCanvas} class="w-full h-full"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Chart controls -->
      <div class="flex items-center gap-2 text-xs {$darkMode ? 'text-gray-400' : 'text-gray-600'}">
        <span>💡 Tip: Use mouse wheel to zoom horizontally, drag to pan</span>
      </div>
    </div>
  </div>
</div>

<style>
  .action-button {
    display: inline-block;
    min-width: 120px;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 600;
    transition: background-color 0.2s;
  }
  
  .action-button:hover {
    opacity: 0.9;
  }
  
  .action-button.red {
    background-color: #b91c1c;
  }
  
  .action-button.red:hover {
    background-color: #dc2626;
  }
  
  .action-button.purple {
    background-color: #7c3aed;
  }
  
  .action-button.purple:hover {
    background-color: #8b5cf6;
  }
</style>