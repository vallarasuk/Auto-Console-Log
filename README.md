# Auto Console Log

Auto Console Log is a VS Code extension that inserts useful debug logs in the right place, quickly and safely, across multiple programming languages.

## Why this extension

- Log every detected variable in a file with one command.
- Log only selected expressions when you want focused debugging.
- Remove all generated logs reliably using a single marker.
- Keep logs readable with context, emoji, delimiter, file name, and line number options.
- Support day-to-day debugging in JavaScript, TypeScript, Python, Java, C#, Go, PHP, C++, and Swift.

## What's New in v0.8.0

- ⚛️ **Advanced JSX Support:** Automatically wraps console logs in `{ }` when inserted directly into JSX contexts, ensuring valid React syntax.
- 📥 **Function Parameter Logging:** The extension now identifies and logs parameters from function declarations, arrow functions, and class/object methods.
- 🎯 **Enhanced Placement Heuristics:** Improved accuracy for multiline JSX tags and complex JS/TS statements.
- 🧪 **Robust Testing:** Expanded test suite for JSX and improved selection-based insertion accuracy.


## Shortcuts

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| Add logs for variables in current file | `Ctrl+Alt+L` | `Cmd+Alt+L` |
| Add log for current selection | `Ctrl+L` | `Cmd+L` |
| Remove auto-generated logs | `Ctrl+Alt+R` | `Cmd+Alt+R` |

## Supported languages

The extension provides provider-based support for:

- JavaScript (`javascript`, `javascriptreact`)
- TypeScript (`typescript`, `typescriptreact`)
- Python (`python`)
- Java (`java`)
- C# (`csharp`)
- Go (`go`)
- PHP (`php`)
- C++ (`cpp`)
- Swift (`swift`)

## What gets inserted

Generated statements are language-aware:

- JavaScript / TypeScript: `console.log|warn|error(...)`
- Python: `print(...)`
- Java: `System.out.println(...)`
- C#: `Console.WriteLine(...)`
- Go: `fmt.Println(...)`
- PHP: `error_log(...)`
- C++: `std::cout << ...`
- Swift: `print(...)`

All generated logs include an `[ACL]` marker comment so they can be removed safely.

## Placement logic

### File-wide insertion

- JS/TS uses AST parsing to find declarations (including destructuring).
- Other languages use focused declaration patterns per provider.
- Duplicate suppression checks nearby lines and existing `[ACL]` logs.
- Inline terminal statements (`return`, `throw`, `break`, `continue`) are handled to avoid unreachable placement.
- Indentation is inherited from declaration/context lines.

### Selection insertion

- JS/TS uses AST-first insertion.
- If AST handling is not available, a robust fallback heuristic is used:
  - Normalizes selection text before logging.
  - Tracks multiline statements and continuation operators.
  - Respects terminal statements and nearby indentation.
  - Skips insertion when matching `[ACL]` log already exists nearby.

## Settings

Use these settings under `autoConsoleLogByVallarasuKanthasamy`:

- `enable` (boolean): Enable/disable extension behavior.
- `logLevel` (`log` | `info` | `warn` | `error`): Affects JS/TS console method.
- `showContext` (boolean): Include function/class context in labels when available.
- `logMessageEmoji` (string): Prefix emoji for labels.
- `logMessagePrefix` (string): Static label prefix.
- `includeFileName` (boolean): Add filename in label.
- `includeLineNumber` (boolean): Add source line number in label.
- `delimiter` (string): Separator text in label.
- `pro.remoteLogUrl` (string): For JS/TS, send payload to remote endpoint via `fetch`.

Example `settings.json`:

```json
{
  "autoConsoleLogByVallarasuKanthasamy.logLevel": "warn",
  "autoConsoleLogByVallarasuKanthasamy.showContext": true,
  "autoConsoleLogByVallarasuKanthasamy.logMessageEmoji": "🔍 ",
  "autoConsoleLogByVallarasuKanthasamy.logMessagePrefix": "[DEBUG] ",
  "autoConsoleLogByVallarasuKanthasamy.includeFileName": true,
  "autoConsoleLogByVallarasuKanthasamy.includeLineNumber": true,
  "autoConsoleLogByVallarasuKanthasamy.delimiter": " -> ",
  "autoConsoleLogByVallarasuKanthasamy.pro.remoteLogUrl": ""
}
```

## Architecture

- `extension.js`: command registration, provider dispatch, selection fallback, removal command, keybinding conflict management.
- `providers/`: per-language variable detection and insertion strategy.
- `lib/utils.js`: shared statement generator and label formatting.
- `dist/extension.js`: esbuild bundle used by VS Code runtime.

## Development

### Prerequisites

- Node.js 20+
- npm
- VS Code 1.110+

### Setup

```bash
npm install
npm run compile
```

### Watch mode

```bash
npm run watch
```

### Tests

```bash
npm run test:unit
```

### Lint

```bash
npm run lint
```

### Package extension

```bash
npm run package
```

Or:

```bash
./build_vsix.sh
```

## Publish

`publish.sh` supports publishing to both VS Code Marketplace and Open VSX.
Create a local `.env` from `.env.example` and provide:

- `VSCE_TOKEN`
- `OVSX_TOKEN`

Then run:

```bash
./publish.sh
```

## Known limitations

- Non-JS/TS providers are regex-driven and may miss edge-case declarations.
- Go logs use `fmt.Println(...)`; files without `fmt` import may need manual import.
- Complex expressions selected across multiple syntax contexts may need manual adjustment.

## Roadmap ideas

- Deeper AST support for additional languages.
- Code-action based insertion previews.
- Smarter import insertion for Go and language-specific logger frameworks.
- Per-language custom templates.

## Support

- Issues: [GitHub Issues](https://github.com/vallarasuk/Auto-Console-Log/issues)
- Marketplace: [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=VallarasuKanthasamy.auto-console-log-by-vallarasu-kanthasamy)
- Open VSX: [Open VSX Extension](https://open-vsx.org/extension/VallarasuKanthasamy/auto-console-log-by-vallarasu-kanthasamy)

### Support the Developer

If you find this extension helpful, consider supporting the developer!

**UPI ID:** `vallarasuk143@pingpay`

<p align="center">
  <img src="assets/support_qr.png" alt="UPI QR Code" width="200" />
  <br>
  <em>Scan to support via UPI</em>
</p>
