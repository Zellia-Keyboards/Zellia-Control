<script lang="ts">
  import { fade } from 'svelte/transition';
  import { ArrowRight, Loader2, AlertCircle } from 'lucide-svelte';
  import { keyboardAPI } from '$lib/api/keyboardAPI.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import { Button } from '$lib/components/ui/button';

  let currentLanguage = $derived($language);
  let buttonElement: HTMLButtonElement | null = $state(null);
  let mouseX = $state(0);
  let mouseY = $state(0);

  function handleMouseMove(event: MouseEvent) {
    if (!buttonElement) return;
    const rect = buttonElement.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }

  async function handleConnect() {
    await keyboardAPI.connect();
  }

  let isConnecting = $derived(keyboardAPI.state.connectionStatus === 'connecting');
</script>

<div class="flex-1 flex items-center justify-center p-8 relative overflow-visible">
  <!-- Animated background blobs -->
  <div class="absolute inset-0 pointer-events-none">
    <div
      class="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl animate-pulse"
    ></div>
    <div
      class="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary-600/5 rounded-full blur-3xl animate-pulse"
      style="animation-delay: 1s"
    ></div>
  </div>

  <div class="w-full max-w-lg mx-auto relative z-10 space-y-12">
    <!-- Title -->
    <div class="text-center animate-fade-in-up">
      <h1 class="text-6xl font-bold text-foreground tracking-tight">
        <i>ZELLIA</i> Control
      </h1>
    </div>

    <!-- Connect button (liquid-glass effect) -->
    <div class="text-center animate-fade-in-up" style="animation-delay: 0.2s">
      <Button
        bind:ref={buttonElement}
        size="lg"
        disabled={isConnecting}
        onmousemove={handleMouseMove}
        onclick={handleConnect}
        class="group relative px-12 py-6 rounded-full text-lg font-medium text-white border border-white/20 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/30 disabled:hover:scale-100"
        style={`background: radial-gradient(circle 120px at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.3), transparent), linear-gradient(to right, var(--color-primary-600), var(--color-primary-500), var(--color-primary-600)); background-size: 100% 100%, 200% 100%;`}
      >
        {#if isConnecting}
          <Loader2 class="size-5 animate-spin" />
          {t('welcome.connecting', currentLanguage)}
        {:else}
          {t('welcome.getStarted', currentLanguage)}
          <ArrowRight class="size-5 transition-transform group-hover:translate-x-1" />
        {/if}
      </Button>
    </div>

    <!-- Error -->
    {#if keyboardAPI.state.error}
      <div class="text-center animate-shake" transition:fade={{ duration: 300 }}>
        <div class="inline-flex items-center gap-2 text-destructive text-sm">
          <AlertCircle class="size-5" />
          <span class="font-medium">{keyboardAPI.state.error}</span>
        </div>
      </div>
    {/if}

    <!-- USB warning -->
    <div class="text-center animate-fade-in-up" style="animation-delay: 0.3s">
      <p class="text-xs text-muted-foreground">
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
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 0.6s ease-out forwards;
    opacity: 0;
  }
  .animate-shake {
    animation: shake 0.5s ease-in-out;
  }
</style>
