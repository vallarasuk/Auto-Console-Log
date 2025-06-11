# 📦 Change Log

All notable changes to the **Auto Console Log by Vallarasu Kanthasamy** extension will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and uses [Semantic Versioning](https://semver.org/).

---

## [0.1.3] – 2025-06-10

### Changed

- 🔧 **Package Update:**
  - Incremented version to `0.1.3`
  - Ensured accurate `publisher`, `icon`, and `repository` fields in `package.json`
  - Verified compatibility with VS Code `^1.98.0`
  - Aligned extension keywords and description for better discoverability

- 📁 **Files Field Added:**
  - Explicitly listed necessary files (`dist`, `media`, `README.md`, `Assets`) for publishing to the Marketplace

- 🧪 **Script Enhancements:**
  - Adjusted `test` and `lint` scripts to work seamlessly with VSCE and the updated dependency structure

---

## [0.0.9] – 2025-05-15

### Added

- **Profile Section in README:** Personal branding with image, name, and bio
- **Before & After Preview Block:** Visual comparison of code behavior before and after using the extension
- **Two-Column Profile Layout:** README layout with profile image on the left and details on the right

### Fixed

- **README Formatting Issues:** Fixed HTML structure issues (e.g., broken `<h1>` styles and layout alignment)

---

## [0.0.8] – 2025-05-15

### Fixed

- **JSX/TSX Support:** Improved insertion of `console.log()` in complex JSX/multiline return blocks
- **Scope Bug Fix:** Fixed insertion for undeclared or shadowed variables
- **Stability:** Prevented duplicate logs, improved consistency across file types
- **Keybinding Conflicts:** Increased compatibility with other extensions

### Changed

- **Code Cleanup:** Removed redundant conditions, optimized for large file scans

---

## [0.0.7] – 2025-05-15

### Added

- **Live Usage Examples:** Usage comparison with _Turbo Console Log_ in README
- **Shortcut Display:** Listed shortcuts in README:
  - `Ctrl + Shift + L` (Windows/Linux)
  - `Cmd + Shift + L` (macOS)
- **External Links:** Added links to:
  - Personal website
  - ATS Resume Builder
  - 600+ Developer PDF resources
  - Motivational quotes/reels
  - WhatsApp community
- **Log Levels:** Configurable log levels: `log`, `info`, `warn`, `error`
- **Keyboard Shortcut:** Instant activation with shortcut keys
- **Variable Detection:** Auto `console.log()` insertion for declared variables

### Changed

- **Keybinding Update:** Changed from `Alt+Shift+L` to `Ctrl+Shift+L` for usability

### Fixed

- **JSX/TSX Bug Fixes:** Handled log insertion in `.jsx` and `.tsx` correctly
- **Nested Scope Handling:** Improved variable detection in nested blocks

---

## [0.0.6] – 2025-04-15

- Minor README improvements and bug fixes (merged into 0.0.7)

---

## [0.0.5] – 2025-04-20

- Bug fixes for JSX/TSX
- Improved nested scope detection

---

## [0.0.4] – 2025-04-10

- Added log level configuration
- Changed default keybinding to `Ctrl+Shift+L`

---

## [0.0.3] – 2025-03-30

- Initial release with basic `console.log()` insertion for JS/TS/React files

---
