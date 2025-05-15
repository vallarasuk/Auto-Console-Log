# 📦 Change Log

All notable changes to the **Auto Console Log by Vallarasu Kanthasamy** extension will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and uses [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

- Add planned features or fixes here before the next release.

---

## [0.0.9] – 2025-05-15

### Added

- **Profile Section in README:** Added personal branding with image, name, and bio.
- **Before & After Preview Block:** Visually compares code behavior before and after using the extension.
- **Two-Column Profile Layout:** README now includes a layout with profile image on the left and details on the right.

### Fixed

- **README Formatting Issues:** Fixed HTML structure issues (e.g., broken styles in `<h1>` and layout alignment).

---

## [0.0.8] – 2025-05-15

### Fixed

- **Improved JSX/TSX Support:** Enhanced logic for inserting `console.log()` in complex JSX structures and multiline return blocks.
- **Scope Bug Fix:** Resolved edge case where `console.log()` was inserted for undeclared or shadowed variables.
- **Stability Fixes:** Minor internal refactors to avoid duplicate logging and maintain consistent behavior across file types.
- **Keybinding Conflict Resolution:** Improved compatibility with other extensions that use similar shortcuts.

### Changed

- **Code Cleanup:** Removed redundant conditions and improved performance during large file scans.

---

## [0.0.7] – 2025-05-15

### Added

- **Live Usage Examples:** README now includes detailed usage comparisons with the _Turbo Console Log_ extension.
- **Shortcut Display:** Clearly displays keyboard shortcuts in the README:
  - `Ctrl + Shift + L` (Windows/Linux)
  - `Cmd + Shift + L` (macOS)
- **External Links Section:** Added links to:
  - Personal website
  - ATS Resume Builder
  - 600+ Developer PDF resources
  - Motivational quotes and reels
  - WhatsApp community
- **Log Levels:** Support for configurable log levels: `log`, `info`, `warn`, `error`.
- **Keyboard Shortcut:** Instant activation via `Ctrl+Shift+L` / `Cmd+Shift+L`.
- **Variable Detection:** Automatically inserts `console.log()` for declared variables/constants in JavaScript, TypeScript, and React files.

### Changed

- **Default Keybinding Updated:** Changed from `Alt+Shift+L` to `Ctrl+Shift+L` for improved usability and alignment with common shortcut practices.

### Fixed

- **JSX/TSX Bug Fixes:** Resolved issues with log insertion in `.jsx` and `.tsx` files.
- **Nested Scope Handling:** Improved recognition of variables declared within nested blocks.

---

## [0.0.6] – 2025-04-15

- Previous patch with README improvements and bug fixes (merged into 0.0.7).

---

## [0.0.5] – 2025-04-20

- Fixed bugs related to log insertion in JSX and TSX files.
- Improved handling of variables declared in nested scopes.

---

## [0.0.4] – 2025-04-10

- Added support for custom log levels (`log`, `info`, `warn`, `error`) via configuration.
- Changed default keybinding from `Alt+Shift+L` to `Ctrl+Shift+L`.

---

## [0.0.3] – 2025-03-30

- Initial release with basic functionality to auto-insert `console.log()` for declared variables/constants in JavaScript, TypeScript, React files.

---
