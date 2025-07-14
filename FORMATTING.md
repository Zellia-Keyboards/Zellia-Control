# Code Formatting Guide

This document explains how to format the Zellia Control codebase consistently.

## Quick Start

### Option 1: npm/yarn scripts (Recommended)
```bash
# Format all files
npm run format:all

# Format only web files (JS/TS/Svelte/CSS)
npm run format

# Check formatting without changing files
npm run format:check
```

### Option 2: Direct script execution
```bash
# Cross-platform Node.js script
node format-code.js

# PowerShell script (Windows)
./format-code.ps1

# Batch file (Windows - double-click friendly)
format-code.bat
```

## What Gets Formatted

### Web Files (via Prettier)
- **JavaScript/TypeScript**: `src/**/*.{js,ts}`
- **Svelte Components**: `src/**/*.svelte`
- **Stylesheets**: `src/**/*.{css,scss}`
- **Config Files**: `*.{js,ts,json}`

### Rust Files (via rustfmt)
- **Rust Source**: `src-tauri/**/*.rs`
- **Config Files**: `src-tauri/**/*.toml`

## Formatting Rules

### JavaScript/TypeScript/Svelte
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes for strings
- **Semicolons**: Always
- **Line Length**: 100 characters
- **Trailing Commas**: ES5 compatible
- **Arrow Functions**: Avoid parentheses when possible

### CSS/SCSS
- **Indentation**: 2 spaces
- **Properties**: One per line
- **Quotes**: Single quotes

### Rust
- **Standard**: rustfmt defaults
- **Indentation**: 4 spaces
- **Line Length**: 100 characters

## Installation

The formatting scripts will automatically install required dependencies:

- `prettier` - Main formatter
- `prettier-plugin-svelte` - Svelte support

For Rust formatting, ensure `rustfmt` is installed:
```bash
rustup component add rustfmt
```

## IDE Integration

### VS Code
Add to your `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[svelte]": {
    "editor.defaultFormatter": "svelte.svelte-vscode"
  },
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

Install recommended extensions:
- Prettier - Code formatter
- Svelte for VS Code
- rust-analyzer

### Other IDEs
Most modern IDEs support Prettier and rustfmt. Check your IDE's documentation for setup instructions.

## Pre-commit Hooks (Optional)

To automatically format code before commits, install husky:

```bash
npm install --save-dev husky lint-staged
npx husky install
```

Add to `package.json`:
```json
{
  "lint-staged": {
    "*.{js,ts,svelte,css,scss,json}": ["prettier --write"],
    "*.rs": ["rustfmt"]
  }
}
```

## Troubleshooting

### Common Issues

1. **"prettier command not found"**
   - Run `npm install` or use the format scripts which auto-install

2. **"Files are not formatted"**
   - Check `.prettierignore` for excluded files
   - Ensure file extensions are in the format patterns

3. **"Rust files not formatted"**
   - Install rustfmt: `rustup component add rustfmt`
   - Check that Rust toolchain is installed

4. **"Permission denied" on scripts**
   - On Unix systems: `chmod +x format-code.ps1`
   - On Windows: Run PowerShell as Administrator if needed

### Manual Commands

If scripts fail, you can run formatting manually:

```bash
# Web files
npx prettier --write "src/**/*.{js,ts,svelte,css,scss}" "*.{js,ts,json}"

# Rust files
find src-tauri -name "*.rs" -exec rustfmt {} \;

# Check formatting
npx prettier --check "src/**/*.{js,ts,svelte,css,scss}"
```

## Configuration Files

- `.prettierrc.json` - Prettier configuration
- `.prettierignore` - Files to exclude from formatting
- `rustfmt.toml` - Rust formatting config (if created)

## Best Practices

1. **Always format before committing**
2. **Use consistent spacing and indentation**
3. **Follow the established style guide**
4. **Run format checks in CI/CD**
5. **Keep formatting config in version control**

---

Happy coding! 🚀
