# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zellia Control is a Progressive Web Application (PWA) built with SvelteKit and TypeScript for configuring Zellia Hall Effect keyboards. The application has transitioned from a Tauri desktop app to a web-based PWA that works directly in browsers with WebHID API support.

## Development Commands

### Frontend Development
- `yarn dev` - Start SvelteKit development server (http://localhost:5173)
- `yarn build` - Build for production (includes controller build)
- `yarn preview` - Preview production build locally
- `yarn check` - Run Svelte type checking
- `yarn check:watch` - Run type checking in watch mode

### Code Formatting
- `yarn format` - Format web files (JS/TS/Svelte/CSS)
- `yarn format:check` - Check formatting without changing files
- `yarn format:all` - Format all files using cross-platform script

### Controller Package (src-controller/)
- `cd src-controller && yarn build` - Build the TypeScript keyboard controller package
- The controller package is built automatically during main `yarn build` process

## Architecture Overview

### Dual Package Structure
The project consists of two main parts:

1. **Frontend (src/)**: SvelteKit PWA application
2. **Controller Package (src-controller/)**: TypeScript library for keyboard communication

### Controller Package Architecture
- **Entry Point**: `src-controller/src/index.ts` exports all controllers
- **Core Controller**: `src-controller/src/keyboardcontroller.ts` - Base keyboard communication logic
- **Specific Controllers**: Individual controller implementations for each keyboard model:
  - `zellia_80_controller/` - Zellia 80HE keyboard
  - `zellia_60_controller/` - Zellia 60HE keyboard
  - `oholeo_keyboard_controller/` - Oholeo keyboard
  - `trinity_pad_controller/` - Trinity pad
  - `destrez_asural_left_controller/` & `destrez_asural_right_controller/` - Split keyboards
  - `ansi_104_sample_controller/` - Sample ANSI 104-key implementation
  - `libamp_keyboard_controller/` - LibAmp keyboard

### Frontend Architecture

#### Key State Management
- **Controller Store** (`src/lib/stores/ControllerStore.svelte.ts`): Manages advanced keys and RGB configurations using the `emi-keyboard-controller` package
- **Keyboard API** (`src/lib/api/keyboardAPI.svelte.ts`): Handles device connection, detection, and communication via WebHID API
- **Advanced Key Types** (`src/lib/types/AdvancedKeyShared.ts`): Comprehensive type definitions for key configurations, actions, and dynamic keystroke configurations

#### Component Organization
- **Layout Components** (`src/lib/components/layout/`): Navigation, sidebar, theme controls, connection interface
- **Feature-Specific Components**: Organized by functionality:
  - `advancedkey/` - Advanced key configuration (dynamic, nullbind, tap-hold, toggle modes)
  - `performance/` - Actuation points, rapid trigger, sensitivity controls
  - `remap/` - Key remapping interface with keyboard visualization
  - `lighting/` - RGB lighting controls
  - `debug/` - Key tracking and diagnostic tools
  - `profiles/` - Profile management system

#### Route Structure
- `/` - Dashboard/home page
- `/remap` - Key remapping interface
- `/performance` - Performance tuning (actuation, rapid trigger)
- `/dynamic` - Advanced dynamic key configuration
- `/lighting` - RGB lighting controls
- `/debug` - Diagnostic tools
- `/profiles` - Profile management
- `/settings` - Application settings
- `/about` - Information page

## Key Technical Details

### WebHID Integration
The application uses the WebHID API for direct browser-to-keyboard communication:
- Device detection and filtering in `keyboardAPI.svelte.ts:78-83`
- Controller matching logic in `keyboardAPI.svelte.ts:162-180`
- Connection management with fallback to demo mode

### Keyboard Controller System
- Uses `emi-keyboard-controller` package (local dependency in `src-controller/`)
- Type-safe controller interfaces with `IKeyboardController` contract
- Automatic configuration request/sync between keyboard and app
- Support for saving, flashing, and factory reset operations

### Advanced Key Configuration System
Complex key behavior system supporting:
- **Dynamic Keystroke (DKS)**: Pressure-sensitive actions with configurable bitmap patterns
- **Null Bind**: Variable bottom-out points with no key output
- **Tap-Hold**: Configurable tap vs hold timing and actions
- **Toggle**: Multi-state toggle keys with configurable actions

### Svelte 5 Modern Features
The codebase uses Svelte 5 features including:
- `$state` runes for reactive state management
- Modern SvelteKit patterns and load functions
- TypeScript integration throughout

## Development Notes

### Build Process
The build process is two-stage:
1. Controller package builds (`cd src-controller && yarn build`)
2. Frontend builds with Vite/SvelteKit

### Controller Development
When modifying keyboard controller logic:
1. Edit TypeScript files in `src-controller/src/`
2. Run `yarn build` in the controller directory
3. Test with frontend development server

### Styling
- Uses Tailwind CSS v4.x with Vite integration
- Dark/light theme support via `DarkModeStore.svelte.ts`
- Responsive design with mobile considerations

### PWA Features
- Offline support via Workbox service worker
- Installable as desktop app
- Custom manifest and theme configuration in `vite.config.js`