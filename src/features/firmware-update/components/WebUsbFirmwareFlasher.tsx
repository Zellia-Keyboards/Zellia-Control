import {
  AlertCircle,
  CheckCircle,
  Cpu,
  Flag,
  RefreshCw,
  RotateCcw,
  Upload,
  Usb,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ChangeEvent, type DragEvent } from 'react';
import {
  FLASH_STEPS,
  progressPercentage,
  stepStatuses,
  type FlashStepId,
  type FlashStepStatus,
} from '../model/flash-steps';
import { useFirmwareFlasher } from '../use-firmware-flasher';
import styles from './WebUsbFirmwareFlasher.module.css';
import { cx } from '../../../lib/class-names';

const STEP_ICONS: Readonly<Record<FlashStepId, LucideIcon>> = {
  choose_binary: Upload,
  reboot_recovery: RotateCcw,
  connect_recovery: Usb,
  update_program: Cpu,
  connect_flash: Usb,
  flash_firmware: Zap,
  finish: Flag,
};

const STEP_CIRCLE_CLASSES: Readonly<Record<FlashStepStatus, string>> = {
  completed: 'bg-primary-500 border-primary-500',
  active: 'bg-primary-100 dark:bg-primary-900/30 border-primary-500 ring-4 ring-primary-500/50',
  error: 'bg-red-500 border-red-500',
  pending: 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600',
};

