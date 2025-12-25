<script lang="ts">
  import { goto } from '$app/navigation';

  // Liquid glass effect
  let buttonElement: HTMLButtonElement;
  let mouseX = $state(0);
  let mouseY = $state(0);

  function handleMouseMove(event: MouseEvent) {
    if (!buttonElement) return;
    const rect = buttonElement.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }
</script>

<div class="flex-1 flex items-center justify-center p-8">
  <div class="text-center">
    <div class="mb-6">
      <svg
        class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="9" stroke-width="1.5" />
        <path
          stroke-linecap="round"
          stroke-width="1.5"
          d="M8 12h8"
        />
      </svg>
    </div>
    <h3 class="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
      No Keyboard Connected
    </h3>
    <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
      Please connect a keyboard or go to the home page to start.
    </p>
    <button
      bind:this={buttonElement}
      onmousemove={handleMouseMove}
      class="group relative px-8 py-3 bg-primary-600/80 backdrop-blur-xl text-white rounded-full font-medium text-sm overflow-hidden transition-all duration-200 hover:scale-105 hover:shadow-lg border border-white/20"
      style={`background: radial-gradient(circle 100px at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.3), transparent), linear-gradient(to right, var(--color-primary-600), var(--color-primary-500), var(--color-primary-600)); background-size: 100% 100%, 200% 100%; animation: shimmer 3s linear infinite;`}
      onclick={() => goto('/')}
    >
      <!-- Liquid Glass Glow -->
      <div
        class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={`background: radial-gradient(circle 120px at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.4), transparent); transition: background 0.1s ease-out;`}
      ></div>

      <!-- Button Content -->
      <span class="relative z-10">Go to Home</span>
    </button>
  </div>
</div>

<style>
  @keyframes shimmer {
    0% {
      background-position: -200% center;
    }
    100% {
      background-position: 200% center;
    }
  }

</style>
