<script lang="ts">
  import { glassmorphismMode } from '$lib/stores/DarkModeStore.svelte';
  import { language, t } from '$lib/stores/LanguageStore.svelte';
  import {
    Upload,
    CheckCircle,
    AlertCircle,
    AlertTriangle,
    RefreshCw,
    Usb,
    Zap,
    Shield,
    X,
    Download,
    Info
  } from 'lucide-svelte';

  type FlashStatus = 'idle' | 'selecting' | 'device-connected' | 'validating' | 'flashing' | 'success' | 'error' | 'warning';
  type FlashStage = 'upload' | 'connect' | 'validate' | 'flash' | 'complete';

  let currentLanguage = $derived($language);

  // State management
  let status = $state<FlashStatus>('idle');
  let progress = $state(0);
  let currentStage = $state<FlashStage>('upload');
  let errorMessage = $state('');
  let warningMessage = $state('');

  // File handling
  let selectedFile = $state<File | null>(null);
  let fileContent = $state<ArrayBuffer | null>(null);
  let fileDropActive = $state(false);
  let fileInput = $state<HTMLInputElement>();

  // WebUSB device
  let webusbDevice = $state<USBDevice | null>(null);
  let isTransferring = $state(false);

  // Flashing parameters
  const CHUNK_SIZE = 64; // bytes per USB transfer
  const FLASH_BASE_ADDRESS = 0x08000000; // STM32 flash base address
  const BOOTLOADER_VID = 0x0483; // STM32 VID
  const BOOTLOADER_PID = 0xDF11; // STM32 DFU PID

  // Step definitions for visual progress
  const flashSteps = [
    { id: 'upload', name: 'Load Bin', icon: Upload, completed: false, active: false },
    { id: 'connect', name: 'Connect USB', icon: Usb, completed: false, active: false },
    { id: 'validate', name: 'Validate', icon: Shield, completed: false, active: false },
    { id: 'flash', name: 'Flash Firmware', icon: Zap, completed: false, active: false },
    { id: 'complete', name: 'Complete', icon: CheckCircle, completed: false, active: false }
  ];

  let steps = $state(flashSteps);

  // Step management
  function updateStepProgress(stepId: string, isCompleted: boolean = false, isActive: boolean = false) {
    steps = steps.map(step => ({
      ...step,
      completed: step.id === stepId ? isCompleted : step.completed,
      active: step.id === stepId ? isActive : false
    }));
  }

  function resetSteps() {
    steps = steps.map(step => ({ ...step, completed: false, active: false }));
  }

  function markStepCompleted(stepId: string) {
    updateStepProgress(stepId, true, false);
  }

  function setStepActive(stepId: string) {
    // First, mark all previous steps as completed
    const stepIndex = steps.findIndex(s => s.id === stepId);
    steps = steps.map((step, index) => ({
      ...step,
      completed: index < stepIndex,
      active: step.id === stepId
    }));
  }

  // File handling functions
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      processFile(target.files[0]);
    }
  }

  function handleFileDrop(event: DragEvent) {
    event.preventDefault();
    fileDropActive = false;

    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      processFile(event.dataTransfer.files[0]);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    fileDropActive = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    fileDropActive = false;
  }

  async function processFile(file: File) {
    setStepActive('upload');

    if (!file.name.endsWith('.bin')) {
      status = 'error';
      errorMessage = 'Please select a .bin firmware file';
      return;
    }

    selectedFile = file;
    status = 'validating';
    currentStage = 'validate';

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Basic validation - check file size (max 1MB)
      if (arrayBuffer.byteLength > 1024 * 1024) {
        status = 'error';
        errorMessage = 'Firmware file too large (max 1MB)';
        return;
      }

      // Check if it's a valid firmware file (basic check)
      const view = new Uint8Array(arrayBuffer);
      if (view.byteLength < 4) {
        status = 'error';
        errorMessage = 'Invalid firmware file - too small';
        return;
      }

      fileContent = arrayBuffer;
      markStepCompleted('upload');
      status = 'selecting';
      currentStage = 'connect';

      // Show file info
      const fileSizeKB = Math.round(arrayBuffer.byteLength / 1024);
      console.log(`Firmware loaded: ${file.name} (${fileSizeKB} KB)`);

    } catch (error) {
      status = 'error';
      errorMessage = 'Failed to read firmware file';
      console.error('File read error:', error);
    }
  }

  // WebUSB functions
  async function connectWebUSB() {
    try {
      setStepActive('connect');
      status = 'device-connected';
      progress = 25;

      // Request WebUSB device
      webusbDevice = await navigator.usb.requestDevice({
        filters: [
          { vendorId: BOOTLOADER_VID, productId: BOOTLOADER_PID }
        ]
      });

      console.log('WebUSB device connected:', webusbDevice);

      // Open and configure device
      await webusbDevice.open();
      await webusbDevice.selectConfiguration(1);

      // Claim interface
      const interfaceNumber = 0;
      await webusbDevice.claimInterface(interfaceNumber);

      markStepCompleted('connect');
      progress = 50;
      currentStage = 'flash';

    } catch (error) {
      console.error('WebUSB connection error:', error);
      status = 'error';

      if (error instanceof DOMException) {
        if (error.name === 'NotFoundError') {
          errorMessage = 'No compatible device found. Make sure your keyboard is in bootloader mode.';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Permission denied. Please allow USB access.';
        } else {
          errorMessage = `USB Error: ${error.message}`;
        }
      } else {
        errorMessage = 'Failed to connect to device';
      }
    }
  }

  // Flashing functions
  async function startFlashing() {
    if (!webusbDevice || !fileContent) return;

    try {
      setStepActive('validate');
      status = 'flashing';
      isTransferring = true;
      progress = 60;

      // Validation step
      await new Promise(resolve => setTimeout(resolve, 500));
      markStepCompleted('validate');

      setStepActive('flash');
      progress = 70;

      const firmwareData = new Uint8Array(fileContent);
      const totalBytes = firmwareData.length;
      let bytesTransferred = 0;

      console.log(`Starting firmware flash: ${totalBytes} bytes`);

      // Send firmware in chunks
      for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
        const chunk = firmwareData.slice(offset, Math.min(offset + CHUNK_SIZE, totalBytes));

        // Send chunk to device
        await webusbDevice.transferOut(1, chunk);

        bytesTransferred += chunk.length;
        progress = 70 + (bytesTransferred / totalBytes) * 25; // 70% to 95%

        // Small delay to prevent overwhelming the device
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Send flash complete command
      await webusbDevice.controlTransferOut({
        requestType: 'out',
        recipient: 'interface',
        request: 0xFF, // Custom command: Flash complete
        value: 0,
        index: 0
      }, new Uint8Array([0x00]));

      markStepCompleted('flash');
      setStepActive('complete');
      progress = 100;
      status = 'success';
      currentStage = 'complete';

      console.log('Firmware flash completed successfully');

    } catch (error) {
      console.error('Flashing error:', error);
      status = 'error';
      errorMessage = 'Flashing failed. Please try again.';
    } finally {
      isTransferring = false;

      // Clean up device connection
      try {
        if (webusbDevice) {
          await webusbDevice.releaseInterface(0);
          await webusbDevice.close();
          webusbDevice = null;
        }
      } catch (error) {
        console.error('Device cleanup error:', error);
      }
    }
  }

  function resetFlasher() {
    status = 'idle';
    progress = 0;
    currentStage = 'upload';
    errorMessage = '';
    warningMessage = '';
    selectedFile = null;
    fileContent = null;
    webusbDevice = null;
    isTransferring = false;
    resetSteps();

    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Computed properties
  let statusIcon = $derived(() => {
    switch (status) {
      case 'success': return CheckCircle;
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'flashing':
      case 'validating': return RefreshCw;
      case 'device-connected': return Usb;
      case 'selecting': return Download;
      default: return Upload;
    }
  });

  let statusColor = $derived(() => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'flashing':
      case 'validating': return 'text-blue-500';
      case 'device-connected': return 'text-purple-500';
      case 'selecting': return 'text-indigo-500';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  });

  let canStartFlash = $derived(
    selectedFile !== null &&
    fileContent !== null &&
    webusbDevice !== null &&
    status === 'selecting'
  );
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
        <Zap class="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Firmware Flasher
        </h2>
        <p class="text-xs text-gray-600 dark:text-gray-300">
          Flash firmware directly via WebUSB
        </p>
      </div>
    </div>

    <!-- Status Badge -->
    <div class="flex items-center gap-2">
      <svelte:component
        this={statusIcon}
        class="w-4 h-4 {statusColor}"
      />
      <span class="text-sm font-medium {statusColor}">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  </div>

  <!-- Full-Screen Step Layout -->
