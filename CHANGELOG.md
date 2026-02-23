# 📦 Change Log

All notable changes to the **Auto Console Log by Vallarasu Kanthasamy** extension will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and uses [Semantic Versioning](https://semver.org/).

---

## [0.5.5] – 2026-02-23

### Fixed

- 🪚 **Multi-line Log Removal:** Resolved syntax errors caused by code formatters (like Prettier or Black). "Remove All Console Logs" now properly detects and removes log statements that span across multiple lines across all supported languages (`error_log`, `fmt.Printf`, `Console.WriteLine`, etc).

---

## [0.5.4] – 2026-02-20

### Fixed

- 🎯 **Selection Logging:** "Add Console Log for Selection" now accurately logs exactly the variable you highlight and places the log precisely on the next line (previously inserted at declaration).
- 🧹 **File-Wide Log Removal:** "Remove All Console Logs" now strictly defaults to removing all generated logs across the entire file, avoiding confusion with scope-restricted removals.
- 🛠️ **Provider Interface:** Extracted a standardized `getLogStatement` method for cleaner log generation across 9+ supported languages.

---

## [0.5.2] – 2026-02-18

### Changed

- 🏷️ **Rebranded Identity:** Updated extension name to `auto-console-log` and publisher to `vallarasuk`.
- ⚙️ **Refined Configuration:** Shortened configuration prefix to `autoConsoleLog` for easier access.

---

## [0.5.1] – 2026-02-18

### Added

- 🔒 **Security Enhancement:** Moved marketplace tokens from `publish.sh` to a `.env` file for better security and flexibility.
- 📄 **Environment Configuration:** Added `.env.example` as a template for easier setup in different environments.

### Fixed

- 📦 **Packaging Migration:** Updated `.vscodeignore` to ensure environment files are excluded from the published extension package.

---

## [0.5.0] – 2026-02-18

### Added

- 🎁 **Pro Features are now FREE!**
  - All previously paid-only features are now available to all users for free.
  - **Custom Log Templates:** Use placeholders like `{varName}`, `{file}`, `{line}`, and `{context}` to define the exact format of your console logs.
  - **Remote Logging:** Configure a remote URL to send your logs to an external server for easier debugging of distributed systems or mobile apps.

### Changed

- 🧹 **Cleaned up extension interface:** Removed "Upgrade Logger Pro" buttons and payment prompts.
- 🚀 **Optimization:** Streamlined activation events for faster extension startup.

---

## [0.4.3] – 2026-02-18

### Fixed

- 🚀 **Critical Fix: Extension Activation:** Fixed an issue where the extension failed to activate (showing "command not found") due to missing dependencies in the v0.4.2 bundle.
- 📦 **VSIX Optimization:** Corrected `.vscodeignore` to properly include production dependencies while keeping the package size optimized.

---

## [0.4.2] – 2026-02-18

### Fixed

- ⌨️ **Keybinding Conflict Auto-Resolution:**
  - On installation/activation, the extension now **automatically disables conflicting keybindings** from VS Code built-ins and other extensions (e.g., `expandLineSelection` on `Ctrl+L`, Turbo Console Log's `Ctrl+L`).
  - This ensures `Ctrl+L` (Add Log for Selection) and `Ctrl+Alt+L` (Add All Logs) work immediately after install — no manual keybinding setup required.
  - Conflicting entries are written to the user's `keybindings.json` with a `-` prefix (VS Code's standard way to disable a binding).
  - On extension deactivation/uninstall, the injected entries are automatically removed.
- 🐛 **Python Log Removal:** Fixed `Remove All Console Logs` to also detect Python `# [ACL]` markers (previously only `// [ACL]` was matched).

### Added

- 🔧 **"Fix Keybinding Conflicts" Command:** Added a new command (`Auto Console Log: Fix Keybinding Conflicts`) in the Command Palette to manually re-apply the keybinding conflict resolution if the user resets their `keybindings.json`.

---

## [0.4.0] – 2026-02-17

### Added

- 🌍 **Multi-Language Support:**
  - Added support for **Python** (`print(f"...")`)
  - Added support for **Java** (`System.out.println(...)`)
  - Added support for **C#** (`Console.WriteLine(...)`)
  - Added support for **Go** (`fmt.Printf(...)`)
  - Added support for **PHP** (`error_log(...)`)
- 🏗 **Provider Pattern:** Refactored extension architecture to easily plug in new languages.

### Fixed

- **Performance:** Optimized log insertion logic by splitting generic and language-specific providers.

---

## [0.3.1] – 2026-02-17

### Changed

- 🔄 **Shortcut Reversion:**
  - Reverted "Add Log for Selection" shortcut back to `Ctrl+L` (Cmd+L on Mac) based on user feedback.

---

## [0.3.0] – 2026-02-17

### Changed

- ⌨️ **New Shortcuts:**
  - `Ctrl+Alt+L`: Add All Logs
  - `Ctrl+Alt+R`: Remove All Logs
- 🛠 **Developer Experience:**
  - Added `Ctrl+Alt+K` (temporary) for selection logging.

### Added

- 🔓 **Developer Bypass:** Added local environment variable check for Pro features during development.

---

## [0.2.1] – 2026-02-17

### Fixed

- 🐛 **Keybinding Fixes:** Resolved duplicate keybinding entries in `package.json`.

---

## [0.2.0] – 2026-02-17

### Added

- 🧠 **Smart AST Parsing:**
  - Replaced Regex with `@babel/parser` for accurate JS/TS variable detection.
  - Supports Destructuring, React Hooks, and Nested Scopes.
- 🧹 **Context-Aware Removal:**
  - "Remove Logs" now detects if the cursor is inside a function and only removes logs from that function. If outside, it cleans the whole file.

### Fixed

- **Scope Issues:** Fixed bugs where variables outside the current scope were being logged.

## [0.1.5] – 2025-06-10

### Added

- ✅ **Single Variable Console Log:**
  - Bug Fixes related to single variable console log fixed

---

## [0.1.4] – 2025-06-10

### Added

- ✅ **Single Variable Console Log:**
  - Added support for logging only the selected single variable
  - Improved precision and faster log insertion for single selections

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
