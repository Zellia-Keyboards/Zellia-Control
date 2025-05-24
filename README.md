# Zellia Control

A modern desktop application for controlling and configuring Zellia keyboards. Built with Tauri, SvelteKit, and Rust for optimal performance and cross-platform compatibility.

> [!TIP]  
> **Looking for Support your keyboard with our firmware and software?** – **[Speak with Our Sales Team Today!](mailto:support@zellia.cn)**
>
> Get **enhanced capabilities**, **Long-Term Support (LTS)**, and **more!** by just contacting us.

## 🚀 Features

- **Real-time Keyboard Control**: Interactive keyboard layout with visual feedback
- **Performance Tuning**: 
  - Adjustable actuation points (0-4mm)
  - Rapid Trigger technology with customizable sensitivity
  - Continuous Rapid Trigger mode
- **Key Remapping**: Comprehensive key remapping with multiple categories
  - Basic keys (alphabet, numbers, special characters)
  - Function keys (F1-F13)
  - Media controls
  - Mouse functions
  - Special keys incoming
- **Profile Management**: Import/export keyboard profiles
- **Advanced Features**: 
  - Layer system (4 layers)
  - Lighting control
  - Calibration tools
  - Debug mode
- **Cross-platform**: Windows, macOS, and Linux support

## 🔧 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://rustup.rs/) (latest stable)
- [Yarn](https://yarnpkg.com/) package manager

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Zellia-Keyboards/zellia-control.git
   cd zellia-control
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Run in development mode**
   ```bash
   yarn tauri dev
   ```

## 🛠️ Development Setup

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- Extensions:
  - [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Available Scripts

```bash
# Start development server
yarn dev

# Build the application
yarn build

# Preview the built application
yarn preview

# Type checking
yarn check

# Type checking with watch mode
yarn check:watch

# Run Tauri commands
yarn tauri [command]
```

### Development Server

The development server runs on `http://localhost:1420` with hot module replacement enabled.

## 📖 Usage

### Basic Operation

1. **Select Keys**: Click on keys in the keyboard layout to select them
2. **Adjust Settings**: Use the sidebar navigation to access different configuration pages
3. **Layer Management**: Switch between 4 different layers using the layer selector
4. **Profile Sync**: Use the sync button to apply changes to your keyboard

### Key Features

#### Performance Page
- **Actuation Point**: Adjust how far keys must be pressed to register (0-4mm)
- **Rapid Trigger**: Enable dynamic key actuation based on press intention
- **Sensitivity**: Fine-tune rapid trigger sensitivity (0-2mm)

#### Remap Page
- **Basic Keys**: Remap alphabet, numbers, and special characters
- **System Keys**: Configure F1-F13 functions, system keys, and more
- **Layer Keys**: Assign layer switching functions
- **Media Keys**: Set up media control functions
- **Mouse Functions**: Assign mouse actions to keys
- **Special Keys for HE**: Configure special keys for Hall Effect keyboards such as calibration, etc...

#### Lighting Page
- **Lighting Effects**: Choose from various lighting effects
- **Color Customization**: Set colors for different layers and effects
- **Brightness Control**: Adjust brightness levels for each effect
- **Color Picker**: Use a color picker for precise color selection

#### Debug Page
- **Debug Mode**: Enable debug mode for advanced troubleshooting
- **Log Viewer**: View logs and debug information in real-time
- **Key Press Distance Tracking**: 
  - Real-time visualization of key pressing distance
  - Interactive charts for detailed observation and analysis
  - Track actuation behavior for Hall Effect switches
- **Pressure Monitoring**: Monitor keypress pressure values in real-time


## 📁 Project Structure

```
zellia-control/
├── src/                          # Frontend source code
│   ├── lib/                      # Svelte components and utilities
│   │   ├── KeyboardState.svelte.ts  # Global keyboard state management
│   │   └── Zellia80HE.svelte        # Main keyboard layout component
│   ├── routes/                   # SvelteKit pages
│   │   ├── +layout.svelte        # Main application layout
│   │   ├── test/                 # Test page
│   │   ├── performance/          # Performance tuning page
│   │   ├── remap/               # Key remapping page
│   │   ├── lighting/            # Lighting control page
│   │   ├── settings/            # Device settings page
│   │   └── [other pages]/       # Additional feature pages
│   ├── app.html                 # HTML template
│   └── app.css                  # Global styles
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── main.rs             # Application entry point
│   │   └── lib.rs              # Core Tauri functionality
│   ├── Cargo.toml             # Rust dependencies
│   ├── tauri.conf.json        # Tauri configuration
│   └── capabilities/          # Security capabilities
├── static/                     # Static assets
├── .svelte-kit/               # SvelteKit generated files
└── Configuration files
    ├── vite.config.js         # Vite configuration
    ├── svelte.config.js       # Svelte configuration
    ├── tailwind.config.js     # Tailwind CSS configuration
    └── package.json           # Node.js dependencies
```

## 🏗️ Building

### Development Build
```bash
yarn tauri dev
```

### Production Build
```bash
yarn tauri build
```

### Build Artifacts
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **macOS**: `src-tauri/target/release/bundle/dmg/`
- **Linux**: `src-tauri/target/release/bundle/deb/` or `src-tauri/target/release/bundle/rpm/`

## 🔧 Configuration

### Frontend Configuration
- **Vite**: [`vite.config.js`](vite.config.js) - Build tool configuration
- **SvelteKit**: [`svelte.config.js`](svelte.config.js) - Framework configuration
- **Tailwind**: [`tailwind.config.js`](tailwind.config.js) - Styling configuration

## 🎨 Styling

This project uses:
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing
- **Custom Components**: Responsive design with hover states

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - For the amazing desktop app framework
- [SvelteKit](https://kit.svelte.dev/) - For the powerful web framework
- [Tailwind CSS](https://tailwindcss.com/) - For the utility-first CSS framework
---

**Made with ❤️ for the Hall Effect keyboard community**