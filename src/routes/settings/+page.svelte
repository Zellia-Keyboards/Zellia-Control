<script lang="ts">
  import { keyboardConnectionState } from '$lib/api/keyboardAPI.svelte';
  import { RotateCcw, Download, Trash2, Zap, Shield, AlertTriangle } from 'lucide-svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';

  let currentLanguage = $derived($language);
  let hoverIndex = $state<number | null>(null);

  const settingsOptions = [
    {
      id: 'restart',
      nameKey: 'settings.restart',
      descriptionKey: 'settings.restartDesc',
      icon: RotateCcw,
      color: 'blue',
      action: () => keyboardConnectionState.controller?.system_reset(),
    },
    {
      id: 'bootloader',
      nameKey: 'settings.bootloader',
      descriptionKey: 'settings.bootloaderDesc',
      icon: Download,
      color: 'violet',
      action: () => keyboardConnectionState.controller?.enter_bootloader(),
    },
    {
      id: 'factory-reset',
      nameKey: 'settings.factoryReset',
      descriptionKey: 'settings.factoryResetDesc',
      icon: Trash2,
      color: 'red',
      action: () => keyboardConnectionState.controller?.factory_reset(),
    },
  ];
</script>

<div class="settings-container">
  <!-- Header -->
  <div class="settings-header">
    <div class="header-content">
      <h1 class="page-title text-gray-900 dark:text-white">
        {t('settings.title', currentLanguage)}
      </h1>
      <p class="page-subtitle text-gray-600 dark:text-gray-300">
        {t('settings.subtitle', currentLanguage)}
      </p>
    </div>
    <div class="header-decoration">
      <div class="decoration-line"></div>
    </div>
  </div>

  <!-- Actions Grid -->
  <div class="actions-grid">
    {#each settingsOptions as option, index}
      {@const Icon = option.icon}
      <div
        class="action-card action-card-{option.color}"
        style="animation-delay: {index * 100}ms;"
        onmouseenter={() => (hoverIndex = index)}
        onmouseleave={() => (hoverIndex = null)}
        onclick={option.action}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); option.action(); } }}
        role="button"
        tabindex={0}
      >
        <div class="action-glow glow-{option.color}"></div>
        <div class="action-content glassmorphism-card">
          <div class="action-icon-wrapper icon-wrapper-{option.color}">
            <Icon class="action-icon icon-{option.color}" />
          </div>
          <div class="action-info">
            <h3 class="action-title text-gray-900 dark:text-white">
              {t(option.nameKey, currentLanguage)}
            </h3>
            <p class="action-description text-gray-600 dark:text-gray-300">
              {t(option.descriptionKey, currentLanguage)}
            </p>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Warning Text -->
  <div class="warning-section glassmorphism-card" style="animation-delay: 300ms;">
    <AlertTriangle class="warning-icon text-amber-500 dark:text-amber-400" />
    <p class="warning-text text-gray-600 dark:text-gray-300">
      These actions affect your keyboard's firmware and settings. Use with caution.
    </p>
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";

  .settings-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    animation: fade-in 400ms ease-out;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Header */
  .settings-header {
    margin-bottom: 3rem;
    position: relative;
  }

  .header-content {
    animation: slide-in 500ms ease-out;
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .page-title {
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .page-subtitle {
    margin-top: 0.5rem;
    font-size: 1rem;
  }

  .header-decoration {
    margin-top: 1rem;
  }

  .decoration-line {
    height: 2px;
    width: 60px;
    background: linear-gradient(90deg, #6366f1, transparent);
    border-radius: 1px;
  }

  /* Actions Grid */
  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .action-card {
    position: relative;
    border-radius: 1rem;
    overflow: hidden;
    cursor: pointer;
    animation: card-appear 500ms ease-out backwards;
    transition: transform 300ms ease-out;
  }

  @keyframes card-appear {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .action-card:hover {
    transform: translateY(-4px);
  }

  .action-glow {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 300ms ease-out;
    filter: blur(30px);
    pointer-events: none;
  }

  .action-card:hover .action-glow {
    opacity: 0.3;
  }

  .glow-blue {
    background: #3b82f6;
  }

  .glow-violet {
    background: #8b5cf6;
  }

  .glow-red {
    background: #ef4444;
  }

  .action-content {
    position: relative;
    padding: 1.5rem;
    display: flex;
    gap: 1rem;
    border-radius: 1rem;
    transition: all 300ms ease-out;
  }

  .action-card-blue:hover .action-content {
    border-color: rgba(59, 130, 246, 0.6);
  }

  .action-card-violet:hover .action-content {
    border-color: rgba(139, 92, 246, 0.6);
  }

  .action-card-red:hover .action-content {
    border-color: rgba(239, 68, 68, 0.6);
  }

  .action-icon-wrapper {
    flex-shrink: 0;
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 300ms ease-out;
  }

  .icon-wrapper-blue {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  }

  .dark .icon-wrapper-blue {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
  }

  .icon-wrapper-violet {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  }

  .dark .icon-wrapper-violet {
    background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
  }

  .icon-wrapper-red {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }

  .dark .icon-wrapper-red {
    background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
  }

  .action-card:hover .action-icon-wrapper {
    transform: scale(1.1) rotate(5deg);
  }

  .action-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: white;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
    transition: all 300ms ease-out;
  }

  .action-card:hover .action-icon {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .action-info {
    flex: 1;
    min-width: 0;
  }

  .action-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .action-description {
    font-size: 0.875rem;
    line-height: 1.4;
  }

  /* Warning Section */
  .warning-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-radius: 0.75rem;
    animation: fade-in 500ms ease-out backwards;
  }

  .warning-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }

  .warning-text {
    font-size: 0.875rem;
  }
</style>