<div class="flex h-full gap-6">
  <!-- Left Side - Vertical Step Navigation -->
  <div class="w-48 flex flex-col">
    <!-- Progress Percentage (only shown during flashing) -->
    {#if status === 'flashing' || status === 'success'}
      <div class="text-center mb-6">
        <span class="text-3xl font-bold text-primary-600 dark:text-primary-400">
          {Math.round(progress)}%
        </span>
        <p class="text-xs text-gray-600 dark:text-gray-400">Flashing Progress</p>
      </div>
    {:else}
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Firmware Flasher
        </h3>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          Follow the steps below
        </p>
      </div>
    {/if}

    <!-- Vertical Step Navigation -->
    <div class="relative flex-1 flex flex-col justify-center">
      <!-- Background Vertical Line -->
      <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

      <!-- Animated Progress Line -->
      {#if status !== 'idle' && status !== 'error'}
        <div
          class="absolute left-4 top-0 w-0.5 bg-gradient-to-b from-primary-500 to-primary-600 transition-all duration-700 ease-out"
          style="height: {(steps.filter(s => s.completed).length / steps.length) * 100}%"
        ></div>
      {/if}

      <!-- Steps -->
      <div class="relative flex flex-col gap-8">
        {#each steps as step, index}
          <div class="relative">
            <!-- Step Connection Line -->
            <div class="absolute left-4 -translate-x-1/2 top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" style="height: 2rem;"></div>

            <!-- Step Circle -->
            <button
              class="relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-2 {
                step.completed
                  ? 'bg-primary-500 text-white border-primary-500'
                  : step.active
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-primary-500 ring-2 ring-primary-500 ring-opacity-50'
                    : 'bg-white dark:bg-gray-900 text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary-300'
              }"
              onclick={() => {
                // Allow navigation between completed steps for review
                if (step.completed || steps[index - 1]?.completed) {
                  setStepActive(step.id);
                }
              }}
            >
              {#if step.completed}
                <CheckCircle class="w-4 h-4" />
              {:else}
                <svelte:component this={step.icon} class="w-3.5 h-3.5" />
              {/if}
            </button>

            <!-- Step Label -->
            <span
              class="ml-4 text-sm font-medium transition-all duration-500 {
                step.completed
                  ? 'text-primary-600 dark:text-primary-400'
                : step.active
                  ? 'text-gray-900 dark:text-white font-semibold'
                  : 'text-gray-500 dark:text-gray-400'
              }"
            >
              {step.name}
            </span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Right Side - Content Area -->
  <div class="flex-1 relative overflow-hidden">
    <!-- Upload Content -->
    <div
      class="absolute inset-0 transition-all duration-500 {
        steps[0].active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'
      }"
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full {$glassmorphismMode
          ? 'glassmorphism-card'
          : ''}"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Upload class="w-5 h-5" />
          Upload Firmware File
        </h3>

        <div
          class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center transition-all duration-200 {
            fileDropActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-105' : ''
          } {selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}"
          ondrop={handleFileDrop}
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
        >
          <input
            type="file"
            accept=".bin"
            onchange={handleFileSelect}
            bind:this={fileInput}
            class="hidden"
            id="firmware-file-input"
          />

          <label for="firmware-file-input" class="cursor-pointer">
            {#if selectedFile}
              <div class="space-y-3">
                <div class="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <FileBinary class="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedFile.name}
                  </p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">
                    {(fileContent?.byteLength || 0) / 1024} KB
                  </p>
                </div>
              </div>
            {:else}
              <div class="space-y-3">
                <div class="w-16 h-16 mx-auto bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <Upload class="w-8 h-8 text-primary-500" />
                </div>
                <div>
                  <p class="text-base font-medium text-gray-900 dark:text-white">
                    Drop your firmware file here
                  </p>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    or click to browse (.bin files only, max 1MB)
                  </p>
                </div>
              </div>
            {/if}
          </label>
        </div>
      </div>
    </div>

    <!-- Connect Content -->
    <div
      class="absolute inset-0 transition-all duration-500 {
        steps[1].active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'
      }"
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full {$glassmorphismMode
          ? 'glassmorphism-card'
          : ''}"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Usb class="w-5 h-5" />
          Connect USB Device
        </h3>

        <div class="space-y-4">
          <div class="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p class="text-sm text-purple-900 dark:text-purple-100">
              Make sure your keyboard is in bootloader mode before connecting.
            </p>
          </div>

          <button
            class="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            onclick={connectWebUSB}
            disabled={status === 'flashing' || status === 'validating' || !selectedFile}
          >
            <Usb class="w-4 h-4" />
            {webusbDevice ? 'Device Connected' : 'Connect USB Device'}
          </button>

          {#if webusbDevice}
            <div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div class="flex items-center gap-2">
                <CheckCircle class="w-4 h-4 text-green-500" />
                <p class="text-sm font-medium text-green-900 dark:text-green-100">
                  Connected to {webusbDevice.productName || 'USB Device'}
                </p>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Validate Content -->
    <div
      class="absolute inset-0 transition-all duration-500 {
        steps[2].active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'
      }"
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full {$glassmorphismMode
          ? 'glassmorphism-card'
          : ''}"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield class="w-5 h-5" />
          Validating Firmware
        </h3>

        <div class="flex flex-col items-center justify-center h-full space-y-4">
          <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <RefreshCw class="w-8 h-8 text-blue-500 animate-spin" />
          </div>
          <div class="text-center">
            <p class="text-base font-medium text-gray-900 dark:text-white">
              Validating firmware file...
            </p>
            <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
              This will only take a moment
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Flash Content -->
    <div
      class="absolute inset-0 transition-all duration-500 {
        steps[3].active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'
      }"
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full {$glassmorphismMode
          ? 'glassmorphism-card'
          : ''}"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Zap class="w-5 h-5" />
          Flashing Firmware
        </h3>

        <div class="flex flex-col items-center justify-center h-full space-y-6">
          <div class="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <RefreshCw class="w-10 h-10 text-red-500 animate-spin" />
          </div>

          <div class="w-full max-w-md space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Flash Progress</span>
              <span class="font-medium text-gray-900 dark:text-white">{Math.round(progress)}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                class="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-300"
                style="width: {progress}%"
              ></div>
            </div>
          </div>

          <p class="text-xs text-gray-600 dark:text-gray-400 text-center">
            Do not disconnect your keyboard during flashing
          </p>
        </div>
      </div>
    </div>

    <!-- Complete Content -->
    <div
      class="absolute inset-0 transition-all duration-500 {
        steps[4].active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'
      }"
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full {$glassmorphismMode
          ? 'glassmorphism-card'
          : ''}"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle class="w-5 h-5" />
          Flashing Complete!
        </h3>

        <div class="flex flex-col items-center justify-center h-full space-y-6">
          <div class="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle class="w-10 h-10 text-green-500" />
          </div>

          <div class="text-center space-y-2">
            <p class="text-base font-medium text-gray-900 dark:text-white">
              Firmware flashed successfully!
            </p>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              You can now disconnect your keyboard and start using it.
            </p>
          </div>

          <button
            class="px-6 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            onclick={resetFlasher}
          >
            Flash Another Device
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Custom animations */
  @keyframes pulse-border {
    0%, 100% { border-color: rgb(99 102 241); }
    50% { border-color: rgb(129 140 248); }
  }

  .animate-pulse-border {
    animation: pulse-border 2s ease-in-out infinite;
  }
</style>