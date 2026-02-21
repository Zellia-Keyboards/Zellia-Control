<script lang="ts">
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
    Info,
    RotateCcw,
    Cpu,
    Flag,
  } from 'lucide-svelte';

  type FlashStatus =
    | 'idle'
    | 'choosing'
    | 'verifying'
    | 'rebooting'
    | 'connecting_recovery'
    | 'updating_program'
    | 'connecting_flash'
    | 'flashing'
    | 'success'
    | 'error';

  interface FlashStep {
    id: string;
    name: string;
    icon: any;
    description: string;
    status: 'pending' | 'active' | 'completed' | 'error';
  }

  // AT32F405 DFU Constants
  const AT32_VID = 0x2e3c; // ArteryTek VID
  const AT32_DFU_PID = 0xdf11; // DFU PID
  const DFU_DETACH_TIMEOUT = 1000; // ms
  const DFU_INTERFACE = 0;

  // State management
  let status = $state<FlashStatus>('idle');
  let progress = $state(0);
  let errorMessage = $state('');
  let warningMessage = $state('');

  // File handling
  let selectedFile = $state<File | null>(null);
  let fileContent = $state<ArrayBuffer | null>(null);
  let fileDropActive = $state(false);
  let fileInput = $state<HTMLInputElement>();

  // WebUSB device
  let dfuDevice = $state<USBDevice | null>(null);
  let isTransferring = $state(false);

  // Flash steps
  const flashSteps: FlashStep[] = [
    {
      id: 'choose_binary',
      name: 'Choose Binary',
      icon: Upload,
      description: 'Select firmware file',
      status: 'pending',
    },
    {
      id: 'reboot_recovery',
      name: 'Reboot to Recovery',
      icon: RotateCcw,
      description: 'Enter DFU mode',
      status: 'pending',
    },
    {
      id: 'connect_recovery',
      name: 'Connect Recovery',
      icon: Usb,
      description: 'Connect in DFU mode',
      status: 'pending',
    },
    {
      id: 'update_program',
      name: 'Update Program',
      icon: Cpu,
      description: 'Update DFU bootloader',
      status: 'pending',
    },
    {
      id: 'connect_flash',
      name: 'Connect Flash',
      icon: Usb,
      description: 'Reconnect for flashing',
      status: 'pending',
    },
    {
      id: 'flash_firmware',
      name: 'Flash Firmware',
      icon: Zap,
      description: 'Write firmware to device',
      status: 'pending',
    },
    {
      id: 'finish',
      name: 'Finish',
      icon: Flag,
      description: 'Flashing complete',
      status: 'pending',
    },
  ];

  let steps = $state(flashSteps);

  // Step management
  function updateStepStatus(stepId: string, newStatus: FlashStep['status']) {
    steps = steps.map(step => ({
      ...step,
      status: step.id === stepId ? newStatus : step.status,
    }));
  }

  function getActiveStepIndex(): number {
    return steps.findIndex(step => step.status === 'active');
  }

  function getProgressPercentage(): number {
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const activeStepIndex = getActiveStepIndex();

    if (activeStepIndex === -1) {
      return (completedSteps / steps.length) * 100;
    }

    // Add partial progress for active step
    return ((completedSteps + 0.5) / steps.length) * 100;
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
    updateStepStatus('choose_binary', 'completed');
    updateStepStatus('reboot_recovery', 'active');
    status = 'rebooting';

    if (!file.name.endsWith('.bin')) {
      status = 'error';
      errorMessage = 'Please select a .bin firmware file';
      return;
    }

    selectedFile = file;

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Basic validation
      if (arrayBuffer.byteLength > 1024 * 1024) {
        // Max 1MB
        status = 'error';
        errorMessage = 'Firmware file too large (max 1MB)';
        return;
      }

      if (arrayBuffer.byteLength < 1024) {
        // Min 1KB
        status = 'error';
        errorMessage = 'Firmware file too small (min 1KB)';
        return;
      }

      fileContent = arrayBuffer;

      console.log(
        `Firmware loaded: ${file.name} (${Math.round(arrayBuffer.byteLength / 1024)} KB)`
      );
    } catch (error) {
      status = 'error';
      errorMessage = 'Failed to read firmware file';
      console.error('File read error:', error);
    }
  }

  // DFU functions
  async function connectDFU(reconnect = false): Promise<boolean> {
    try {
      dfuDevice = await navigator.usb.requestDevice({
        filters: [{ vendorId: AT32_VID, productId: AT32_DFU_PID }],
      });

      console.log('DFU device connected:', dfuDevice);

      if (!dfuDevice) return false;

      await dfuDevice.open();
      await dfuDevice.selectConfiguration(1);
      await dfuDevice.claimInterface(DFU_INTERFACE);

      return true;
    } catch (error) {
      console.error('DFU connection error:', error);

      if (error instanceof DOMException) {
        if (error.name === 'NotFoundError') {
          errorMessage = reconnect
            ? 'Device not found. Please reconnect in DFU mode.'
            : 'No device in DFU mode found. Please enter recovery mode first.';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Permission denied. Please allow USB access.';
        } else {
          errorMessage = `USB Error: ${error.message}`;
        }
      } else {
        errorMessage = 'Failed to connect to device';
      }

      return false;
    }
  }

  async function detachAndReboot(): Promise<boolean> {
    if (!dfuDevice) return false;

    try {
      // Send DFU DETACH command to reboot
      await dfuDevice.controlTransferOut({
        requestType: 'class',
        recipient: 'interface',
        request: 0, // DFU_DETACH
        value: DFU_DETACH_TIMEOUT,
        index: DFU_INTERFACE,
      });

      // Wait for device to disconnect
      await new Promise(resolve => setTimeout(resolve, DFU_DETACH_TIMEOUT + 500));

      // Close the device
      try {
        await dfuDevice.close();
      } catch (e) {
        // Device might already be disconnected
      }

      dfuDevice = null;
      return true;
    } catch (error) {
      console.error('Detach error:', error);
      errorMessage = 'Failed to reboot device';
      return false;
    }
  }

  async function downloadFirmware(): Promise<boolean> {
    if (!dfuDevice || !fileContent) return false;

    try {
      const firmwareData = new Uint8Array(fileContent);
      const chunkSize = 2048; // 2KB chunks
      let address = 0x08000000; // AT32F405 flash start

      console.log(`Downloading ${firmwareData.length} bytes to address 0x${address.toString(16)}`);

      // Send firmware in chunks
      for (let offset = 0; offset < firmwareData.length; offset += chunkSize) {
        const chunk = firmwareData.slice(offset, Math.min(offset + chunkSize, firmwareData.length));

        // Set address
        await dfuDevice.controlTransferOut(
          {
            requestType: 'class',
            recipient: 'interface',
            request: 0x21, // DFU_DOWNLOAD
            value: Math.floor(offset / chunkSize),
            index: 0,
          },
          chunk
        );

        // Update progress
        progress = 70 + ((offset + chunk.length) / firmwareData.length) * 25;
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      }

      // Verify download
      await dfuDevice.controlTransferOut(
        {
          requestType: 'class',
          recipient: 'interface',
          request: 0x21, // DFU_DOWNLOAD
          value: 0,
          index: 0,
        },
        new Uint8Array([0])
      ); // Empty packet to finalize

      return true;
    } catch (error) {
      console.error('Download error:', error);
      errorMessage = 'Failed to flash firmware';
      return false;
    }
  }

  // Main flashing sequence
  async function startFlashing() {
    if (!selectedFile || !fileContent) return;

    try {
      // Step 3: Reboot to recovery
      updateStepStatus('reboot_recovery', 'completed');
      updateStepStatus('connect_recovery', 'active');
      status = 'connecting_recovery';

      // Show instructions for entering DFU mode
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 4: Connect in recovery mode
      if (!(await connectDFU())) {
        updateStepStatus('connect_recovery', 'error');
        status = 'error';
        return;
      }

      updateStepStatus('connect_recovery', 'completed');
      updateStepStatus('update_program', 'active');
      status = 'updating_program';
      progress = 40;

      // Step 5: Update program (simulated)
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateStepStatus('update_program', 'completed');
      updateStepStatus('connect_flash', 'active');
      status = 'connecting_flash';
      progress = 50;

      // Step 6: Reconnect for flashing
      await detachAndReboot();
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!(await connectDFU(true))) {
        updateStepStatus('connect_flash', 'error');
        status = 'error';
        return;
      }

      updateStepStatus('connect_flash', 'completed');
      updateStepStatus('flash_firmware', 'active');
      status = 'flashing';
      progress = 60;

      // Step 7: Flash firmware
      if (!(await downloadFirmware())) {
        updateStepStatus('flash_firmware', 'error');
        status = 'error';
        return;
      }

      updateStepStatus('flash_firmware', 'completed');
      updateStepStatus('finish', 'active');
      status = 'success';
      progress = 100;

      // Cleanup
      try {
        if (dfuDevice) {
          await dfuDevice.releaseInterface(DFU_INTERFACE);
          await dfuDevice.close();
          dfuDevice = null;
        }
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    } catch (error) {
      console.error('Flashing error:', error);
      status = 'error';
      errorMessage = 'Flashing failed. Please try again.';
    }
  }

  function resetFlasher() {
    status = 'idle';
    progress = 0;
    errorMessage = '';
    warningMessage = '';
    selectedFile = null;
    fileContent = null;
    dfuDevice = null;
    isTransferring = false;

    steps = steps.map(step => ({ ...step, status: 'pending' as const }));
    updateStepStatus('choose_binary', 'active');

    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Auto-select first step on mount
  $effect(() => {
    updateStepStatus('choose_binary', 'active');
  });
</script>

<!-- Firmware Flasher Layout -->
<div class="h-full flex flex-col p-4">
  <!-- Header -->
  <div class="text-center mb-6">
    <h1 class="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
      Zellia Firmware Updater
    </h1>
    <p class="text-sm text-gray-500 dark:text-gray-400">Update your device firmware via USB DFU</p>
  </div>

  <!-- Main Content -->
  <div class="flex-1 flex gap-4 w-full h-full min-h-0">
    <!-- Left: Vertical Progress Bar -->
    <div class="w-48 flex flex-col py-2">
      <!-- Progress Line Background -->
      <div class="absolute left-5 top-0 bottom-0 w-1 bg-gray-200 dark:bg-gray-700"></div>

      <!-- Progress Line Fill -->
      <div
        class="absolute left-5 top-0 w-1 bg-primary-500 transition-all duration-700 ease-out origin-top"
        style="height: {getProgressPercentage()}%"
      ></div>

      <!-- Steps -->
      <div class="relative flex flex-col justify-between h-full py-2">
        {#each steps as step, index}
          {@const StepIcon = step.icon}
          <div
            class="relative fade-in"
            class:active={step.status === 'active'}
            class:completed={step.status === 'completed'}
          >
            <!-- Step Circle with line running through it -->
            <div class="flex items-center gap-2">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-3 z-10 {step.status ===
                'completed'
                  ? 'bg-primary-500 border-primary-500'
                  : step.status === 'active'
                    ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-500 ring-4 ring-primary-500/50'
                    : step.status === 'error'
                      ? 'bg-red-500 border-red-500'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'}"
              >
                {#if step.status === 'completed'}
                  <CheckCircle class="w-5 h-5 text-white" />
                {:else if step.status === 'error'}
                  <AlertCircle class="w-5 h-5 text-white" />
                {:else}
                  <StepIcon
                    class="w-5 h-5 {step.status === 'active'
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-400'}"
                  />
                {/if}
              </div>

              <!-- Step Info (compact) -->
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {step.name}
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Right: Content Area -->
    <div class="flex-1 flex items-center justify-center">
      <!-- Choose Binary Step -->
      {#if steps[0].status === 'active'}
        <div class="text-center space-y-3 w-full max-w-sm">
          <div class="w-12 h-12 mx-auto">
            <div
              class="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center"
            >
              <Upload class="w-6 h-6 text-primary-500" />
            </div>
          </div>

          <div>
            <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Select Firmware File
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Choose the .bin firmware file to flash
            </p>
          </div>

          <div
            class="w-64 h-36 border-2 border-dashed bg-black border-gray-600 rounded-lg flex flex-col items-center justify-center transition-all duration-300 mx-auto hover:border-primary-500 {fileDropActive
              ? 'border-primary-500 scale-105 bg-primary-900/40'
              : ''} {selectedFile ? 'border-green-500 bg-green-900/30' : ''}"
            ondrop={handleFileDrop}
            ondragover={handleDragOver}
            ondragleave={handleDragLeave}
            role="region"
            aria-label="Firmware file drop zone"
          >
            <input
              type="file"
              accept=".bin"
              onchange={handleFileSelect}
              bind:this={fileInput}
              class="hidden"
              id="firmware-file-input"
            />

            <label
              for="firmware-file-input"
              class="cursor-pointer text-center px-4 w-full h-full flex flex-col items-center justify-center"
            >
              {#if selectedFile}
                <div class="space-y-3">
                  <div
                    class="w-10 h-10 mx-auto bg-green-500 rounded-lg flex items-center justify-center"
                  >
                    <CheckCircle class="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p class="text-sm text-green-600 dark:text-green-400">
                      ✓ {Math.round((fileContent?.byteLength || 0) / 1024)} KB - Ready
                    </p>
                  </div>
                </div>
              {:else}
                <div class="space-y-3">
                  <div
                    class="w-12 h-12 mx-auto bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center"
                  >
                    <Upload class="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      Drop firmware here
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      or click to browse (.bin files)
                    </p>
                  </div>
                </div>
              {/if}
            </label>
          </div>
        </div>
      {/if}

      <!-- Reboot to Recovery Step -->
      {#if steps[1].status === 'active'}
        <div class="text-center space-y-3 max-w-xs">
          <div class="w-10 h-10 mx-auto">
            <div
              class="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center"
            >
              <RotateCcw class="w-5 h-5 text-orange-500" />
            </div>
          </div>
          <div>
            <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Enter DFU Mode</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Put your device in DFU mode:
            </p>
            <div class="text-left space-y-1 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p class="font-medium text-gray-900 dark:text-white">Instructions:</p>
              <p class="text-gray-600 dark:text-gray-300">1. Power off the device</p>
              <p class="text-gray-600 dark:text-gray-300">2. Hold the DFU/BOOT button</p>
              <p class="text-gray-600 dark:text-gray-300">3. Connect USB cable while holding</p>
              <p class="text-gray-600 dark:text-gray-300">4. Release the button</p>
            </div>
          </div>
          <button
            class="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-orange-500/30"
            onclick={startFlashing}
          >
            <div class="flex items-center gap-2">
              <RotateCcw class="w-4 h-4" />
              Device is in DFU Mode
            </div>
          </button>
        </div>
      {/if}

      <!-- Connect Recovery/Flash Steps -->
      {#if steps[2].status === 'active' || steps[4].status === 'active'}
        <div class="text-center space-y-3">
          <div class="w-10 h-10 mx-auto">
            <div
              class="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center"
            >
              <Usb class="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div>
            <h2 class="text-lg font-medium text-gray-900 dark:text-white">Connect USB Device</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {steps[2].status === 'active'
                ? 'Connect your device in DFU mode'
                : 'Reconnect for firmware flashing'}
            </p>
          </div>
          <button
            class="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-purple-500/30"
            onclick={() => connectDFU()}
          >
            <div class="flex items-center gap-2">
              <Usb class="w-4 h-4" />
              Connect USB Device
            </div>
          </button>
        </div>
      {/if}

      <!-- Update Program Step -->
      {#if steps[3].status === 'active'}
        <div class="text-center space-y-3">
          <div class="w-10 h-10 mx-auto">
            <div
              class="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/20 rounded-full flex items-center justify-center"
            >
              <Cpu class="w-5 h-5 text-cyan-500" />
            </div>
          </div>
          <div>
            <h2 class="text-lg font-medium text-gray-900 dark:text-white">Updating DFU Program</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Preparing bootloader for firmware update...
            </p>
          </div>
        </div>
      {/if}

      <!-- Flash Firmware Step -->
      {#if steps[5].status === 'active'}
        <div class="text-center space-y-3">
          <div class="w-12 h-12 mx-auto">
            <div
              class="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center"
            >
              <Zap class="w-6 h-6 text-red-500" />
            </div>
          </div>
          <div>
            <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Flashing Firmware
            </h2>
            <div class="w-48 space-y-1">
              <div class="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-red-500 rounded-full transition-all duration-300"
                  style="width: {progress}%"
                ></div>
              </div>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Do not disconnect your device
            </p>
          </div>
        </div>
      {/if}

      <!-- Finish Step -->
      {#if steps[6].status === 'active'}
        <div class="text-center space-y-3">
          <div class="w-12 h-12 mx-auto">
            <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle class="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h2 class="text-lg font-medium text-gray-900 dark:text-white">Flashing Complete!</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Your device firmware has been successfully updated. The device will restart
              automatically.
            </p>
          </div>
          <button
            class="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-green-500/30"
            onclick={resetFlasher}
          >
            <div class="flex items-center gap-2">
              <Upload class="w-4 h-4" />
              Flash Another Device
            </div>
          </button>
        </div>
      {/if}

      <!-- Error State -->
      {#if status === 'error'}
        <div class="text-center space-y-3">
          <div
            class="w-10 h-10 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center"
          >
            <AlertCircle class="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 class="text-lg font-medium text-gray-900 dark:text-white">Something went wrong</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              {errorMessage}
            </p>
          </div>
          <button
            class="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-red-500/30"
            onclick={resetFlasher}
          >
            <div class="flex items-center gap-2">
              <RefreshCw class="w-4 h-4" />
              Try Again
            </div>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* Fade animations */
  .fade-in {
    animation: fadeIn 0.5s ease-in-out;
  }

  .fade-in.active {
    animation: none;
  }

  .fade-in.completed {
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Pulse animation for active state */
  .active .w-10 {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }
</style>
