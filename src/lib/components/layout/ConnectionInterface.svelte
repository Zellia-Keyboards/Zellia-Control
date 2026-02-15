<script lang="ts">
  import { fade } from 'svelte/transition';
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';

  let currentLanguage = $derived($language);

  // Liquid glass effect
  let buttonElement: HTMLButtonElement;
  let mouseX = $state(0);
  let mouseY = $state(0);
  let isHoveringButton = $state(false);

  function handleMouseMove(event: MouseEvent) {
    if (!buttonElement) return;
    const rect = buttonElement.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }

  function handleMouseEnter() {
    isHoveringButton = true;
  }

  function handleMouseLeave() {
    isHoveringButton = false;
  }

  async function handleConnect() {
    await keyboardAPI.connect();
  }
</script>

<div class="flex-1 flex items-center justify-center p-8 relative overflow-visible">
  <!-- Animated Background Elements -->
  <div class="absolute inset-0 pointer-events-none">
    <div
      class="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl animate-pulse"
    ></div>
    <div
      class="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary-600/5 rounded-full blur-3xl animate-pulse"
      style="animation-delay: 1s"
    ></div>
  </div>

  <div class="w-full max-w-lg mx-auto relative z-10">
    <!-- Big Title -->
    <div class="text-center mb-12 animate-fade-in-up">
      <h1 class=" text-6xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
        <i>ZELLIA</i> Control
      </h1>
    </div>

    <!-- Animated Button -->
    <div class="text-center animate-fade-in-up" style="animation-delay: 0.2s">
      <button
        bind:this={buttonElement}
        onmousemove={handleMouseMove}
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
        class="group relative px-12 py-4 bg-primary-600/80 backdrop-blur-xl text-white rounded-full font-medium text-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-white/20"
        style={`background: radial-gradient(circle 120px at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.3), transparent), linear-gradient(to right, var(--color-primary-600), var(--color-primary-500), var(--color-primary-600)); background-size: 100% 100%, 200% 100%;`}
        onclick={handleConnect}
        disabled={keyboardAPI.state.connectionStatus === 'connecting'}
      >
        <!-- Liquid Glass Glow -->
        <div
          class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={`background: radial-gradient(circle 150px at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.4), transparent); transition: background 0.1s ease-out;`}
        ></div>

        <!-- Button Content -->
        <div class="relative z-10 flex items-center justify-center gap-3">
          {#if keyboardAPI.state.connectionStatus === 'connecting'}
            <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t('welcome.connecting', currentLanguage)}
          {:else}
            {t('welcome.getStarted', currentLanguage)}
            <svg
              class="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          {/if}
        </div>
      </button>
    </div>

    <!-- Error Display -->
    {#if keyboardAPI.state.error}
      <div class="mt-8 text-center animate-shake" transition:fade={{ duration: 300 }}>
        <div class="inline-flex items-center gap-2 text-red-500 text-sm">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="font-medium">{keyboardAPI.state.error}</span>
        </div>
      </div>
    {/if}

    <!-- USB Warning - Minimal -->
    <div class="mt-8 text-center animate-fade-in-up" style="animation-delay: 0.3s">
      <p class="text-xs text-gray-400 dark:text-gray-500">
        {t('ui.usbHubWarning', currentLanguage)}
      </p>
    </div>
  </div>
</div>

<style>
  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-8px);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200% center;
    }
    100% {
      background-position: 200% center;
    }
  }

  @keyframes shine {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    10%,
    30%,
    50%,
    70%,
    90% {
      transform: translateX(-5px);
    }
    20%,
    40%,
    60%,
    80% {
      transform: translateX(5px);
    }
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.6s ease-out forwards;
    opacity: 0;
  }

  .animate-shake {
    animation: shake 0.5s ease-in-out;
  }
</style>
