/**
 * English dictionary, ported verbatim (key order and text) from the Svelte app's
 * `LanguageStore.svelte.ts`. Keys no string literal in the app referred to were dropped; six
 * keys the components used but the dictionary lacked were added (`ui.save`,
 * `advancedkey.done`, `advancedkey.deleteKey`, `advancedkey.deletePair`,
 * `advancedkey.trigger`, `advancedkey.state`). This file defines the set of translation keys.
 */
export const en = {
  // Navigation
  'nav.performance': 'Performance',
  'nav.remap': 'Remap',
  'nav.lighting': 'Lighting',
  'nav.advancedkey': 'Dynamic Keys',
  'nav.debug': 'Debug',
  'nav.settings': 'Settings',
  'nav.about': 'About',
  'nav.update': 'Update',
  // UI Elements
  'ui.save': 'Save',
  'ui.disconnect': 'Disconnect',
  'ui.profiles': 'Profiles',
  'ui.themeColors': 'Theme Colors',
  'ui.lightMode': 'Light Mode',
  'ui.darkMode': 'Dark Mode',
  'ui.language': 'Language',
  'ui.unsavedChanges': 'Unsaved changes',

  // Performance Page
  'performance.title': 'Performance',
  'performance.selectAllKeys': 'Select all keys',
  'performance.discardSelection': 'Discard selection',
  'performance.actuationPoint': 'Actuation Point',
  'performance.actuationPointDesc': 'Set the actuation point for your keys.',
  'performance.sensitivityWarning':
    'the key may be too sensitive, causing instability, please be careful',
  'performance.rapidTriggerDesc':
    'Rapid Trigger dynamically actuates and resets your key based on your movement.',
  'performance.enableRapidTrigger': 'Enable Rapid Trigger',
  'performance.rapidTriggerSensitivity': 'Rapid Trigger Sensitivity',
  'performance.adjustSensitivity': 'Adjust the sensitivity for rapid trigger.',
  'performance.pressSensitivityLabel': 'PRESS SENSITIVITY',
  'performance.releaseSensitivityLabel': 'RELEASE SENSITIVITY',
  'performance.sensitivityLabel': 'SENSITIVITY',
  'performance.keysSelected': 'keys selected',
  'performance.high': 'HIGH',
  'performance.low': 'LOW',
  'performance.keyTravelDeadzones': 'Key Travel Deadzones',
  'performance.keyTravelDeadzonesDesc':
    'Adjust the start and bottom deadzone limits for rapid trigger activation.',

  // Lighting Page
  'lighting.color': 'Color',
  'lighting.direction': 'Direction',

  // Lighting UI
  'lighting.applySettings': 'Apply Settings',

  // Advanced Key Pages
  'advancedkey.title': 'Dynamic Keys',
  'advancedkey.subtitle': 'Configure dynamic keyboard behaviors for enhanced productivity',
  'advancedkey.gettingStarted': 'Getting Started',
  'advancedkey.step1Title': 'Select a Mode',
  'advancedkey.step1Desc': 'Choose the dynamic key behavior you want to configure',
  'advancedkey.step2Title': 'Select Keys',
  'advancedkey.step2Desc': 'Click on keys in the keyboard layout to configure them',
  'advancedkey.step3Title': 'Apply Settings',
  'advancedkey.step3Desc': 'Save your configuration to the keyboard',
  'advancedkey.infoDesc':
    'Advanced key configurations allow you to customize how individual keys behave beyond standard typing. Each mode offers unique functionality to enhance your keyboard experience.',

  // Advanced Key Modes
  'advancedkey.tapHold': 'Tap Hold',
  'advancedkey.tapHoldDesc': 'Different actions for tap vs hold',
  'advancedkey.tapHoldFeature1': 'Quick tap action',
  'advancedkey.tapHoldFeature2': 'Hold action with configurable delay',
  'advancedkey.tapHoldFeature3': 'Perfect for modifier keys',
  'advancedkey.tapHoldFeature4': 'Customizable timing',
  'advancedkey.tapHoldTip':
    'Tap-hold keys are perfect for modifier keys that can also function as regular keys when tapped quickly',
  'advancedkey.quickTap': 'Quick tap (under {0}ms)',
  'advancedkey.holdOver': 'Hold (over {0}ms)',

  'advancedkey.toggle': 'Toggle',
  'advancedkey.toggleDesc': 'Toggle between two states',
  'advancedkey.toggleFeature1': 'Toggle on press or release',
  'advancedkey.toggleFeature2': 'Perfect for Caps Lock behavior',
  'advancedkey.toggleFeature3': 'State persistence',
  'advancedkey.toggleFeature4': 'Visual feedback',
  'advancedkey.toggleDescription':
    'This key will toggle {0} {1}. Each trigger will switch between active and inactive states.',
  'advancedkey.whenPressed': 'when pressed',
  'advancedkey.whenReleased': 'when released',

  'advancedkey.dynamic': 'Dynamic Key Stroke',
  'advancedkey.dynamicDesc': 'Interactive keystroke configuration',
  'advancedkey.dynamicFeature1': '4-phase keystroke control',
  'advancedkey.dynamicFeature2': 'Analog input response',
  'advancedkey.dynamicFeature3': 'Multiple key bindings',
  'advancedkey.dynamicFeature4': 'Advanced customization',

  'advancedkey.nullBind': 'Null Bind',
  'advancedkey.nullBindDesc': 'Rapid trigger with SOCD cleaning',
  'advancedkey.nullBindFeature1': 'Rapid trigger technology',
  'advancedkey.nullBindFeature2': 'SOCD (Simultaneous Opposing Cardinal Directions)',
  'advancedkey.nullBindFeature3': 'Perfect for gaming',
  'advancedkey.nullBindFeature4': 'Ultra-responsive input',

  // Tap-Hold Page
  'advancedkey.tapHoldTitle': 'Tap-Hold Configuration',
  'advancedkey.tapHoldSubtitle': 'Configure different actions for quick taps versus long holds',
  'advancedkey.tapAction': 'Tap Action',
  'advancedkey.holdAction': 'Hold Action',
  'advancedkey.holdDelay': 'Hold Delay',
  'advancedkey.milliseconds': 'milliseconds',
  'advancedkey.configuredTapHold': 'Configured Tap-Hold Keys',
  'advancedkey.actionCategories': 'Action Categories',
  'advancedkey.backToAdvanced': 'Back',
  'advancedkey.applyConfiguration': 'Apply Configuration',
  'advancedkey.resetConfiguration': 'Reset Configuration',

  // Null Bind Page
  'advancedkey.nullBindTitle': 'Null Bind Configuration',
  'advancedkey.nullBindSubtitle': 'Configure rapid trigger with SOCD cleaning for gaming',
  'advancedkey.distance': 'Distance',

  // Null Bind Page - Additional translations
  'advancedkey.selectTwoKeys': 'Select Two Keys',
  'advancedkey.firstKey': 'First Key',
  'advancedkey.secondKey': 'Second Key',
  'advancedkey.clickKeyToSelect': 'Click a key to select',
  'advancedkey.clickOpposingKey': 'Click opposing key',
  'advancedkey.remove': 'Remove',
  'advancedkey.selectedKeys': 'Selected Keys',
  'advancedkey.configureNullBindBehavior': 'Configure Null Bind Behavior',
  'advancedkey.selectHowToResolveKeyEvents':
    'Select how to resolve the key events when both keys are pressed.',
  'advancedkey.lastInputBehavior': 'Last Input',
  'advancedkey.lastInputBehaviorDesc':
    'The most recently pressed key takes priority over the previously held key',
  'advancedkey.absolutePriority1Behavior': 'Absolute Priority Key1',
  'advancedkey.absolutePriority1BehaviorDesc':
    'First selected key always has absolute priority over the second key',
  'advancedkey.absolutePriority2Behavior': 'Absolute Priority Key2',
  'advancedkey.absolutePriority2BehaviorDesc':
    'Second selected key always has absolute priority over the first key',
  'advancedkey.neutralBehavior': 'Neutral',
  'advancedkey.neutralBehaviorDesc':
    'Both opposing inputs are canceled when pressed simultaneously',
  'advancedkey.distanceBehavior': 'Distance (Rappy Snappy)',
  'advancedkey.distanceBehaviorDesc':
    'Priority based on key travel distance - deeper pressed key wins',
  'advancedkey.alternativeBottomOutBehavior': 'Alternative Bottom Out Behavior',
  'advancedkey.alternativeBottomOutBehaviorDesc':
    'When both keys are bottomed out, register key press for both keys.',
  'advancedkey.bottomOutPointDesc': 'Set the distance at which the key is bottomed out.',
  'advancedkey.keyTesterTitle': 'Key Tester',
  'advancedkey.keyTesterDesc': 'Press the configured keys to test the null bind behavior',
  'advancedkey.key1': 'Key 1',
  'advancedkey.key2': 'Key 2',
  'advancedkey.priorityKey': 'Priority Key',
  'advancedkey.currentBehavior': 'Current Behavior:',
  'advancedkey.bottomOut': 'Bottom Out:',
  'advancedkey.configuredNullBindKeys': 'Configured Null Bind Keys',
  'advancedkey.pair': 'pair',
  'advancedkey.pairs': 'pairs',
  'advancedkey.behavior': 'Behavior:',
  'advancedkey.on': 'On',
  'advancedkey.off': 'Off',

  // Toggle Page
  'advancedkey.toggleTitle': 'Toggle Configuration',
  'advancedkey.toggleSubtitle': 'Configure keys to toggle between two states',
  'advancedkey.toggleAction': 'Toggle Action',
  'advancedkey.toggleMode': 'Toggle Mode',
  'advancedkey.toggleState': 'Toggle State',
  'advancedkey.onPress': 'On Press',
  'advancedkey.onRelease': 'On Release',
  'advancedkey.enabled': 'Enabled',
  'advancedkey.disabled': 'Disabled',
  'advancedkey.toggleTip':
    'Toggle keys are perfect for Caps Lock, Num Lock, or creating custom modifier states',
  'advancedkey.configuredToggle': 'Configured Toggle Keys',
  'advancedkey.toggleModeDesc': 'When the toggle should activate',
  'advancedkey.toggleStateDesc': 'Current state of the toggle',
  'advancedkey.howItWorks': 'How it works',
  'advancedkey.actions': 'Actions',
  'advancedkey.resetAllToggle': 'Reset All Toggle Keys',

  // Dynamic Page
  'advancedkey.dynamicTitle': 'Dynamic Keystroke Configuration',
  'advancedkey.dynamicSubtitle': 'Configure 4-phase keystroke control with analog input response',
  'advancedkey.bindings': 'Bindings',
  'advancedkey.performance': 'Performance',
  'advancedkey.keyTester': 'Key Tester',
  'advancedkey.bottomOutPoint': 'Bottom Out Point',
  'advancedkey.rapidTrigger': 'Rapid Trigger',
  'advancedkey.hold': 'Hold',
  'advancedkey.tap': 'Tap',
  'advancedkey.tipDynamic':
    'Dynamic keys allow 4-phase control with analog input response for advanced customization',

  // Dynamic Keystroke Components
  'advancedkey.dynamicKeystroke': 'Dynamic Keystroke',
  'advancedkey.performanceSettings': 'Performance Settings',
  'advancedkey.testDynamicDesc': 'Test your dynamic keystroke configuration',
  'advancedkey.testKeyBehavior': 'Press the key to test dynamic keystroke behavior',
  'advancedkey.keyPressedPastActuation': 'Key pressed past actuation point',
  'advancedkey.keyReleasedPastActuation': 'Key released past actuation point',
  'advancedkey.keyPressedPastBottomOut': 'Key pressed past bottom-out point',
  'advancedkey.keyReleasedPastBottomOut': 'Key released past bottom-out point',
  'advancedkey.rapidTriggerDisabled': 'Rapid Trigger Disabled',
  'advancedkey.rapidTriggerDisabledDesc':
    'Rapid Trigger is automatically disabled when the key is bound to a DKS.',
  'advancedkey.configureDKSBindings': 'Configure DKS Bindings',
  'advancedkey.dksBindingInstructions':
    'Assign a keycode to each binding. Click nodes to create intervals, drag grips to resize, click bars to delete.',

  // Common Advanced Key Elements
  'advancedkey.configuration': 'Configuration',

  // Advanced Key Common Elements
  'advancedkey.selectedKey': 'Selected Key',
  'advancedkey.position': 'Position',
  'advancedkey.noKeySelected': 'No Key Selected',
  'advancedkey.selectKeyToConfig':
    'Select a key from the keyboard layout to configure its behavior',
  'advancedkey.tip': 'Tip',
  'advancedkey.keysCount': 'key',
  'advancedkey.keysCountPlural': 'keys',
  'advancedkey.resetAllTapHold': 'Reset All Tap Hold Keys',
  'advancedkey.tapHoldDescription':
    'Perfect for modifier keys that can also function as regular keys when tapped quickly.',
  'advancedkey.done': 'Done',
  'advancedkey.deleteKey': 'Delete key',
  'advancedkey.deletePair': 'Delete pair',
  'advancedkey.trigger': 'Trigger',
  'advancedkey.state': 'State',

  // Common Actions
  'common.delete': 'Delete',
  'common.actions': 'Actions',
  'common.key': 'key',
  'common.unknown': 'Unknown',
  'common.cancel': 'Cancel',

  // Advanced binding related
  'advancedkey.keycodeSelectionTitle': 'Keycode Selection',
  'advancedkey.selectKeycodeForBinding': 'Select a keycode for binding {0}',
  'advancedkey.clickOnBinding': 'Click on a binding button to select a keycode',
  'advancedkey.bindingsLabel': 'Bindings',
  'advancedkey.bottomOutLabel': 'Bottom Out',

  // Display messages
  'ui.noProfilesAvailable': 'No dynamic keys available',
  'ui.featuresRequiringLargerDisplay': 'Features requiring larger display:',
  'ui.keyboardLayoutVisualization': 'Keyboard layout visualization',
  'ui.advancedKeyConfigPanels': 'Advanced key configuration panels',

  // Debug Page
  'debug.keyPressReporting': 'Reports whether key is pressed',
  'debug.keyPressReportingDesc':
    'Allows the keyboard to report whether a key is considered to be pressed. Pressed keys are indicated by the visual above.',
  'debug.timeLabel': 'Time (ms)',
  'debug.distanceLabel': 'Distance (mm)',
  'debug.keyDistance': 'Key Distance',
  // Settings Page
  'settings.title': 'Settings',
  'settings.subtitle': 'Configure device settings and manage your keyboard',
  'settings.restart': 'Restart Device',
  'settings.restartDesc': 'Restart your keyboard to apply changes',
  'settings.bootloader': 'Enter Bootloader',
  'settings.bootloaderDesc': 'Enter bootloader mode for firmware updates',
  'settings.factoryReset': 'Factory Reset',
  'settings.factoryResetDesc': 'Reset all settings to factory defaults',
  'settings.bootloaderConfirm':
    'Are you sure you want to enter bootloader mode? The keyboard will disconnect and wait for a firmware update.',
  'settings.factoryResetConfirm':
    'Are you sure you want to reset all settings to factory defaults? This action cannot be undone.',
  // About Page
  'about.title': 'About Zellia Control',
  'about.subtitle': 'Hall Effect keyboard configurator',
  'about.appName': 'Zellia Control',
  'about.appDescription':
    'A powerful desktop application for configuring Zellia keyboards with Hall Effect switches. Built with modern web technologies for cross-platform compatibility and an intuitive user experience.',
  'about.version': 'Version 1.0.0',
  'about.builtWith': 'Built with SvelteKit & PWA',
  'about.performance': 'Performance',
  'about.adjustableActuation': 'Adjustable actuation points (0-4mm)',
  'about.rapidTrigger': 'Rapid trigger technology',
  'about.realtimeMonitoring': 'Real-time pressure monitoring',
  'about.advancedKeys': 'Dynamic Keys',
  'about.tapHold': 'Tap-hold functionality',
  'about.toggleModes': 'Toggle modes',
  'about.dynamicKeystroke': 'Dynamic keystroke control',
  'about.nullBind': 'Null bind with SOCD cleaning',
  'about.customization': 'Customization',
  'about.rgbLighting': 'RGB lighting effects',
  'about.keyRemapping': 'Key remapping',
  'about.multipleThemes': 'Multiple theme colors',
  'about.darkLightMode': 'Dark/light mode support',
  'about.technical': 'Technical',
  'about.crossPlatform': 'Cross-platform support',
  'about.hardwareCalibration': 'Hardware calibration',
  'about.debugTools': 'Debug tools',
  'about.profileImportExport': 'Profile import/export',

  // Lighting Page
  'lighting.title': 'Lighting',
  'lighting.brightness': 'Brightness',
  'lighting.speed': 'Speed',
  'lighting.mode': 'Mode',
  'lighting.secondaryColor': 'Secondary Color',
  'lighting.density': 'Density',
  'lighting.baseConfigTitle': 'Base Configuration',
  'lighting.subConfigTitle': 'Key Configuration',
  'lighting.rainbowPreset': 'Rainbow Preset',
  'lighting.rainbowDirection': 'Rainbow Direction',
  'lighting.rainbowDensity': 'Rainbow Density',
  'lighting.animation': 'Animation',
  'lighting.level': 'Level',

  // RGB Base Modes
  rgb_base_mode_off: 'Off',
  rgb_base_mode_blank: 'Blank',
  rgb_base_mode_rainbow: 'Rainbow',
  rgb_base_mode_wave: 'Wave',

  // RGB Modes
  rgb_mode_fixed: 'Fixed',
  rgb_mode_static: 'Static',
  rgb_mode_cycle: 'Cycle',
  rgb_mode_linear: 'Linear',
  rgb_mode_trigger: 'Trigger',
  rgb_mode_string: 'String',
  rgb_mode_fading_string: 'Fading String',
  rgb_mode_diamond_ripple: 'Diamond Ripple',
  rgb_mode_fading_diamond_ripple: 'Fading Diamond Ripple',
  rgb_mode_jelly: 'Jelly',
  rgb_mode_bubble: 'Bubble',

  // Lighting: mode explanations and the key panel (lighting redesign, PL-047 to PL-049)
  rgb_base_mode_off_desc: 'Turns all lighting off, the per-key effects too.',
  rgb_base_mode_blank_desc: 'No base lighting: only the per-key effects light the keys.',
  rgb_base_mode_rainbow_desc:
    'A rainbow that starts at the hue of Color and scrolls across the keyboard. Speed sets how fast, Direction which way, Density how close the colors are.',
  rgb_base_mode_wave_desc:
    'Waves that blend Color into Secondary Color and move across the keyboard. Speed sets how fast, Direction which way, Density how close the waves are.',
  rgb_mode_fixed_desc: 'Always shows Color, in place of the base lighting.',
  rgb_mode_static_desc: 'Always adds Color on top of the base lighting.',
  rgb_mode_cycle_desc: 'Cycles through every hue, starting from Color. Speed sets how fast.',
  rgb_mode_linear_desc:
    'Lights up in Color as the key goes down: the deeper the press, the brighter.',
  rgb_mode_trigger_desc:
    'Flashes Color when the key is pressed, then fades out. Speed sets how fast it fades.',
  rgb_mode_string_desc:
    "Each press sends a line of Color along the key's row. Speed sets how fast it travels.",
  rgb_mode_fading_string_desc:
    "Each press sends a line of Color along the key's row, with a trail that fades out.",
  rgb_mode_diamond_ripple_desc:
    'Each press sends a diamond-shaped ripple of Color across the keyboard. Speed sets how fast it spreads.',
  rgb_mode_fading_diamond_ripple_desc:
    'Each press sends a diamond-shaped ripple of Color across the keyboard, with a trail that fades out.',
  rgb_mode_jelly_desc:
    'Pressing lights up the keys around it in their own colors; the deeper the press, the farther it reaches.',
  rgb_mode_bubble_desc:
    'Each press makes a small round ripple of Color around the key, with a trail that fades out.',
  'lighting.saveHint': 'Lighting changes reach the keyboard when you press Save.',
  'lighting.mixed': 'Mixed',
  'lighting.mixedModes': 'These keys use different modes. Pick one to use it on all of them.',
  'lighting.allKeys': 'All keys',
  'lighting.oneKey': '1 key',
  'lighting.keyCount': '{0} keys',
  // Units
  'units.mm': 'mm',
  // new addittion
  'advancedkey.selectTwoKeysInstructions':
    'Click on two opposing keys in the keyboard layout to configure null bind behavior.',
  'advancedkey.configuredDynamicKeys': 'Configured Dynamic Keys',
  'advancedkey.mode': 'Mode',

  // Welcome Page
  'welcome.connecting': 'Connecting...',
  'welcome.loadingConfigurator': 'Loading configurator interface...',
  'welcome.getStarted': 'Get Started',

  // Connection warnings
  'ui.usbHubWarning':
    'Using USB Hub connections may cause connectivity issues. Direct connection recommended.',

  // Profiles Page
  'profiles.slot': 'Slot',
  'profiles.manageAll': 'Manage All Profiles',
  'profiles.noProfile': 'No Profile',

  // Remap: the Extension tab's Macro and Script groups (macros and scripts spec)
  'remap.macroGroup': 'Macro',
  'remap.scriptGroup': 'Script',
  'macros.slot': 'Macro {0}',
  'remap.macroRecordStart': 'Record\nStart',
  'remap.macroRecordStop': 'Record\nStop',
  'remap.macroRecordToggle': 'Record\nToggle',
  'remap.macroPlayOnce': 'Play\nOnce',
  'remap.macroPlayLoop': 'Play\nLoop',
  'remap.macroPlayOnceNoGap': 'Play Once\nNo Gaps',
  'remap.macroPlayLoopNoGap': 'Play Loop\nNo Gaps',
  'remap.macroStop': 'Stop',
  'remap.macroPause': 'Pause',
  'remap.scriptWatch': 'Watch',
  'remap.scriptStart': 'Start',
  'remap.scriptStop': 'Stop',
  'remap.scriptSuspend': 'Suspend',
  'remap.scriptRestart': 'Restart',
  'remap.scriptToggle': 'Toggle',
} satisfies Record<string, string>;

export type TranslationKey = keyof typeof en;
