<script lang="ts">
  interface Props {
    onGitHubClick?: () => void;
  }

  let { onGitHubClick }: Props = $props();
</script>

<div
  class="glassmorphism-card rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300"
>
  <div class="flex items-start gap-6">
    <div class="flex-shrink-0">
      <div class="w-16 h-16 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-black">
        <svg class="w-8 h-8 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.30 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
          />
        </svg>
      </div>
    </div>
    <div class="flex-1">
      <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">
        Open Source Library - zellia_libamp
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
        While Zellia Control is proprietary software, our core library <strong>zellia_libamp</strong
        >
        is fully open source. The library powers keyboard communication protocols and is available for
        developers to use.
      </p>

      <!-- GitHub Button -->
      <div class="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          class="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 text-white dark:text-gray-900 shadow-sm hover:shadow-md"
          onclick={onGitHubClick}
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.30 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
            />
          </svg>
          <span>View zellia_libamp on GitHub</span>
        </button>
      </div>

      <!-- Library Features -->
      <div class="pt-4 border-t border-gray-200 dark:border-gray-600">
        <h4 class="font-medium text-gray-900 dark:text-white mb-3">Library Features:</h4>
        <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
            HID Communication Protocol for Hall Effect keyboards
          </li>
          <li class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
            Analog key data processing and calibration
          </li>
          <li class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
            Rapid Trigger and advanced key mode implementations
          </li>
          <li class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
            Cross-platform support (Windows, macOS, Linux)
          </li>
        </ul>
      </div>

      <!-- Contribution Info -->
      <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div class="text-center">
            <div class="font-medium text-gray-900 dark:text-white mb-1">Contribute Code</div>
            <div class="text-gray-500 dark:text-gray-400">
              Submit PRs, report bugs, suggest features
            </div>
          </div>
          <div class="text-center">
            <div class="font-medium text-gray-900 dark:text-white mb-1">Performance</div>
            <div class="text-gray-500 dark:text-gray-400">
              Help improve performance and efficiency
            </div>
          </div>
          <div class="text-center">
            <div class="font-medium text-gray-900 dark:text-white mb-1">Integration</div>
            <div class="text-gray-500 dark:text-gray-400">
              Build your own keyboard with zellia_libamp
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