function StepCircleIcon({
  id,
  status,
}: {
  readonly id: FlashStepId;
  readonly status: FlashStepStatus;
}) {
  if (status === 'completed') return <CheckCircle className="w-5 h-5 text-white" />;
  if (status === 'error') return <AlertCircle className="w-5 h-5 text-white" />;
  const StepIcon = STEP_ICONS[id];
  return (
    <StepIcon
      className={`w-5 h-5 ${status === 'active' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}
    />
  );
}

/**
 * The 7-step firmware updater (port of `WebUSBFirmwareFlasher.svelte`: identical steps, panels
 * and copy), driven by upstream WebDFU (see `../flasher.ts`).
 */
export function WebUsbFirmwareFlasher() {
  const { state, flasher } = useFirmwareFlasher();
  const [fileDropActive, setFileDropActive] = useState(false);
  const statuses = stepStatuses(state);
  const isActive = (id: FlashStepId) =>
    statuses[FLASH_STEPS.findIndex(step => step.id === id)] === 'active';
  const progress = state.phase === 'flash' ? state.progress : 0;

  const chooseFile = (file: File | undefined) => {
    if (file) void flasher.chooseFile(file);
  };

  // File handling functions
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    chooseFile(event.currentTarget.files?.[0]);
  };

  const handleFileDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setFileDropActive(false);
    chooseFile(event.dataTransfer.files[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setFileDropActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setFileDropActive(false);
  };

  const resetFlasher = () => {
    flasher.reset();
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Zellia Firmware Updater
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Update your device firmware via USB DFU
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 w-full h-full min-h-0">
        {/* Left: Vertical Progress Bar */}
        <div className="w-48 flex flex-col py-2">
          {/* Progress Line Background */}
          <div className="absolute left-5 top-0 bottom-0 w-1 bg-gray-200 dark:bg-gray-700"></div>

          {/* Progress Line Fill */}
          <div
            className="absolute left-5 top-0 w-1 bg-primary-500 transition-all duration-700 ease-out origin-top"
            style={{ height: `${progressPercentage(statuses)}%` }}
          ></div>

          {/* Steps */}
          <div
            className="relative flex flex-col justify-between h-full py-2"
            role="list"
            aria-label="Update steps"
          >
            {FLASH_STEPS.map((step, index) => {
              const status = statuses[index] ?? 'pending';
              return (
                <div
                  key={step.id}
                  className={cx(
                    'relative',
                    styles['fade-in'],
                    status === 'active' ? styles.active : undefined,
                    status === 'completed' ? styles.completed : undefined
                  )}
                  role="listitem"
                  aria-current={status === 'active' ? 'step' : undefined}
                >
                  {/* Step Circle with line running through it */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-3 z-10 ${STEP_CIRCLE_CLASSES[status]}`}
                    >
                      <StepCircleIcon id={step.id} status={status} />
                    </div>

                    {/* Step Info (compact) */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {step.name}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Content Area */}
        <div className="flex-1 flex items-center justify-center">
          {/* Choose Binary Step */}
          {isActive('choose_binary') && (
            <div className="text-center space-y-3 w-full max-w-sm">
              <div className="w-12 h-12 mx-auto">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary-500" />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select Firmware File
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choose the .bin firmware file to flash
                </p>
              </div>

              <div
                className={`w-64 h-36 border-2 border-dashed bg-black border-gray-600 rounded-lg flex flex-col items-center justify-center transition-all duration-300 mx-auto hover:border-primary-500 ${fileDropActive ? 'border-primary-500 scale-105 bg-primary-900/40' : ''}`}
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                role="region"
                aria-label="Firmware file drop zone"
              >
                <input
                  type="file"
                  accept=".bin"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="firmware-file-input"
                />

                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- the label text ("Drop firmware here") is nested deeper than the rule searches; markup kept from Svelte */}
                <label
                  htmlFor="firmware-file-input"
                  className="cursor-pointer text-center px-4 w-full h-full flex flex-col items-center justify-center"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                      <Upload className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Drop firmware here
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        or click to browse (.bin files)
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Reboot to Recovery Step */}
          {isActive('reboot_recovery') && (
            <div className="text-center space-y-3 max-w-xs">
              <div className="w-10 h-10 mx-auto">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Enter DFU Mode
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Put your device in DFU mode:
                </p>
                <div className="text-left space-y-1 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="font-medium text-gray-900 dark:text-white">Instructions:</p>
                  <p className="text-gray-600 dark:text-gray-300">1. Power off the device</p>
                  <p className="text-gray-600 dark:text-gray-300">2. Hold the DFU/BOOT button</p>
                  <p className="text-gray-600 dark:text-gray-300">
                    3. Connect USB cable while holding
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">4. Release the button</p>
                </div>
              </div>
              <button
                type="button"
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-orange-500/30"
                onClick={() => {
                  void flasher.confirmDfuMode();
                }}
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Device is in DFU Mode
                </div>
              </button>
            </div>
          )}

          {/* Connect Recovery Step. Svelte shared this panel with Connect Flash ("Reconnect for
              firmware flashing"), which never becomes active here: WebDFU writes over the first
              connection (I-5). */}
          {isActive('connect_recovery') && (
            <div className="text-center space-y-3">
              <div className="w-10 h-10 mx-auto">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <Usb className="w-5 h-5 text-purple-500" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Connect USB Device
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Connect your device in DFU mode
                </p>
              </div>
              <button
                type="button"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-purple-500/30"
                onClick={() => {
                  void flasher.connectDevice();
                }}
              >
                <div className="flex items-center gap-2">
                  <Usb className="w-4 h-4" />
                  Connect USB Device
                </div>
              </button>
            </div>
          )}

          {/* Update Program Step */}
          {isActive('update_program') && (
            <div className="text-center space-y-3">
              <div className="w-10 h-10 mx-auto">
                <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/20 rounded-full flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-cyan-500" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Updating DFU Program
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Preparing bootloader for firmware update...
                </p>
              </div>
            </div>
          )}

          {/* Flash Firmware Step */}
          {isActive('flash_firmware') && (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-red-500" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Flashing Firmware
                </h2>
                <div className="w-48 space-y-1">
                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div
                    className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-label="Progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                  >
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Do not disconnect your device
                </p>
              </div>
            </div>
          )}

          {/* Finish Step */}
          {isActive('finish') && (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Flashing Complete!
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  Your device firmware has been successfully updated. The device will restart
                  automatically.
                </p>
              </div>
              <button
                type="button"
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-green-500/30"
                onClick={resetFlasher}
              >
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Flash Another Device
                </div>
              </button>
            </div>
          )}

          {/* Error State */}
          {state.phase === 'error' && (
            <div className="text-center space-y-3" role="alert">
              <div className="w-10 h-10 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Something went wrong
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{state.message}</p>
              </div>
              <button
                type="button"
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-red-500/30"
                onClick={resetFlasher}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
