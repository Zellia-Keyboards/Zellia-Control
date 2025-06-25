<script lang="ts">
    import "../app.css";
    import Zellia80HE from "../lib/Zellia80HE.svelte";    
    import { KeyboardDisplayValues } from "$lib/KeyboardState.svelte";
    import { page } from '$app/stores';    import { darkMode, selectedThemeColor, themeColors, type ThemeColorName } from '$lib/DarkModeStore.svelte';
    import { language, t, type Language } from '$lib/LanguageStore.svelte';
    import {Palette, Sun, Moon, Globe} from 'lucide-svelte';     
    const NAVIGATE = [
        ["/performance", "nav.performance"],
        ["/remap", "nav.remap"],
        ["/lighting", "nav.lighting"],
        ["/advancedkey", "nav.advancedkey"],
        ["/calibration", "nav.calibration"],
        ["/debug", "nav.debug"],
        ["/settings", "nav.settings"],
        ["/about", "nav.about"],
    ]
    ;let { children } = $props();
    let selectedLayer = $state(1);    let showDropdown = $state(false);
    let showThemeSelector = $state(false);
    let showLanguageSelector = $state(false);
    let showFirefoxWarning = $state(false);
    let currentTheme = $state<ThemeColorName>('indigo');
    let currentLanguage = $state<Language>('en');

    selectedThemeColor.subscribe(value => {
        currentTheme = value;
    });

    language.subscribe(value => {
        currentLanguage = value;
    });    function setTheme(colorName: ThemeColorName) {
        selectedThemeColor.set(colorName);
    }

    function setLanguage(lang: Language) {
        language.set(lang);
    }    // Function to check if a navigation item is active
    function isActive(href: string): boolean {
        return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
    }    // Set page language for accessibility
    $effect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = currentLanguage;
            
            // Check if user is using Firefox
            if (navigator.userAgent.toLowerCase().includes('firefox')) {
                showFirefoxWarning = true;
            }
        }
    });
</script>

<!-- Small Screen Warning (follows codebase theme) -->
<div class="xl:hidden fixed inset-0 flex items-center justify-center z-50"
     style="background-color: {$darkMode ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)` : `color-mix(in srgb, var(--theme-color-primary) 5%, white)`};">
    <div class="max-w-2xl mx-4">
        <!-- Main Warning Card -->
        <div class="rounded-xl shadow-lg border p-8 text-center"
             style="background-color: {$darkMode ? `color-mix(in srgb, var(--theme-color-primary) 8%, black)` : 'white'}; 
                    border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'};
                    color: {$darkMode ? 'white' : '#111827'};">
            <!-- Icon and Title -->
            <div class="flex items-center justify-center mb-6">
                <div class="w-16 h-16 rounded-xl flex items-center justify-center"
                     style="background-color: {$darkMode ? `color-mix(in srgb, var(--theme-color-primary) 20%, white)` : `color-mix(in srgb, var(--theme-color-primary) 15%, white)`};">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                         style="color: {$darkMode ? 'black' : 'var(--theme-color-primary)'};">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
            </div>
            
            <h2 class="text-2xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Display Too Small</h2>
            <p class="{$darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6 leading-relaxed">
                Zellia Control requires a larger display for the optimal keyboard configuration experience. 
                Please use a desktop or laptop computer, or expand your browser window.
            </p>
            
            <!-- Requirements Info -->
            <div class="border rounded-lg p-4 mb-6"
                 style="background-color: {$darkMode ? `color-mix(in srgb, var(--theme-color-primary) 15%, white)` : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`}; 
                        border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 30%, gray)' : `color-mix(in srgb, var(--theme-color-primary) 20%, white)`};">
                <div class="flex items-center gap-3"
                     style="color: {$darkMode ? 'black' : 'var(--theme-color-primary)'};">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div class="text-sm font-medium">
                        Minimum recommended width: 1280px
                    </div>
                </div>
            </div>
            
            <!-- Features that require larger screen -->
            <div class="text-left space-y-3 mb-6">                <h3 class="text-lg font-medium {$darkMode ? 'text-white' : 'text-gray-900'} text-center mb-4">{t('ui.featuresRequiringLargerDisplay', currentLanguage)}</h3>
                <div class="grid grid-cols-1 gap-3">
                    <div class="flex items-center gap-3 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-700'}">
                        <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                        <span>{t('ui.keyboardLayoutVisualization', currentLanguage)}</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-700'}">
                        <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                        <span>{t('ui.advancedKeyConfigPanels', currentLanguage)}</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-700'}">
                        <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                        <span>Performance tuning controls</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-700'}">
                        <div class="w-1.5 h-1.5 rounded-full" style="background-color: var(--theme-color-primary);"></div>
                        <span>Lighting configuration interface</span>
                    </div>
                </div>
            </div>        </div>
    </div>
</div>

