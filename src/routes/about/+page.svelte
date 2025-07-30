<script lang="ts">
  import { glassmorphismMode } from '$lib/DarkModeStore.svelte';
  import { Keyboard, Heart } from 'lucide-svelte';
  import { language, t } from '$lib/LanguageStore.svelte';

  let currentLanguage = $state($language);

  // Subscribe to language changes
  language.subscribe(value => {
    currentLanguage = value;
  });
</script>

<div class="flex-1 w-full p-6">
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
          {t('about.title', currentLanguage)}
        </h2>
        <p class="text-gray-600 dark:text-gray-300 mt-2">
          {t('about.subtitle', currentLanguage)}
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="space-y-8">
      <!-- App Info Section -->
      <div
        class="{$glassmorphismMode
          ? 'glassmorphism-card'
          : 'bg-white dark:bg-black'} rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300"
      >
        <div class="flex items-start gap-6">
          <div class="flex-shrink-0">
            <div
              class="w-16 h-16 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-black"
            >
              <Keyboard class="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">
              {t('about.appName', currentLanguage)}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {t('about.appDescription', currentLanguage)}
            </p>
            <div class="flex items-center gap-4 text-sm">
              <div class="flex items-center gap-2 text-primary-600">
                <div class="w-2 h-2 rounded-full bg-primary-600"></div>
                <span>{t('about.version', currentLanguage)}</span>
              </div>
              <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <div class="w-2 h-2 rounded-full bg-gray-400 dark:bg-black"></div>
                <span>{t('about.builtWith', currentLanguage)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Performance Features -->
        <div
          class="{$glassmorphismMode
            ? 'glassmorphism-card'
            : 'bg-white dark:bg-black'} rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300"
        >
          <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('about.performance', currentLanguage)}
          </h4>
          <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.adjustableActuation', currentLanguage)}
            </li>
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.rapidTrigger', currentLanguage)}
            </li>
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.realtimeMonitoring', currentLanguage)}
            </li>
          </ul>
        </div>
        <!-- Advanced Features -->
        <div
          class="{$glassmorphismMode
            ? 'glassmorphism-card'
            : 'bg-white dark:bg-black'} rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300"
        >
          <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('about.advancedKeys', currentLanguage)}
          </h4>
          <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.tapHold', currentLanguage)}
            </li>
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.toggleModes', currentLanguage)}
            </li>
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.dynamicKeystroke', currentLanguage)}
            </li>
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.nullBind', currentLanguage)}
            </li>
          </ul>
        </div>
        <!-- Customization -->
        <div
          class="{$glassmorphismMode
            ? 'glassmorphism-card'
            : 'bg-white dark:bg-black'} rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300"
        >
          <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('about.customization', currentLanguage)}
          </h4>
          <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.rgbLighting', currentLanguage)}
            </li>
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.keyRemapping', currentLanguage)}
            </li>
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.multipleThemes', currentLanguage)}
            </li>
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.darkLightMode', currentLanguage)}
            </li>
          </ul>
        </div>

        <!-- Technical -->
        <div
          class="{$glassmorphismMode
            ? 'glassmorphism-card'
            : 'bg-white dark:bg-black'} rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300"
        >
          <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('about.technical', currentLanguage)}
          </h4>
          <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.crossPlatform', currentLanguage)}
            </li>
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.hardwareCalibration', currentLanguage)}
            </li>
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.debugTools', currentLanguage)}
            </li>
            <li class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
              {t('about.profileImportExport', currentLanguage)}
            </li>
          </ul>
        </div>
      </div>
      <!-- GitHub Repository Section -->
      <div
        class="{$glassmorphismMode
          ? 'glassmorphism-card'
          : 'bg-white dark:bg-black'} rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300"
      >
        <div class="flex items-start gap-6">
          <div class="flex-shrink-0">
            <div
              class="w-16 h-16 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-black"
            >
              <svg
                class="w-8 h-8 text-gray-900 dark:text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
            </div>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Open Source Project
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Zellia Control is an open source project built by the community, for the community. We
              welcome contributions, feedback, and support from keyboard enthusiasts worldwide.
            </p>

            <!-- Action Buttons / Payment Methods -->
            {#if currentLanguage === 'zh'}
              <!-- Chinese: GitHub Button + Payment Methods -->
              <div class="flex flex-col sm:flex-row gap-3">
                <button
                  class="{$glassmorphismMode
                    ? 'glassmorphism'
                    : 'bg-primary-600 hover:bg-primary-700'} flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md"
                  onclick={() =>
                    window.open('https://github.com/Zellia-Keyboards/Zellia-Control  ', '_blank')}
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.30 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                    />
                  </svg>
                  <span>View on GitHub</span>
                </button>
              </div>

              <!-- Payment Methods (separate row) -->
              <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Alipay -->
                <div
                  class="{$glassmorphismMode
                    ? 'glassmorphism'
                    : 'bg-white dark:bg-black'} flex flex-col items-center p-4 rounded-lg border-2 border-primary-500 transition-all duration-300"
                >
                  <div class="mb-4">
                    <svg class="w-32 h-8" viewBox="0 0 149.36909 37.663967">
                      <g transform="translate(13.452402,-84.644208)">
                        <g transform="matrix(0.35277777,0,0,-0.35277777,17.912364,84.644208)">
                          <path
                            style="fill:#1677ff;fill-opacity:1;fill-rule:nonzero;stroke:none"
                            d="m 0,0 h -71.95 c -9.37,0 -16.958,-7.655 -16.958,-17.104 v -72.559 c 0,-9.443 7.588,-17.101 16.958,-17.101 H 0 c 9.368,0 16.952,7.658 16.952,17.101 v 72.559 C 16.952,-7.655 9.368,0 0,0"
                          />
                        </g>
                        <g transform="matrix(0.35277777,0,0,-0.35277777,-3.3614425,113.60801)">
                          <path
                            style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none"
                            d="m 0,0 c -16.469,0 -21.338,13.083 -13.199,20.241 2.716,2.419 7.679,3.6 10.325,3.865 9.783,0.975 18.839,-2.789 29.526,-8.05 C 19.14,6.173 9.572,0 0,0 m 58.554,15.064 c -4.236,1.431 -9.92,3.619 -16.251,5.929 3.802,6.666 6.839,14.257 8.835,22.507 H 30.271 v 7.58 h 25.562 v 4.231 H 30.271 V 67.947 H 19.839 c -1.83,0 -1.83,-1.822 -1.83,-1.822 V 55.311 H -7.844 V 51.08 H 18.009 V 43.5 H -3.336 V 39.27 H 38.062 C 36.547,34.006 34.513,29.064 32.099,24.574 18.666,29.044 4.332,32.667 -4.673,30.437 -10.432,29.006 -14.141,26.452 -16.32,23.776 -26.321,11.504 -19.148,-7.136 1.973,-7.136 c 12.488,0 24.518,7.022 33.842,18.594 C 49.722,4.716 77.256,-6.86 77.256,-6.86 V 9.638 c 0,0 -3.458,0.278 -18.702,5.426"
                          />
                        </g>
                        <g transform="matrix(0.35277777,0,0,-0.35277777,67.639214,90.15791)">
                          <path
                            style="fill:#1677ff;fill-opacity:1;fill-rule:nonzero;stroke:none"
                            d="m 0,0 c 0,-5.523 4.036,-9.241 9.666,-9.241 5.63,0 9.666,3.718 9.666,9.241 0,5.417 -4.036,9.242 -9.666,9.242 C 4.036,9.242 0,5.417 0,0"
                          />
                        </g>
                        <path
                          class="fill-black dark:fill-white"
                          d="m 58.121127,115.07721 h 5.920669 V 87.722087 h -5.920669 z"
                        />
                        <g transform="matrix(0.35277777,0,0,-0.35277777,39.122104,105.59659)">
                          <path
                            class="fill-black dark:fill-white"
                            d="M 0,0 9.984,34.522 H 10.41 L 19.864,0 Z M 24.432,48.012 H 1.912 l -25.175,-74.887 h 15.509 l 4.249,14.659 h 26.662 l 4.035,-14.659 h 19.865 z"
                          />
                        </g>
                        <path
                          class="fill-black dark:fill-white"
                          d="m 68.088862,115.07721 h 5.920669 V 94.991814 h -5.920669 z"
                        />
                        <g transform="matrix(0.35277777,0,0,-0.35277777,135.87965,95.029286)">
                          <path
                            class="fill-black dark:fill-white"
                            d="m 0,0 0.105,0.106 h -15.827 l -9.984,-34.628 h -0.531 L -37.709,0.106 h -18.803 l 22.627,-57.148 -9.454,-17.42 v -0.425 h 14.765 z"
                          />
                        </g>
                        <g transform="matrix(0.35277777,0,0,-0.35277777,84.990094,111.62983)">
                          <path
                            class="fill-black dark:fill-white"
                            d="m 0,0 c -1.911,0 -3.718,0.212 -5.735,0.85 v 30.804 c 3.505,2.443 6.373,3.612 9.984,3.612 6.268,0 11.26,-4.993 11.26,-15.615 C 15.509,6.055 8.18,0 0,0 m 10.623,48.331 c -6.161,0 -10.941,-2.337 -16.358,-6.798 v 5.63 H -22.52 V -27.83 h 16.785 v 18.589 c 3.186,-0.85 6.16,-1.275 9.772,-1.275 14.977,0 28.468,11.047 28.468,30.698 0,17.633 -9.774,28.149 -21.882,28.149"
                          />
                        </g>
                        <g transform="matrix(0.35277777,0,0,-0.35277777,108.8615,110.20581)">
                          <path
                            class="fill-black dark:fill-white"
                            d="m 0,0 c -4.461,-2.443 -7.012,-3.399 -9.984,-3.399 -4.037,0 -6.586,2.655 -6.586,6.904 0,1.594 0.318,3.187 1.592,4.461 2.019,2.019 5.95,3.506 14.978,5.63 z m 16.783,0.425 v 23.793 c 0,12.96 -7.647,20.076 -21.137,20.076 -8.605,0 -14.553,-1.486 -25.388,-4.779 l 2.973,-13.066 c 9.879,4.462 14.235,6.374 18.803,6.374 5.524,0 7.966,-3.93 7.966,-9.985 v -0.425 c -19.227,-3.612 -25.175,-5.63 -28.893,-9.348 -2.761,-2.762 -3.929,-6.692 -3.929,-11.259 0,-10.941 8.498,-16.784 16.465,-16.784 5.948,0 10.727,2.231 17.208,7.118 l 1.168,-5.949 h 16.783 z"
                          />
                        </g>
                      </g>
                    </svg>
                  </div>
                  <div class="w-24 h-24 bg-white rounded-lg flex items-center justify-center p-1">
                    <img
                      src="/alipayqr.jpg"
                      alt="Alipay QR Code"
                      class="w-full h-full object-contain rounded"
                    />
                  </div>
                </div>

                <!-- WeChat Pay -->
                <div
                  class="{$glassmorphismMode
                    ? 'glassmorphism'
                    : 'bg-white dark:bg-black'} flex flex-col items-center p-4 rounded-lg border-2 border-green-500 transition-all duration-300"
                >
                  <div class="mb-4">
                    <svg class="w-32 h-8" viewBox="0 0 715.94 211.02">
                      <g>
                        <path
                          d="M684.17,151.37l8.93,24.1c.93,2.7,1.94,5.9,2.61,8.34h.17c.76-2.44,1.6-5.56,2.61-8.51l8.09-23.93h7.84l-11.13,29.08c-5.31,14-8.93,21.16-14,25.54a21.48,21.48,0,0,1-7.57,4.41c-.61-1.09-3.39-5.85-3.39-5.85a19.62,19.62,0,0,0,6.49-3.62,22.5,22.5,0,0,0,6.24-8.26,5.31,5.31,0,0,0,.59-1.77,6.45,6.45,0,0,0-.51-1.94l-15.09-37.59Zm-170.81-.93c12.47,0,15.51,8.51,15.51,16.69v15.26a57.4,57.4,0,0,0,.67,9.78h-6.74l-.59-5.14H522a15.19,15.19,0,0,1-12.47,6.07c-8.26,0-12.47-5.82-12.47-11.72,0-9.86,8.76-15.25,24.53-15.17v-.84c0-3.37-.93-9.44-9.27-9.44a20.61,20.61,0,0,0-9.77,2.52L500,154.07A25.3,25.3,0,0,1,513.36,150.45Zm138.79,0c12.47,0,15.51,8.51,15.51,16.69v15.26a57.41,57.41,0,0,0,.67,9.78h-6.74l-.59-5.14h-.25a15.19,15.19,0,0,1-12.47,6.07c-8.26,0-12.47-5.82-12.47-11.72,0-9.86,8.77-15.25,24.53-15.17v-.84c0-3.37-.93-9.44-9.27-9.44a20.6,20.6,0,0,0-9.77,2.52l-2.53-4.38A25.3,25.3,0,0,1,652.15,150.45Zm-226.09-16c7.08,0,11.55,1.52,13.48,2.53,0,0-2.24,3.9-3.16,5.38a28,28,0,0,0-10.07-1.75c-13.32,0-22.17,8.51-22.17,23.43,0,13.91,8,22.84,21.83,22.84a31.51,31.51,0,0,0,10.48-1.73c.67,1.17,3,5.19,3,5.19-2.7,1.35-8.09,2.7-15,2.7-16,0-28.07-10.11-28.07-28.74C396.39,146.51,408.44,134.43,426.06,134.43Zm-55.11,16c13.32,0,16.86,11.72,16.86,19.22a28,28,0,0,1-.25,3.46H358.9c.17,10,6.57,14.16,14,14.16a27.78,27.78,0,0,0,9.78-1.51c.68,1.12,2.78,4.71,2.78,4.71a33,33,0,0,1-13.57,2.53c-12.56,0-20.06-8.26-20.06-20.57S359.06,150.45,371,150.45Zm181-10.79v11.72H562.57v5.65H552v22c0,5.06,1.43,7.92,5.56,7.92.61,0,1.16,0,1.67-.07.87,1.47,3,5.12,3,5.12a18.19,18.19,0,0,1-6.57,1c-3.46,0-6.24-1.1-8-3.12-2.11-2.19-2.87-5.81-2.87-10.62V157h-6.32V151.34h6.32V139.66Zm56.21-4.72c7.25,0,12.56,1.69,15.93,4.72,3.12,2.7,5,6.83,5,11.88s-1.52,9.19-4.38,12.14c-3.88,4.13-10.2,6.24-17.36,6.24a25.3,25.3,0,0,1-5.9-.51v22.76h-7.33V136A85.05,85.05,0,0,1,608.16,134.94Zm-321.57.42,6.74,28.74c1.69,7.08,3.2,14.16,4.21,19.64h.17c.93-5.65,2.7-12.39,4.64-19.72L310,135.36h7.67l6.91,28.82c1.6,6.74,3.12,13.48,4,19.47h.17c1.18-6.24,2.78-12.56,4.55-19.64l7.5-28.66h7.5l-16.1,56.81h-7.67l-7.16-29.58a171.14,171.14,0,0,1-3.71-18.54h-.17A177.33,177.33,0,0,1,309,162.58L301,192.16h-7.67l-14.41-56.81Zm171.74-3v25.45h.17a13.77,13.77,0,0,1,5.31-5.23,15.27,15.27,0,0,1,7.59-2.11c5.48,0,14.24,3.37,14.24,17.45v24.27h-7.42V168.74c0-6.57-2.44-12.14-9.44-12.14a10.65,10.65,0,0,0-9.95,7.42,9,9,0,0,0-.51,3.54v24.61h-7.42V132.33ZM504.42,180.49c0,4.8,3.2,7.08,7,7.08a10.15,10.15,0,0,0,9.86-6.83,7.74,7.74,0,0,0,.42-2.36v-7.08C513.61,171.18,504.42,172.61,504.42,180.49Zm138.79,0c0,4.8,3.2,7.08,7,7.08a10.15,10.15,0,0,0,9.86-6.83,7.74,7.74,0,0,0,.42-2.36v-7.08C652.4,171.18,643.21,172.61,643.21,180.49ZM370.36,155.76c-7.5,0-10.79,6.91-11.38,12.05h21.66C380.72,163.09,378.7,155.76,370.36,155.76Zm238-15a30.8,30.8,0,0,0-6.91.59v22.08a24.65,24.65,0,0,0,6.07.59c8.85,0,14.24-4.3,14.24-12.14C621.73,144.38,616.42,140.75,608.33,140.75ZM558.42,12.69V27.61h44.14v7.75H558.42v16.2h35.63s-4.57,23.28-31.27,42.88c10.8,5.69,25,9.72,42.38,12.44,0,0-2.81,5-5.21,8.85-19-3.3-33.81-9.08-45.43-15.86-11.71,6.95-26.85,13-46.43,16.4-1.36-2-5.08-8.6-5.08-8.6,17.75-2.78,32.36-7.27,43.28-13.13-26.84-19.25-32-43-32-43h35.53V28.1H504V27.61h45.85V12.69ZM297,41.21l6.88,3.65c-3.27,7.77-6.31,13.06-7.15,14.72v56.38H289V71.76c-4.44,6-7,9.07-8.34,10.54l-4.37-7.57C284.54,65.94,291.88,53.87,297,41.21Zm341.11-28.21,9,2-.28.74c-3.66,9.57-7.09,17.72-10.19,24.22v76H628V56.33a161.16,161.16,0,0,1-10.27,14.75L613,62.76c10.14-13.8,18.67-30.56,24.88-49.18ZM411.75,13l8.15,2s-5.19,16.35-9.16,25l0,76h-8.61V56.63c-3.45,6.5-5.76,10.77-8.68,14.59L389,63.15C400.83,47.91,411.72,13,411.72,13Zm-54.81-.41,7.75,1.55-.18.7c-1.6,6.13-3.37,12.15-5.26,17.91h23.19v7.33h-5.59c-1.44,20.81-5.13,36.93-10.95,47.93,4.62,9,13.52,17.42,16,19.7-.56,1.07-4.44,7.71-4.44,7.71s-12.89-13.2-15.81-19.59c-3.28,5.51-9.33,12.65-17.53,20h0L340,108.49s11.22-9.31,17.58-20.55a125.69,125.69,0,0,1-7.81-32.27c-1.36,2.39-2.1,3.68-3.47,5.73,0,0-3.62-6.29-4.36-7.47,6.51-11.45,11.39-24.94,14.87-40.71h0Zm344.12.88v24.4H716v8.18H701v53.12A15.35,15.35,0,0,1,685.67,114.49h-10v-9h10a6.39,6.39,0,0,0,6.38-6.38V46H644.22v-8.18h47.82v-24.4Zm-214.4,64.91v35.69H426V78.36Zm-149-4.26v19.71c1.45-1.23,5.89-5.13,7.38-6.46l3.57,6.18-16.36,13.81s-3.46-6-4.16-7.11c1-1.07,2.25-3.28,2.25-7.5V81.42H315.44c0,16.86-.68,23-11.92,31.75,0,0-2.71-4.78-3.92-6.78,9.66-7.63,8.51-18.06,8.51-32.29Zm140.81,12H434.58v20.61h43.84ZM582,59.21H526.57c3.17,6.6,11,19.34,28,30.42C571.41,78.38,579,65.55,582,59.21Zm79.67-.53L677.28,83.51,669.13,88l-14.64-25ZM369.47,40.06H356.71c-.13.52-1.33,3.54-1.6,4.13,1.59,15.26,3.94,27,7,34.81,3.79-9.1,6.27-22.18,7.36-38.94Zm118,21.24v7.33H425.12v-7.33Zm-146-3.84v7.33h-35V57.49Zm146-13.22v7.33H425.12V44.24ZM328.23,14.4v26.87h7.92V22.07h6.9v26.09H305.67V22.51H313v18.76h7.91V14.4Zm-30.89-1.78,6.76,4.43a101.69,101.69,0,0,1-22.45,30.55L277.57,40.5C285,33.37,292,23.3,297.35,12.61Zm158.9.37,6.08,13.78h31.1V34.51H419.58V26.76h34.12L449.27,16Z"
                          class="fill-gray-600 dark:fill-white"
                        />
                        <path
                          d="M86.97,133.51a8,8,0,0,1-10.54-3.22l-.52-1.14L54.15,81.35a4.16,4.16,0,0,1-.38-1.68A4,4,0,0,1,60.14,76.5l25.69,18.29a11.86,11.86,0,0,0,10.62,1.22L217.26,42.21c-21.66-25.52-57.32-42.2-97.68-42.2-66,0-119.58,44.62-119.58,99.66,0,30,16.11,57.06,41.32,75.33A8,8,0,0,1,44.66,181.5a9.43,9.43,0,0,1-.42,2.54l-5.39,20.1a11.73,11.73,0,0,0-.64,2.91,4,4,0,0,0,4,4,4.5,4.5,0,0,0,2.3-.74l26.18-15.11a12.55,12.55,0,0,1,6.35-1.84,12,12,0,0,1,3.51.53,141.5,141.5,0,0,0,39,5.46c66,0,119.59-44.62,119.59-99.66A86.29,86.29,0,0,0,225.55,53.5l-137.69,79.5Z"
                          style="fill:#07c160"
                        />
                      </g>
                    </svg>
                  </div>
                  <div class="w-24 h-24 bg-white rounded-lg flex items-center justify-center">
                    <div class="text-xs text-gray-500">QR Code</div>
                  </div>
                </div>
              </div>
            {:else}
              <!-- International: GitHub + Support buttons -->
              <div class="flex flex-col sm:flex-row gap-3">
                <button
                  class="{$glassmorphismMode
                    ? 'glassmorphism'
                    : 'bg-primary-600 hover:bg-primary-700'} flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md"
                  onclick={() =>
                    window.open('https://github.com/Zellia-Keyboards/Zellia-Control  ', '_blank')}
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.30 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                    />
                  </svg>
                  <span>View on GitHub</span>
                </button>

                <button
                  class="{$glassmorphismMode
                    ? 'glassmorphism'
                    : 'bg-transparent hover:bg-primary-50 dark:hover:bg-primary-900'} flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 border-2 border-primary-600 text-primary-600 hover:shadow-sm"
                  onclick={() => window.open('https://github.com/sponsors/your-username', '_blank')}
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    />
                  </svg>
                  <span>Support Development</span>
                </button>
              </div>
            {/if}

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
                  <div class="font-medium text-gray-900 dark:text-white mb-1">Documentation</div>
                  <div class="text-gray-500 dark:text-gray-400">
                    Help improve guides and tutorials
                  </div>
                </div>
                <div class="text-center">
                  <div class="font-medium text-gray-900 dark:text-white mb-1">Community</div>
                  <div class="text-gray-500 dark:text-gray-400">Share feedback and help others</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact/Links -->
      <div
        class="{$glassmorphismMode
          ? 'glassmorphism-card'
          : 'bg-white dark:bg-black'} rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center transition-all duration-300"
      >
        <h3
          class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-2"
        >
          Made with <Heart class="w-5 h-5 text-red-500" /> for the Hall Effect keyboard community
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          © 2025 Zellia Control. Licensed under MIT License.
        </p>
      </div>
    </div>
  </div>
</div>
