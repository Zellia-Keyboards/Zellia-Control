# Zellia Control

<div align="center">
<p>
    Zellia Control is a powerful, cross-platform Progressive Web App designed for configuring Zellia Hall Effect keyboards. 
    Built with SvelteKit and TypeScript, it works directly in your browser with offline support, offering a seamless and intuitive user experience for customizing every aspect of your keyboard.
  </p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/PWA-Offline-blueviolet?style=for-the-badge&logo=pwa" alt="PWA">
    <img src="https://img.shields.io/badge/SvelteKit-v5.x-orange?style=for-the-badge&logo=svelte" alt="SvelteKit">
    <img src="https://img.shields.io/badge/TypeScript-v5.x-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
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
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [💻 Usage](#usage)
- [⚙️ Development](#development)
  - [Available Scripts](#available-scripts)
  - [Project Structure](#project-structure)
- [📦 Building for Production](#building-for-production)
- [🤝 Contributing](#contributing)
- [📜 License](#license)
- [🙏 Acknowledgments](#acknowledgments)
- [📞 Contact](#contact)

---

## ✨ Key Features

Zellia Control offers a rich set of features to unlock the full potential of your Hall Effect keyboard:

- **⚡ Performance Tuning:**
  - **Adjustable Actuation Points:** Fine-tune key actuation from 0.1mm to 4.0mm.
  - **Rapid Trigger:** Dynamic actuation and deactuation for ultra-responsive gameplay.
  - **Continuous Rapid Trigger:** Enhanced rapid trigger mode for maximum speed.
  - **Real-time Pressure Monitoring:** Visualize key press depth and pressure.
- **⌨️ Advanced Key Remapping:**
  - **Intuitive Interface:** Easily remap any key on the visual keyboard.
  - **Multiple Key Categories:** Basic, Function, Media, Mouse, System, and Special HE keys.
  - **4 Configurable Layers:** Create distinct profiles for different applications or games.
- **💡 RGB Lighting Control:**
  - **Multiple Effects:** Choose from a variety of dynamic lighting patterns.
  - **Color Customization:** Per-key or zone-based color settings.
  - **Brightness & Speed Control:** Adjust lighting intensity and effect speed.
- **🔧 Hardware & System Tools:**
  - **Hardware Calibration:** Calibrate switches for optimal performance.
  - **Debug Mode:** Access real-time key tracking and diagnostic tools.
  - **Profile Management:** Import and export keyboard configurations.
  - **Settings Page:** Configure application preferences and device settings.
- **🌐 Cross-Platform:**
  - Native support for Windows, macOS, and Linux.
- **🎨 Modern UI/UX:**
  - **Dark/Light Mode:** Automatic theme switching based on system preference.
  - **Customizable Theme Colors:** Personalize the app's appearance.
  - **Responsive Design:** Adapts to various screen sizes.

---

## 🛠️ Tech Stack

Zellia Control is built with a modern and robust technology stack:

- **[SvelteKit](https://kit.svelte.dev/):** Frontend framework for building fast and efficient web applications.
- **[TypeScript](https://www.typescriptlang.org/):** Superset of JavaScript adding static typing for improved code quality and maintainability.
- **[Vite](https://vitejs.dev/):** Next-generation frontend tooling for fast development and optimized builds.
- **[vite-plugin-pwa](https://vite-pwa-org.netlify.app/):** Plugin for progressive web app support enabling offline functionality and install capability.
- **[Workbox](https://developers.google.com/web/tools/workbox):** Library for offline caching and service worker management.
- **[Tailwind CSS](https://tailwindcss.com/):** Utility-first CSS framework for rapid UI development.

---

## 🚀 Getting Started

Follow these steps to get Zellia Control up and running on your local machine.

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18.x or higher recommended)
- [Yarn](https://yarnpkg.com/) (v1.x) or npm (v8.x or higher)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Zellia-Keyboards/Zellia-Control.git
   cd Zellia-Control
   ```

2. **Install frontend dependencies:**

   ```bash
   yarn install
   # or
   # npm install
   ```

3. **Run in development mode:**

   This command will start the development server with hot-reloading.

   ```bash
   yarn dev
   # or
   # npm run dev
   ```

   The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

---

## 💻 Usage

Once the application is running:

1. **Connect your Zellia Hall Effect Keyboard.** The application should automatically detect it.
2. **Navigate through the sections** using the sidebar:
    - **Performance:** Adjust actuation points, rapid trigger settings.
    - **Remap:** Customize key assignments across different layers.
    - **Lighting:** Control RGB effects and colors.
    - **Calibration:** Perform hardware calibration for your switches.
    - **Debug:** View real-time key data and logs.
    - **Settings:** Manage application preferences and keyboard profiles.
    - **About:** View application information and acknowledgments.
3. **Changes are applied in real-time** to your connected keyboard where applicable.
4. **Use the Profile Management** features in Settings to save and load your configurations.

---

## ⚙️ Development

### Available Scripts

In the `package.json`, you'll find several scripts for development:

- `yarn dev`: Starts the SvelteKit development server (frontend only).
- `yarn build`: Builds the SvelteKit frontend for production.
- `yarn preview`: Previews the production SvelteKit build locally.
- `yarn check`: Runs Svelte type checking.
- `yarn check:watch`: Runs Svelte type checking in watch mode.
- `yarn tauri dev`: Starts the full application (frontend + Tauri backend) in development mode.
- `yarn tauri build`: Builds the full application for production (creates installers/binaries).

### Project Structure

```text
zellia-control/
├── .github/                # GitHub Actions and issue templates
├── build/                  # Output directory for SvelteKit static build
├── public/                 # Renamed to static/ in your project
│   └── static/             # Static assets (favicon, logos)
├── src/                    # SvelteKit frontend source code
│   ├── app.css             # Global CSS styles
│   ├── app.html            # Main HTML shell
│   ├── lib/                # Shared Svelte components, stores, and utilities
│   │   ├── AdvancedKeyShared.ts
│   │   ├── DarkModeStore.svelte.ts
│   │   ├── KeyboardState.svelte.ts
│   │   └── Zellia80HE.svelte   # Interactive keyboard component
│   └── routes/             # SvelteKit page routes and layouts
│       ├── +layout.svelte    # Main application layout
│       ├── +page.svelte      # Home/Dashboard page
│       ├── about/
│       ├── advancedkey/
│       ├── calibration/
│       ├── debug/
│       ├── lighting/
│       ├── performance/
│       ├── remap/
│       └── settings/
├── src-tauri/              # Tauri (Rust) backend source code
│   ├── build.rs
│   ├── Cargo.toml          # Rust dependencies and project metadata
│   ├── capabilities/       # Tauri security capabilities
│   ├── icons/              # Application icons for different platforms
│   ├── src/                # Rust source files
│   │   ├── lib.rs
│   │   └── main.rs         # Main Rust application entry point
│   └── DarkModeStore.svelte.ts  # Dark mode state management
├── jsconfig.json           # JavaScript/TypeScript configuration
├── package.json            # Node.js project metadata and dependencies
├── postcss.config.js       # PostCSS configuration
├── README.md               # This file
├── svelte.config.js        # SvelteKit configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── vite.config.js          # Vite and PWA configuration
```

---

## 📦 Building for Production

To build the application for production as a Progressive Web App:

```bash
yarn build

npm run build
```

Build artifacts will be located in the `build/` directory. The application can be deployed to any static hosting service (Netlify, Vercel, GitHub Pages, etc.) and will work offline thanks to the PWA service worker.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. **Fork the Project**
2. **Create your Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your Changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the Branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

Please ensure your code adheres to the existing style and that all tests pass.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` file for more information.
(Note: You'll need to create a `LICENSE` file in your repository, typically containing the MIT License text if that's your chosen license.)

---

## 🙏 Acknowledgments

- The [Tauri Team](https://tauri.app/) for creating an amazing framework.
- The [Svelte Team](https://svelte.dev/) for Svelte and SvelteKit.
- All contributors and users of this project.

---

<div align="center">
  <p>Made with ❤️ by the Zellia Team and Community for Hall Effect Keyboard Enthusiasts</p>
</div>