<!-- Firefox Warning Modal (fullscreen) -->
{#if showFirefoxWarning}
<div class="fixed inset-0 flex items-center justify-center z-50"
     style="background-color: {$darkMode ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)` : `color-mix(in srgb, var(--theme-color-primary) 5%, white)`};">
    <div class="max-w-2xl mx-4">
        <!-- Main Warning Card -->
        <div class="rounded-xl shadow-lg border p-8 text-center"
             style="background-color: {$darkMode ? `color-mix(in srgb, var(--theme-color-primary) 8%, black)` : 'white'}; 
                    border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 20%, #374151)' : 'color-mix(in srgb, var(--theme-color-primary) 15%, #e5e7eb)'};
                    color: {$darkMode ? 'white' : '#111827'};">
              <!-- Firefox Icon and Title -->
            <div class="flex items-center justify-center mb-6">                
                <div class="w-16 h-16 rounded-xl flex items-center justify-center relative"
                     style="background-color: {$darkMode ? `color-mix(in srgb, var(--theme-color-primary) 20%, white)` : `color-mix(in srgb, var(--theme-color-primary) 15%, white)`};">                    
                    <!-- Firefox SVG -->
                    <svg class="w-10 h-10" viewBox="0 0 512 512">
                        <defs>
                            <radialGradient id="g" cx="210%" cy="-100%" r="290%">
                                <stop offset=".1" stop-color="#ffe226"/>
                                <stop offset=".79" stop-color="#ff7139"/>
                            </radialGradient>
                            <radialGradient id="c" cx="49%" cy="40%" r="128%" gradientTransform="matrix(.82 0 0 1 .088 0)">
                                <stop offset=".3" stop-color="#960e18"/>
                                <stop offset=".35" stop-color="#b11927" stop-opacity=".74"/>
                                <stop offset=".43" stop-color="#db293d" stop-opacity=".34"/>
                                <stop offset=".5" stop-color="#f5334b" stop-opacity=".09"/>
                                <stop offset=".53" stop-color="#ff3750" stop-opacity="0"/>
                            </radialGradient>
                            <radialGradient id="d" cx="48%" cy="-12%" r="140%">
                                <stop offset=".13" stop-color="#fff44f"/>
                                <stop offset=".53" stop-color="#ff980e"/>
                            </radialGradient>
                            <radialGradient id="e" cx="22.76%" cy="110.11%" r="100%">
                                <stop offset=".35" stop-color="#3a8ee6"/>
                                <stop offset=".67" stop-color="#9059ff"/>
                                <stop offset="1" stop-color="#c139e6"/>
                            </radialGradient>
                            <radialGradient id="f" cx="52%" cy="33%" r="59%" gradientTransform="scale(.9 1)">
                                <stop offset=".21" stop-color="#9059ff" stop-opacity="0"/>
                                <stop offset=".97" stop-color="#6e008b" stop-opacity=".6"/>
                            </radialGradient>
                            <radialGradient id="b" cx="87.4%" cy="-12.9%" r="128%" gradientTransform="matrix(.8 0 0 1 .178 .129)">
                                <stop offset=".13" stop-color="#ffbd4f"/>
                                <stop offset=".28" stop-color="#ff980e"/>
                                <stop offset=".47" stop-color="#ff3750"/>
                                <stop offset=".78" stop-color="#eb0878"/>
                                <stop offset=".86" stop-color="#e50080"/>
                            </radialGradient>
                            <radialGradient id="h" cx="84%" cy="-41%" r="180%">
                                <stop offset=".11" stop-color="#fff44f"/>
                                <stop offset=".46" stop-color="#ff980e"/>
                                <stop offset=".72" stop-color="#ff3647"/>
                                <stop offset=".9" stop-color="#e31587"/>
                            </radialGradient>
                            <radialGradient id="i" cx="16.1%" cy="-18.6%" r="348.8%" gradientTransform="scale(1 .47) rotate(84 .279 -.297)">
                                <stop offset="0" stop-color="#fff44f"/>
                                <stop offset=".3" stop-color="#ff980e"/>
                                <stop offset=".57" stop-color="#ff3647"/>
                                <stop offset=".74" stop-color="#e31587"/>
                            </radialGradient>
                            <radialGradient id="j" cx="18.9%" cy="-42.5%" r="238.4%">
                                <stop offset=".14" stop-color="#fff44f"/>
                                <stop offset=".48" stop-color="#ff980e"/>
                                <stop offset=".66" stop-color="#ff3647"/>
                                <stop offset=".9" stop-color="#e31587"/>
                            </radialGradient>
                            <radialGradient id="k" cx="159.3%" cy="-44.72%" r="313.1%">
                                <stop offset=".09" stop-color="#fff44f"/>
                                <stop offset=".63" stop-color="#ff980e"/>
                            </radialGradient>
                            <linearGradient id="a" x1="87.25%" y1="15.5%" x2="9.4%" y2="93.1%">
                                <stop offset=".05" stop-color="#fff44f"/>
                                <stop offset=".37" stop-color="#ff980e"/>
                                <stop offset=".53" stop-color="#ff3647"/>
                                <stop offset=".7" stop-color="#e31587"/>
                            </linearGradient>
                            <linearGradient id="l" x1="80%" y1="14%" x2="18%" y2="84%">
                                <stop offset=".17" stop-color="#fff44f" stop-opacity=".8"/>
                                <stop offset=".6" stop-color="#fff44f" stop-opacity="0"/>
                            </linearGradient>
                        </defs>
                        <path d="M478.711 166.353c-10.445-25.124-31.6-52.248-48.212-60.821 13.52 26.505 21.345 53.093 24.335 72.936 0 .039.015.136.047.4C427.706 111.135 381.627 83.823 344 24.355c-1.9-3.007-3.805-6.022-5.661-9.2a73.716 73.716 0 01-2.646-4.972A43.7 43.7 0 01332.1.677a.626.626 0 00-.546-.644.818.818 0 00-.451 0c-.034.012-.084.051-.12.065-.053.021-.12.069-.176.1.027-.036.083-.117.1-.136-60.37 35.356-80.85 100.761-82.732 133.484a120.249 120.249 0 00-66.142 25.488 71.355 71.355 0 00-6.225-4.7 111.338 111.338 0 01-.674-58.732c-24.688 11.241-43.89 29.01-57.85 44.7h-.111c-9.527-12.067-8.855-51.873-8.312-60.184-.114-.515-7.107 3.63-8.023 4.255a175.073 175.073 0 00-23.486 20.12 210.478 210.478 0 00-22.442 26.913c0 .012-.007.026-.011.038 0-.013.007-.026.011-.038a202.838 202.838 0 00-32.247 72.805c-.115.521-.212 1.061-.324 1.586-.452 2.116-2.08 12.7-2.365 15-.022.177-.032.347-.053.524a229.066 229.066 0 00-3.9 33.157c0 .41-.025.816-.025 1.227C16 388.418 123.6 496 256.324 496c118.865 0 217.56-86.288 236.882-199.63.407-3.076.733-6.168 1.092-9.271 4.777-41.21-.53-84.525-15.587-120.746zM201.716 354.447c1.124.537 2.18 1.124 3.334 1.639.048.033.114.07.163.1a126.191 126.191 0 01-3.497-1.739zm55.053-144.93zm198.131-30.59l-.032-.233c.012.085.027.174.04.259z" fill="url(#a)"/>
                        <path d="M478.711 166.353c-10.445-25.124-31.6-52.248-48.212-60.821 13.52 26.505 21.345 53.093 24.335 72.936 0-.058.011.048.036.226.012.085.027.174.04.259 22.675 61.47 10.322 123.978-7.479 162.175-27.539 59.1-94.215 119.67-198.576 116.716C136.1 454.651 36.766 370.988 18.223 261.41c-3.379-17.28 0-26.054 1.7-40.084-2.071 10.816-2.86 13.94-3.9 33.157 0 .41-.025.816-.025 1.227C16 388.418 123.6 496 256.324 496c118.865 0 217.56-86.288 236.882-199.63.407-3.076.733-6.168 1.092-9.271 4.777-41.21-.53-84.525-15.587-120.746z" fill="url(#b)"/>
                        <path d="M478.711 166.353c-10.445-25.124-31.6-52.248-48.212-60.821 13.52 26.505 21.345 53.093 24.335 72.936 0-.058.011.048.036.226.012.085.027.174.04.259 22.675 61.47 10.322 123.978-7.479 162.175-27.539 59.1-94.215 119.67-198.576 116.716C136.1 454.651 36.766 370.988 18.223 261.41c-3.379-17.28 0-26.054 1.7-40.084-2.071 10.816-2.86 13.94-3.9 33.157 0 .41-.025.816-.025 1.227C16 388.418 123.6 496 256.324 496c118.865 0 217.56-86.288 236.882-199.63.407-3.076.733-6.168 1.092-9.271 4.777-41.21-.53-84.525-15.587-120.746z" fill="url(#c)"/>
                        <path d="M361.922 194.6c.524.368 1 .734 1.493 1.1a130.706 130.706 0 00-22.31-29.112C266.4 91.892 321.516 4.626 330.811.194c.027-.036.083-.117.1-.136-60.37 35.356-80.85 100.761-82.732 133.484 2.8-.194 5.592-.429 8.442-.429 45.051 0 84.289 24.77 105.301 61.487z" fill="url(#d)"/>
                        <path d="M256.772 209.514c-.393 5.978-21.514 26.593-28.9 26.593-68.339 0-79.432 41.335-79.432 41.335 3.027 34.81 27.261 63.475 56.611 78.643 1.339.692 2.694 1.317 4.05 1.935a132.768 132.768 0 007.059 2.886 106.743 106.743 0 0031.271 6.031c119.78 5.618 142.986-143.194 56.545-186.408 22.137-3.85 45.115 5.053 57.947 14.067-21.012-36.714-60.25-61.484-105.3-61.484-2.85 0-5.641.235-8.442.429a120.249 120.249 0 00-66.142 25.488c3.664 3.1 7.8 7.244 16.514 15.828 16.302 16.067 58.13 32.705 58.219 34.657z" fill="url(#e)"/>
                        <path d="M256.772 209.514c-.393 5.978-21.514 26.593-28.9 26.593-68.339 0-79.432 41.335-79.432 41.335 3.027 34.81 27.261 63.475 56.611 78.643 1.339.692 2.694 1.317 4.05 1.935a132.768 132.768 0 007.059 2.886 106.743 106.743 0 0031.271 6.031c119.78 5.618 142.986-143.194 56.545-186.408 22.137-3.85 45.115 5.053 57.947 14.067-21.012-36.714-60.25-61.484-105.3-61.484-2.85 0-5.641.235-8.442.429a120.249 120.249 0 00-66.142 25.488c3.664 3.1 7.8 7.244 16.514 15.828 16.302 16.067 58.13 32.705 58.219 34.657z" fill="url(#f)"/>
                        <path d="M170.829 151.036a244.042 244.042 0 014.981 3.3 111.338 111.338 0 01-.674-58.732c-24.688 11.241-43.89 29.01-57.85 44.7 1.155-.033 36.014-.66 53.543 10.732z" fill="url(#g)"/>
                        <path d="M18.223 261.41C36.766 370.988 136.1 454.651 248.855 457.844c104.361 2.954 171.037-57.62 198.576-116.716 17.8-38.2 30.154-100.7 7.479-162.175l-.008-.026-.032-.233c-.025-.178-.04-.284-.036-.226 0 .039.015.136.047.4 8.524 55.661-19.79 109.584-64.051 146.044l-.133.313c-86.245 70.223-168.774 42.368-185.484 30.966a144.108 144.108 0 01-3.5-1.743c-50.282-24.029-71.054-69.838-66.6-109.124-42.457 0-56.934-35.809-56.934-35.809s38.119-27.179 88.358-3.541c46.53 21.893 90.228 3.543 90.233 3.541-.089-1.952-41.917-18.59-58.223-34.656-8.713-8.584-12.85-12.723-16.514-15.828a71.355 71.355 0 00-6.225-4.7 282.929 282.929 0 00-4.981-3.3c-17.528-11.392-52.388-10.765-53.543-10.735h-.111c-9.527-12.067-8.855-51.873-8.312-60.184-.114-.515-7.107 3.63-8.023 4.255a175.073 175.073 0 00-23.486 20.12 210.478 210.478 0 00-22.442 26.919c0 .012-.007.026-.011.038 0-.013.007-.026.011-.038a202.838 202.838 0 00-32.247 72.805c-.115.521-8.65 37.842-4.44 57.199z" fill="url(#h)"/>
                        <path d="M341.105 166.587a130.706 130.706 0 0122.31 29.112c1.323.994 2.559 1.985 3.608 2.952 54.482 50.2 25.936 121.2 23.807 126.26 44.261-36.46 72.575-90.383 64.051-146.044C427.706 111.135 381.627 83.823 344 24.355c-1.9-3.007-3.805-6.022-5.661-9.2a73.716 73.716 0 01-2.646-4.972A43.7 43.7 0 01332.1.677a.626.626 0 00-.546-.644.818.818 0 00-.451 0c-.034.012-.084.051-.12.065-.053.021-.12.069-.176.1-9.291 4.428-64.407 91.694 10.298 166.389z" fill="url(#i)"/>
                        <path d="M367.023 198.651c-1.049-.967-2.285-1.958-3.608-2.952-.489-.368-.969-.734-1.493-1.1-12.832-9.014-35.81-17.917-57.947-14.067 86.441 43.214 63.235 192.026-56.545 186.408a106.743 106.743 0 01-31.271-6.031 134.51 134.51 0 01-7.059-2.886c-1.356-.618-2.711-1.243-4.05-1.935.048.033.114.07.163.1 16.71 11.4 99.239 39.257 185.484-30.966l.133-.313c2.129-5.054 30.675-76.057-23.807-126.258z" fill="url(#j)"/>
                        <path d="M148.439 277.443s11.093-41.335 79.432-41.335c7.388 0 28.509-20.615 28.9-26.593s-43.7 18.352-90.233-3.541c-50.239-23.638-88.358 3.541-88.358 3.541s14.477 35.809 56.934 35.809c-4.453 39.286 16.319 85.1 66.6 109.124 1.124.537 2.18 1.124 3.334 1.639-29.348-15.169-53.582-43.834-56.609-78.644z" fill="url(#k)"/>
                        <path d="M478.711 166.353c-10.445-25.124-31.6-52.248-48.212-60.821 13.52 26.505 21.345 53.093 24.335 72.936 0 .039.015.136.047.4C427.706 111.135 381.627 83.823 344 24.355c-1.9-3.007-3.805-6.022-5.661-9.2a73.716 73.716 0 01-2.646-4.972A43.7 43.7 0 01332.1.677a.626.626 0 00-.546-.644.818.818 0 00-.451 0c-.034.012-.084.051-.12.065-.053.021-.12.069-.176.1.027-.036.083-.117.1-.136-60.37 35.356-80.85 100.761-82.732 133.484 2.8-.194 5.592-.429 8.442-.429 45.053 0 84.291 24.77 105.3 61.484-12.832-9.014-35.81-17.917-57.947-14.067 86.441 43.214 63.235 192.026-56.545 186.408a106.743 106.743 0 01-31.271-6.031 134.51 134.51 0 01-7.059-2.886c-1.356-.618-2.711-1.243-4.05-1.935.048.033.114.07.163.1a144.108 144.108 0 01-3.5-1.743c1.124.537 2.18 1.124 3.334 1.639-29.35-15.168-53.584-43.833-56.611-78.643 0 0 11.093-41.335 79.432-41.335 7.388 0 28.509-20.615 28.9-26.593-.089-1.952-41.917-18.59-58.223-34.656-8.713-8.584-12.85-12.723-16.514-15.828a71.355 71.355 0 00-6.225-4.7 111.338 111.338 0 01-.674-58.732c-24.688 11.241-43.89 29.01-57.85 44.7h-.111c-9.527-12.067-8.855-51.873-8.312-60.184-.114-.515-7.107 3.63-8.023 4.255a175.073 175.073 0 00-23.486 20.12 210.478 210.478 0 00-22.435 26.916c0 .012-.007.026-.011.038 0-.013.007-.026.011-.038a202.838 202.838 0 00-32.247 72.805c-.115.521-.212 1.061-.324 1.586-.452 2.116-2.486 12.853-2.77 15.156-.022.177.021-.176 0 0a279.565 279.565 0 00-3.544 33.53c0 .41-.025.816-.025 1.227C16 388.418 123.6 496 256.324 496c118.865 0 217.56-86.288 236.882-199.63.407-3.076.733-6.168 1.092-9.271 4.777-41.21-.53-84.525-15.587-120.746zm-23.841 12.341c.012.085.027.174.04.259l-.008-.026-.032-.233z" fill="url(#l)"/>                    
                    </svg>
                </div>
            </div>
            
            <h2 class="text-2xl font-bold {$darkMode ? 'text-white' : 'text-gray-900'} mb-4">Firefox Not Supported</h2>
            <p class="{$darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6 leading-relaxed">
                Firefox doesn't support WebHID (hardware communication), which is required for keyboard configuration. 
                Please use Chrome or Edge for the best experience.
            </p>
              <!-- Browser Recommendations -->
            <div class="border rounded-lg p-4 mb-6"
                 style="background-color: {$darkMode ? `color-mix(in srgb, var(--theme-color-primary) 15%, white)` : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`}; 
                        border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 30%, gray)' : `color-mix(in srgb, var(--theme-color-primary) 20%, white)`};">
                <h3 class="text-lg font-medium {$darkMode ? 'text-gray-800' : 'text-gray-900'} mb-3">Recommended Browsers</h3>
                <div class="flex justify-center gap-8">
                    <div class="text-center">
                        <!-- Chrome Logo -->
                        <div class="w-12 h-12 flex items-center justify-center mb-2 mx-auto">                            
                            <svg class="w-10 h-10" viewBox="0 0 48 48" fill="none">
                                <defs>
                                    <linearGradient id="chrome-a" x1="3.2173" y1="15" x2="44.7812" y2="15" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stop-color="#d93025" />
                                        <stop offset="1" stop-color="#ea4335" />
                                    </linearGradient>
                                    <linearGradient id="chrome-b" x1="20.7219" y1="47.6791" x2="41.5039" y2="11.6837" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stop-color="#fcc934" />
                                        <stop offset="1" stop-color="#fbbc04" />
                                    </linearGradient>
                                    <linearGradient id="chrome-c" x1="26.5981" y1="46.5015" x2="5.8161" y2="10.506" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stop-color="#1e8e3e" />
                                        <stop offset="1" stop-color="#34a853" />
                                    </linearGradient>
                                </defs>
                                <circle cx="24" cy="23.9947" r="12" fill="#fff" />
                                <path d="M3.2154,36A24,24,0,1,0,12,3.2154,24,24,0,0,0,3.2154,36ZM34.3923,18A12,12,0,1,1,18,13.6077,12,12,0,0,1,34.3923,18Z" fill="none" />
                                <path d="M24,12H44.7812a23.9939,23.9939,0,0,0-41.5639.0029L13.6079,30l.0093-.0024A11.9852,11.9852,0,0,1,24,12Z" fill="url(#chrome-a)" />
                                <circle cx="24" cy="24" r="9.5" fill="#1a73e8" />
                                <path d="M34.3913,30.0029,24.0007,48A23.994,23.994,0,0,0,44.78,12.0031H23.9989l-.0025.0093A11.985,11.985,0,0,1,34.3913,30.0029Z" fill="url(#chrome-b)" />
                                <path d="M13.6086,30.0031,3.218,12.006A23.994,23.994,0,0,0,24.0025,48L34.3931,30.0029l-.0067-.0068a11.9852,11.9852,0,0,1-20.7778.007Z" fill="url(#chrome-c)" />
                            </svg>
                        </div>                        
                        <div class="text-sm font-medium {$darkMode ? 'text-gray-800' : 'text-gray-700'}">Google Chrome</div>
                    </div>
                    <div class="text-center">
                        <!-- Edge Logo -->                        
                         <div class="w-12 h-12 flex items-center justify-center mb-2 mx-auto">
                            <svg class="w-10 h-10" viewBox="0 0 256 256" fill="none">
                                <defs>
                                    <radialGradient id="edge-b" cx="161.8" cy="68.9" r="95.4" gradientTransform="matrix(1 0 0 -.95 0 248.8)" gradientUnits="userSpaceOnUse">
                                        <stop offset=".7" stop-opacity="0"/>
                                        <stop offset=".9" stop-opacity=".5"/>
                                        <stop offset="1"/>
                                    </radialGradient>
                                    <radialGradient id="edge-d" cx="-340.3" cy="63" r="143.2" gradientTransform="matrix(.15 -.99 -.8 -.12 176.6 -125.4)" gradientUnits="userSpaceOnUse">
                                        <stop offset=".8" stop-opacity="0"/>
                                        <stop offset=".9" stop-opacity=".5"/>
                                        <stop offset="1"/>
                                    </radialGradient>
                                    <radialGradient id="edge-e" cx="113.4" cy="570.2" r="202.4" gradientTransform="matrix(-.04 1 2.13 .08 -1179.5 -106.7)" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stop-color="#35c1f1"/>
                                        <stop offset=".1" stop-color="#34c1ed"/>
                                        <stop offset=".2" stop-color="#2fc2df"/>
                                        <stop offset=".3" stop-color="#2bc3d2"/>
                                        <stop offset=".7" stop-color="#36c752"/>
                                    </radialGradient>
                                    <radialGradient id="edge-f" cx="376.5" cy="568" r="97.3" gradientTransform="matrix(.28 .96 .78 -.23 -303.8 -148.5)" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stop-color="#66eb6e"/>
                                        <stop offset="1" stop-color="#66eb6e" stop-opacity="0"/>
                                    </radialGradient>
                                    <linearGradient id="edge-a" x1="63.3" y1="84" x2="241.7" y2="84" gradientTransform="matrix(1 0 0 -1 0 266)" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stop-color="#0c59a4"/>
                                        <stop offset="1" stop-color="#114a8b"/>
                                    </linearGradient>
                                    <linearGradient id="edge-c" x1="157.3" y1="161.4" x2="46" y2="40.1" gradientTransform="matrix(1 0 0 -1 0 266)" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stop-color="#1b9de2"/>
                                        <stop offset=".2" stop-color="#1595df"/>
                                        <stop offset=".7" stop-color="#0680d7"/>
                                        <stop offset="1" stop-color="#0078d4"/>
                                    </linearGradient>
                                </defs>
                                <path d="M235.7 195.5a93.7 93.7 0 0 1-10.6 4.7 101.9 101.9 0 0 1-35.9 6.4c-47.3 0-88.5-32.5-88.5-74.3a31.5 31.5 0 0 1 16.4-27.3c-42.8 1.8-53.8 46.4-53.8 72.5 0 74 68.1 81.4 82.8 81.4 7.9 0 19.8-2.3 27-4.6l1.3-.4a128.3 128.3 0 0 0 66.6-52.8 4 4 0 0 0-5.3-5.6Z" transform="translate(-4.6 -5)" fill="url(#edge-a)"/>
                                <path d="M235.7 195.5a93.7 93.7 0 0 1-10.6 4.7 101.9 101.9 0 0 1-35.9 6.4c-47.3 0-88.5-32.5-88.5-74.3a31.5 31.5 0 0 1 16.4-27.3c-42.8 1.8-53.8 46.4-53.8 72.5 0 74 68.1 81.4 82.8 81.4 7.9 0 19.8-2.3 27-4.6l1.3-.4a128.3 128.3 0 0 0 66.6-52.8 4 4 0 0 0-5.3-5.6Z" transform="translate(-4.6 -5)" style="isolation:isolate;opacity:.35" fill="url(#edge-b)"/>
                                <path d="M110.3 246.3A79.2 79.2 0 0 1 87.6 225a80.7 80.7 0 0 1 29.5-120c3.2-1.5 8.5-4.1 15.6-4a32.4 32.4 0 0 1 25.7 13 31.9 31.9 0 0 1 6.3 18.7c0-.2 24.5-79.6-80-79.6-43.9 0-80 41.6-80 78.2a130.2 130.2 0 0 0 12.1 56 128 128 0 0 0 156.4 67 75.5 75.5 0 0 1-62.8-8Z" transform="translate(-4.6 -5)" fill="url(#edge-c)"/>
                                <path d="M110.3 246.3A79.2 79.2 0 0 1 87.6 225a80.7 80.7 0 0 1 29.5-120c3.2-1.5 8.5-4.1 15.6-4a32.4 32.4 0 0 1 25.7 13 31.9 31.9 0 0 1 6.3 18.7c0-.2 24.5-79.6-80-79.6-43.9 0-80 41.6-80 78.2a130.2 130.2 0 0 0 12.1 56 128 128 0 0 0 156.4 67 75.5 75.5 0 0 1-62.8-8Z" transform="translate(-4.6 -5)" style="opacity:.41;isolation:isolate" fill="url(#edge-d)"/>
                                <path d="M157 153.8c-.9 1-3.4 2.5-3.4 5.6 0 2.6 1.7 5.2 4.8 7.3 14.3 10 41.4 8.6 41.5 8.6a59.6 59.6 0 0 0 30.3-8.3 61.4 61.4 0 0 0 30.4-52.9c.3-22.4-8-37.3-11.3-43.9C228 28.8 182.3 5 132.6 5a128 128 0 0 0-128 126.2c.5-36.5 36.8-66 80-66 3.5 0 23.5.3 42 10a72.6 72.6 0 0 1 30.9 29.3c6.1 10.6 7.2 24.1 7.2 29.5s-2.7 13.3-7.8 19.9Z" transform="translate(-4.6 -5)" fill="url(#edge-e)"/>
                                <path d="M157 153.8c-.9 1-3.4 2.5-3.4 5.6 0 2.6 1.7 5.2 4.8 7.3 14.3 10 41.4 8.6 41.5 8.6a59.6 59.6 0 0 0 30.3-8.3 61.4 61.4 0 0 0 30.4-52.9c.3-22.4-8-37.3-11.3-43.9C228 28.8 182.3 5 132.6 5a128 128 0 0 0-128 126.2c.5-36.5 36.8-66 80-66 3.5 0 23.5.3 42 10a72.6 72.6 0 0 1 30.9 29.3c6.1 10.6 7.2 24.1 7.2 29.5s-2.7 13.3-7.8 19.9Z" transform="translate(-4.6 -5)" fill="url(#edge-f)"/>
                            </svg>
                        </div>
                        <div class="text-sm font-medium {$darkMode ? 'text-gray-800' : 'text-gray-700'}">Microsoft Edge</div>
                    </div>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex gap-3 justify-center">
                <button 
                    class="px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 shadow-sm"
                    style="background-color: var(--theme-color-primary);"
                    onmouseover={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `color-mix(in srgb, var(--theme-color-primary) 80%, black)`}
                    onmouseout={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `var(--theme-color-primary)`}
                    onclick={() => window.open('https://www.google.com/chrome/', '_blank')}
                >Download Chrome</button>
                <button 
                    class="px-6 py-3 rounded-lg font-medium border transition-all duration-200"
                    style="border-color: {$darkMode ? 'color-mix(in srgb, var(--theme-color-primary) 30%, gray)' : `color-mix(in srgb, var(--theme-color-primary) 20%, white)`}; 
                           background-color: transparent;
                           color: {$darkMode ? 'white' : '#111827'};"
                    onmouseover={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? `color-mix(in srgb, var(--theme-color-primary) 10%, white)` : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`;
                    }}
                    onmouseout={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                    onclick={() => showFirefoxWarning = false}
                >
                    I don't care, let me continue !
                </button>
            </div>
        </div>
    </div>
</div>
{/if}

<!-- Main Application (hidden on small screens) -->
<div class="hidden xl:flex h-screen {$darkMode ? 'bg-black' : 'bg-gray-50'}">
    <!-- Sidebar -->
    <div class="flex flex-col w-52 {$darkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} shadow-lg h-full overflow-y-auto border-r">        <!-- Header -->
        <div class="p-4">
            <h1 class="font-bold text-xl {$darkMode ? 'text-white' : 'text-gray-900'} text-center">{t('common.zellia', currentLanguage)}</h1>
        </div>          <!-- Sync Button -->
        <div class="flex justify-center mb-4 mt-2">
            <button 
                class="px-18 py-2 rounded-4xl font-bold transition-colors duration-200 shadow w-auto"
                style="background-color: var(--theme-color-primary); color: white;"
                onmouseover={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `color-mix(in srgb, var(--theme-color-primary) 80%, black)`}
                onmouseout={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `var(--theme-color-primary)`}
            >{t('ui.sync', currentLanguage)}</button>
        </div>
        
        <!-- Profile Section -->
        <div class="px-3 pb-3 border-b {$darkMode ? 'border-gray-600' : 'border-gray-100'}">
            <!-- Profile Dropdown -->
            <div class="relative mb-2">                <button 
                    class="flex items-center justify-between w-full px-3 py-2 text-sm font-medium {$darkMode ? 'text-white bg-black border-gray-600 hover:bg-gray-900' : 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100'} border rounded-lg transition-colors duration-200" 
                    onclick={() => showDropdown = !showDropdown}
                >
                    <span>{t('ui.profiles', currentLanguage)}</span>
                    <svg class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style:transform={showDropdown ? 'rotate(180deg)' : 'rotate(0deg)'}>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>
                
                {#if showDropdown}
                    <div class="absolute top-full left-0 right-0 mt-1 {$darkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-10">
                        <div class="p-3 text-sm {$darkMode ? 'text-gray-300' : 'text-gray-600'}">{t('ui.noProfilesAvailable', currentLanguage)}</div>
                    </div>
                {/if}
            </div>
              <!-- Import/Export Buttons -->
            <div class="grid grid-cols-2 gap-2">
                <button 
                    class="px-3 py-2 text-xs font-medium border rounded-md transition-colors duration-200 text-white border-transparent"
                    style="background-color: var(--theme-color-primary);"                    onmouseover={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `color-mix(in srgb, var(--theme-color-primary) 80%, black)`}
                    onmouseout={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `var(--theme-color-primary)`}
                >
                    {t('ui.import', currentLanguage)}
                </button>
                <button 
                    class="px-3 py-2 text-xs font-medium border rounded-md transition-colors duration-200 text-white border-transparent"
                    style="background-color: var(--theme-color-primary);"
                    onmouseover={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `color-mix(in srgb, var(--theme-color-primary) 80%, black)`}
                    onmouseout={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = `var(--theme-color-primary)`}
                >
                    {t('ui.export', currentLanguage)}
                </button>
            </div>
        </div>
          <!-- Navigation -->
        <div class="flex-1 p-3">
            <nav class="space-y-1">                
                {#each NAVIGATE as [href, name]}                    
                <a 
                        {href} 
                        class="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 {isActive(href) 
                            ? 'text-white shadow-sm'
                            : ($darkMode ? 'text-white hover:bg-gray-900 hover:text-white' : 'text-gray-700')}"
                        style={isActive(href) ? `background-color: var(--theme-color-primary);` : ''}
                        onmouseover={(e) => {
                            if (!isActive(href)) {
                                (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? '#374151' : `color-mix(in srgb, var(--theme-color-primary) 10%, white)`;
                                if (!$darkMode) {
                                    (e.currentTarget as HTMLElement).style.color = `var(--theme-color-primary)`;
                                }
                            }
                        }}
                        onmouseout={(e) => {
                            if (!isActive(href)) {
                                (e.currentTarget as HTMLElement).style.backgroundColor = '';
                                if (!$darkMode) {
                                    (e.currentTarget as HTMLElement).style.color = '';
                                }
                            }
                        }}
                    >
                        <span>{t(name, currentLanguage)}</span>
                    </a>
                {/each}
            </nav>
        </div>
          <!-- Theme Selector -->
        <div class="p-3 border-t {$darkMode ? 'border-gray-600' : 'border-gray-200'}">
            <!-- Theme Button -->
            <button 
                class="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 {$darkMode ? 'text-white hover:bg-gray-900' : 'text-gray-700 hover:bg-gray-100'}"
                onclick={() => showThemeSelector = !showThemeSelector}            >                <div class="flex items-center gap-3">
                    <Palette class="w-4 h-4" />
                    <span>{t('ui.themeColors', currentLanguage)}</span>
                </div>
                <svg class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style:transform={showThemeSelector ? 'rotate(180deg)' : 'rotate(0deg)'}>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            
            <!-- Color Squares (collapsible) -->
            {#if showThemeSelector}
                <div class="grid grid-cols-4 gap-2 mt-2">
                    {#each Object.entries(themeColors) as [name, color] (name)}
                        <button 
                            title={name.charAt(0).toUpperCase() + name.slice(1)}
                            class="w-full h-7 rounded border transition-all duration-150 
                                   {currentTheme === name ? ($darkMode ? 'border-white ring-1 ring-white' : 'border-black ring-1 ring-gray-400') : ($darkMode ? 'border-gray-600 hover:border-gray-400' : 'border-gray-300 hover:border-gray-500')}"
                            style="background-color: {color};"
                            onclick={() => setTheme(name as ThemeColorName)}
                        ></button>
                    {/each}
                </div>            {/if}
        </div>        

        <!-- Language Selector -->
        <div class="p-3 border-t {$darkMode ? 'border-gray-600' : 'border-gray-200'}">
            <!-- Language Button -->
            <button 
                class="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 {$darkMode ? 'text-white hover:bg-gray-900' : 'text-gray-700 hover:bg-gray-100'}"
                onclick={() => showLanguageSelector = !showLanguageSelector}
            >
                <div class="flex items-center gap-3">
                    <Globe class="w-4 h-4" />
                    <span>{t('ui.language', currentLanguage)}</span>
                </div>
                <svg class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style:transform={showLanguageSelector ? 'rotate(180deg)' : 'rotate(0deg)'}>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            
            <!-- Language Options (collapsible) -->
            {#if showLanguageSelector}
                <div class="mt-2 space-y-1">
                    <button 
                        class="w-full px-3 py-2 text-sm text-left rounded-lg transition-all duration-150 {currentLanguage === 'en' ? `text-white` : ($darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100')}"
                        style={currentLanguage === 'en' ? `background-color: var(--theme-color-primary);` : ''}
                        onclick={() => setLanguage('en')}
                    >
                        {t('common.english', currentLanguage)}
                    </button>
                    <button 
                        class="w-full px-3 py-2 text-sm text-left rounded-lg transition-all duration-150 {currentLanguage === 'zh' ? `text-white` : ($darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100')}"
                        style={currentLanguage === 'zh' ? `background-color: var(--theme-color-primary);` : ''}
                        onclick={() => setLanguage('zh')}
                    >
                        {t('common.chinese', currentLanguage)}
                    </button>
                </div>
            {/if}
        </div>
        
        <!-- Dark Mode Toggle at Bottom -->
        <div class="p-3 border-t border-transparent">            <button
                class="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 {$darkMode ? 'text-white hover:bg-gray-900' : 'text-gray-700 hover:bg-gray-100'}"
                onclick={() => darkMode.toggle()}
            >                {#if $darkMode}
                    <Sun class="w-4 h-4" />
                    <span>{t('ui.lightMode', currentLanguage)}</span>
                {:else}
                    <Moon class="w-4 h-4" />
                    <span>{t('ui.darkMode', currentLanguage)}</span>
                {/if}
            </button>
        </div>
    </div><!-- Main Content -->    <div 
        class="flex-1 flex flex-col gap-4 px-4 overflow-y-scroll"
        style="background-color: {$darkMode ? `color-mix(in srgb, var(--theme-color-primary) 5%, black)` : `color-mix(in srgb, var(--theme-color-primary) 5%, white)`};"    ><!-- Layer selector (hidden on about page) -->
        {#if $page.url.pathname !== '/about'}
        <div class="flex items-center -mb-3">
            <div class="flex items-center gap-2 px-4 py-2">
                <span class="font-semibold {$darkMode ? 'text-white' : 'text-gray-700'} mr-2">Layer:</span>                {#each [1, 2, 3, 4] as layer}
                    <button
                        class="w-8 h-8 flex items-center justify-center rounded-lg border font-bold text-lg transition-colors duration-200 focus:outline-none {selectedLayer === layer ? 'text-white' : ($darkMode ? 'bg-black text-white border-gray-600 hover:bg-gray-900' : '')}"
                        style={selectedLayer === layer ? `background-color: var(--theme-color-primary); border-color: color-mix(in srgb, var(--theme-color-primary) 70%, black);` : (selectedLayer !== layer ? `background-color: ${$darkMode ? 'black' : 'white'}; border-color: color-mix(in srgb, var(--theme-color-primary) 30%, ${$darkMode ? 'black' : 'white'}); color: var(--theme-color-primary);` : '')}
                        onmouseover={(e) => {
                            if (selectedLayer !== layer) {
                                (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? '#374151' : `color-mix(in srgb, var(--theme-color-primary) 15%, white)`;
                            }
                        }}
                        onmouseout={(e) => {
                            if (selectedLayer !== layer) {
                                (e.currentTarget as HTMLElement).style.backgroundColor = $darkMode ? 'black' : 'white';
                            }
                        }}
                        onclick={() => selectedLayer = layer}
                    >
                        {layer}
                    </button>
                {/each}
            </div>        </div>
        {/if}
        <!-- Component for adjust part -->
        
            {@render children()} 
    </div>
</div>

<style lang="postcss">
    @reference "tailwindcss";
    :global(html) {
        background-color: theme(--color-gray-50);
        --theme-color-primary: #6366F1; /* Default Indigo, will be overridden */
    }
</style>