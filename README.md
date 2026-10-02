# Zellia Control

<div align="center">
<p>
    Zellia Control is a Progressive Web App for configuring Zellia Hall Effect keyboards.
    Built with React and TypeScript, it talks to the keyboard straight from the browser over WebHID, works offline once loaded, and can be installed like a desktop app.
  </p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/PWA-Offline-blueviolet?style=for-the-badge&logo=pwa" alt="PWA">
    <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-6-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
    <br>
    <img src="https://img.shields.io/github/license/Zellia-Keyboards/Zellia-Control?style=for-the-badge" alt="License">
    <img src="https://img.shields.io/github/stars/Zellia-Keyboards/Zellia-Control?style=for-the-badge&logo=github" alt="GitHub Stars">
    <img src="https://img.shields.io/github/forks/Zellia-Keyboards/Zellia-Control?style=for-the-badge&logo=github" alt="GitHub Forks">
  </p>

</div>

> [!TIP]
> **Looking for commercial support or custom firmware/software solutions for your Zellia keyboard?**
> <br>
> Contact our team at **[support@zellia.cn](mailto:support@zellia.cn)** for enhanced capabilities, Long-Term Support (LTS), and more!

## 📋 Table of Contents

- [✨ Key Features](#key-features)
- [🛠️ Tech Stack](#tech-stack)
- [🚀 Getting Started](#getting-started)
- [💻 Usage](#usage)
- [⚙️ Development](#development)
- [📦 Building for Production](#building-for-production)
- [🤝 Contributing](#contributing)
- [📜 License](#license)
- [🙏 Acknowledgments](#acknowledgments)

---

## ✨ Key Features

- **⚡ Performance:** per-key actuation and release points, rapid trigger with its own press and
  release distances, dead zones, and the switch's travel range.
- **⌨️ Remapping:** assign keys, media, mouse, layer, profile and keyboard operations on every
  layer of the visual keyboard, with a "brush" that applies the last keycode to newly selected
  keys.
- **🎛️ Dynamic keys:** Tap-Hold, Toggle, Dynamic Keystroke (several actions along one key's
  travel) and Null Bind (two keys that resolve each other).
- **📜 Macros and scripts:** record macros on this computer's keyboard or build them key by key,
  and write JavaScript scripts that libamp's own compiler turns into bytecode, on keyboards whose
  firmware supports them (today the Trinity Pad; macros also the Oholeo).
- **💡 Lighting:** base effects with colours, speed, direction and density, plus per-key modes
  and colours.
- **🗂️ Profiles:** switch the keyboard's on-board profiles, keep more locally, import and
  export them.
- **🔧 Tools:** live key-travel chart and key tester (Debug), restart, bootloader and factory
  reset (Settings), and firmware updates over WebUSB DFU (Update), which also recover a keyboard
  that waits in its bootloader.
- **🎨 Interface:** dark and light mode, theme colours, English and Chinese.

Supported keyboards: Zellia Starlight, Zellia 60 HE, Zellia 80 HE, Oholeo and Trinity Pad, with
firmware built on the current [libamp](https://github.com/zhangqili/libamp) (version 0.1).

---

## 🛠️ Tech Stack

- **[React 19](https://react.dev/)** and **[TypeScript 6](https://www.typescriptlang.org/)** (strict).
- **[Vite 8](https://vite.dev/)** for development and builds, **[vite-plugin-pwa](https://vite-pwa-org.netlify.app/)** / Workbox for offline support.
- **[React Router 8](https://reactrouter.com/)** for routes, **[Zustand 5](https://zustand.docs.pmnd.rs/)** for shared state.
- **[Tailwind CSS 4](https://tailwindcss.com/)** and CSS Modules.
- **[emi-keyboard-controller](https://github.com/zhangqili/EMIKeyboardConfigurator)** (vendored in `src-controller/`) for the keyboard protocol.
- **[Vitest](https://vitest.dev/)**, Testing Library and **[Playwright](https://playwright.dev/)**, with a simulated libamp keyboard for tests.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 24 (with npm 11).
- Google Chrome or Microsoft Edge: WebHID and WebUSB are not available in Firefox or Safari.

### Installation

```bash
git clone https://github.com/Zellia-Keyboards/Zellia-Control.git
cd Zellia-Control
npm ci
npm run dev
```

The app runs at `http://localhost:5173`.

---

## 💻 Usage

1. Plug in your keyboard, open the app and click **Get Started**, then pick the keyboard in the
   browser's device list.
2. Use the sidebar: **Performance**, **Remap**, **Lighting**, **Dynamic Keys**, **Macros** and
   **Scripts** (shown on keyboards that support them), **Debug**, **Settings**, **Update** and
   **About**; **Profiles** sits at the top.
3. Remap, Performance and Dynamic Keys changes apply to the keyboard at once; lighting, macro and
   script changes reach the keyboard when you press **Save**. The dot on **Save** marks unsaved
   changes; **Save** also stores everything on the keyboard so it survives a restart.

---

## ⚙️ Development

| Command              | What it does                                                |
| -------------------- | ----------------------------------------------------------- |
| `npm run dev`        | Development server                                          |
| `npm run build`      | Production build into `build/`                              |
| `npm run preview`    | Serves the production build like the static host            |
| `npm run typecheck`  | TypeScript                                                  |
| `npm run lint`       | ESLint                                                      |
| `npm run format`     | Prettier                                                    |
| `npm test`           | Unit and integration tests (Vitest)                         |
| `npm run test:e2e`   | End-to-end tests (Playwright, Chrome)                       |
| `npm run validate`   | Type check, lint, format check, tests and build             |
| `npm run build:mqjs` | Rebuilds the script compiler in `vendor/mqjs/` (Emscripten) |

Project layout:

```text
src/
  app/            App shell: routes, sidebar, toolbar, connection screens
  features/       device (keyboard session), keyboard, keycodes, remap, performance, lighting,
                  dynamic-keys, macros, scripts, debug, profiles, settings, firmware-update,
                  about
  components/ui/  Shared UI primitives
  lib/            i18n, theme, transitions, storage, service worker registration
  testing/        Test setup and the simulated libamp keyboard
src-controller/   Vendored emi-keyboard-controller (not edited; see UPSTREAM.md)
vendor/mqjs/      libamp's script compiler (generated, GPL-3.0; see PROVENANCE.md)
e2e/              Playwright tests and visual parity scenarios
docs/             Developer guides, device layer, migration notes and design
```

More in [docs/architecture.md](docs/architecture.md) (how the app is built and why),
[docs/device.md](docs/device.md) (how it talks to the keyboard) and
[docs/development.md](docs/development.md) (testing, visual parity, PWA, deployment).

---

## 📦 Building for Production

```bash
npm run build
```

The static site is written to `build/`, including a copy of `index.html` for every route, so it
can be served by any static host without rewrite rules. The service worker makes it work
offline and installable.

---

## 🤝 Contributing

Contributions are welcome: open an issue, or fork the repository and send a pull request.
Before opening one, make sure `npm run validate` and `npm run test:e2e` pass. The UI must stay
identical to the reference design; see [docs/development.md](docs/development.md).

---

## 📜 License

Distributed under the MIT License. See [`LICENSE`](LICENSE).

The script compiler in `vendor/mqjs/` is built from [libamp](https://github.com/zhangqili/libamp)
and licensed under the GPL-3.0 (`vendor/mqjs/LICENSE`). It is a separate component, which the
Scripts page loads when it compiles a script.

---

## 🙏 Acknowledgments

- [libamp](https://github.com/zhangqili/libamp) and
  [EMIKeyboardConfigurator](https://github.com/zhangqili/EMIKeyboardConfigurator), the firmware
  library and the keyboard protocol this app is built on.
- All contributors and users of this project.

---

<div align="center">
  <p>Made with ❤️ by the Zellia Team and Community for Hall Effect Keyboard Enthusiasts</p>
</div>
