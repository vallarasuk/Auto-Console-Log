const vscode = require("vscode");
// const ExtPay = require("./lib/extpay-vscode");
const JsTsProvider = require("./providers/JsTsProvider");
const fs = require("fs");
const path = require("path");
const os = require("os");

// // Global ExtPay instance
// const extpay = ExtPay("auto-console-log");

// Provider Registry
const providers = {
  javascript: new JsTsProvider(),
  javascriptreact: new JsTsProvider(),
  typescript: new JsTsProvider(),
  typescriptreact: new JsTsProvider(),
  python: new (require("./providers/PythonProvider"))(),
  java: new (require("./providers/JavaProvider"))(),
  csharp: new (require("./providers/CSharpProvider"))(),
  go: new (require("./providers/GoProvider"))(),
  php: new (require("./providers/PhpProvider"))(),
  cpp: new (require("./providers/CppProvider"))(),
  swift: new (require("./providers/SwiftProvider"))(),
};

// ─── Keybinding Conflict Resolution ──────────────────────────────────────────

/**
 * Returns the path to VS Code's user keybindings.json file.
 * Works on Windows, macOS, and Linux.
 */
function getKeybindingsFilePath() {
  const home = os.homedir();
  const platform = process.platform;

  if (platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(home, "AppData", "Roaming"),
      "Code",
      "User",
      "keybindings.json",
    );
  } else if (platform === "darwin") {
    return path.join(
      home,
      "Library",
      "Application Support",
      "Code",
      "User",
      "keybindings.json",
    );
  } else {
    // Linux
    return path.join(home, ".config", "Code", "User", "keybindings.json");
  }
}

/**
 * Keybinding entries that conflict with Auto Console Log shortcuts.
 * The "command" with a "-" prefix disables that specific binding.
 *
 * Conflicts we resolve:
 *  - ctrl+l: VS Code built-in "expandLineSelection"
 *  - ctrl+l: Turbo Console Log "turboConsoleLog.addLogMessage" (if installed)
 *  - ctrl+alt+l: Some terminal/panel shortcuts
 */
const CONFLICTING_KEYBINDINGS = [
  // Disable VS Code built-in "Expand Line Selection" on Ctrl+L
  {
    key: "ctrl+l",
    command: "-expandLineSelection",
    _acl_managed: true,
  },
  // Disable Turbo Console Log's Ctrl+L binding (if installed)
  {
    key: "ctrl+l",
    command: "-turboConsoleLog.addLogMessage",
    _acl_managed: true,
  },
  // Disable any other common Ctrl+L conflicts
  {
    key: "ctrl+l",
    command: "-workbench.action.chat.openInEditor",
    _acl_managed: true,
  },
];

/**
 * Reads the user's keybindings.json, injects our conflict-resolution entries
 * (if not already present), and writes it back.
 * Only runs once per install (tracked via globalState).
 */
function autoDisableConflictingKeybindings(context) {
  const stateKey = "acl.keybindingsPatched.v1";
  const alreadyPatched = context.globalState.get(stateKey, false);
  if (alreadyPatched) return;

  const keybindingsPath = getKeybindingsFilePath();

  try {
    // Ensure the directory exists
    const dir = path.dirname(keybindingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Read existing keybindings (or start with empty array)
    let existing = [];
    if (fs.existsSync(keybindingsPath)) {
      const raw = fs.readFileSync(keybindingsPath, "utf-8").trim();
      if (raw && raw !== "") {
        // Strip JSON comments (VS Code allows // comments in keybindings.json)
        const stripped = raw
          .replace(/\/\/[^\n]*/g, "")
          .replace(/\/\*[\s\S]*?\*\//g, "");
        try {
          existing = JSON.parse(stripped);
          if (!Array.isArray(existing)) existing = [];
        } catch {
          // If parse fails, back up and start fresh
          fs.writeFileSync(keybindingsPath + ".acl-backup", raw, "utf-8");
          existing = [];
        }
      }
    }

    // Remove any previously injected ACL entries (for clean re-injection)
    existing = existing.filter((entry) => !entry._acl_managed);

    // Add our conflict-resolution entries
    let added = 0;
    for (const entry of CONFLICTING_KEYBINDINGS) {
      // Only add if not already present (by key+command pair)
      const alreadyExists = existing.some(
        (e) => e.key === entry.key && e.command === entry.command,
      );
      if (!alreadyExists) {
        existing.push(entry);
        added++;
      }
    }

    if (added > 0) {
      fs.writeFileSync(
        keybindingsPath,
        JSON.stringify(existing, null, 2),
        "utf-8",
      );
      console.log(
        `[Auto Console Log] Patched ${added} conflicting keybinding(s) in ${keybindingsPath}`,
      );
    }

    // Mark as patched so we don't repeat on every activation
    context.globalState.update(stateKey, true);
  } catch (err) {
    // Non-fatal: log but don't crash the extension
    console.warn(
      "[Auto Console Log] Could not auto-patch keybindings:",
      err.message,
    );
  }
}

/**
 * Removes all ACL-managed keybinding entries from the user's keybindings.json.
 * Called on extension deactivation or when user explicitly requests cleanup.
 */
function removeConflictingKeybindingPatches() {
  const keybindingsPath = getKeybindingsFilePath();
  try {
    if (!fs.existsSync(keybindingsPath)) return;
    const raw = fs.readFileSync(keybindingsPath, "utf-8").trim();
    if (!raw) return;
    const stripped = raw
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    let existing = JSON.parse(stripped);
    if (!Array.isArray(existing)) return;
    const filtered = existing.filter((e) => !e._acl_managed);
    if (filtered.length !== existing.length) {
      fs.writeFileSync(
        keybindingsPath,
        JSON.stringify(filtered, null, 2),
        "utf-8",
      );
    }
  } catch {
    // Non-fatal
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

function activate(context) {
  console.log("Auto Console Log Extension Activated!");

  // Auto-disable conflicting keybindings on first install/activation
  autoDisableConflictingKeybindings(context);

  /*
  // Initialize ExtensionPay (background sync)
  extpay.startBackground(context);

  // Check user status to show Upgrade button if free
  extpay.getUser().then((user) => {
    const isDev =
      process.env.USER === "vallarasu" ||
      process.env.USERNAME === "vallarasu" ||
      process.env.AUTO_CONSOLE_LOG_DEV === "true";
    if (!user.paid && !isDev) {
      const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100,
      );
      statusBarItem.text = "$(heart) Upgrade Logger Pro";
      statusBarItem.tooltip = "Support the developer & unlock Pro features";
      statusBarItem.command = "extension.openPaymentPage";
      statusBarItem.show();
      context.subscriptions.push(statusBarItem);
    }
  });
  */

  /*
  // Command to open payment page
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openPaymentPage", () => {
      extpay.openPaymentPage();
    }),
  );
  */

  // Command to remove all console logs
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.removeConsoleLogs", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const document = editor.document;
      const languageId = document.languageId;
      const provider = providers[languageId];

      if (!provider) {
        vscode.window.showInformationMessage(
          `Log removal not fully supported for ${languageId} yet.`,
        );
        return;
      }

      const edit = new vscode.WorkspaceEdit();
      const logsToRemove = [];

      // Determine scope for removal
      // Always use global scope for Remove All Console Logs
      const isGlobal = true;
      const startLine = 0;
      const endLine = document.lineCount;

      for (let i = startLine; i < endLine; i++) {
        const line = document.lineAt(i);
        const text = line.text.trim();

        if (
          text.endsWith("// [ACL]") ||
          text.endsWith("# [ACL]") ||
          text.endsWith("/* [ACL] */") ||
          text.endsWith("<!-- [ACL] -->")
        ) {
          let startIndex = i;

          // Look backward up to 20 lines to find the start of the log statement
          for (let j = i; j >= Math.max(0, i - 20); j--) {
            const prevText = document.lineAt(j).text;
            const trimmedPrev = prevText.trim();

            if (
              j !== i &&
              (trimmedPrev.endsWith("// [ACL]") ||
                trimmedPrev.endsWith("# [ACL]") ||
                trimmedPrev.endsWith("/* [ACL] */") ||
                trimmedPrev.endsWith("<!-- [ACL] -->"))
            ) {
              // We hit the end of an older log, so the start of THIS log must be after it
              break;
            }

            const isStartPattern =
              /^\s*(?:(?:[a-zA-Z0-9_$]+\.)?(?:log|warn|error|info|debug|dir|println|WriteLine|Printf|Println)\s*\(|console\.|print|System\.|Console\.|fmt\.|echo|error_log|std::cout|NSLog|fetch|Log\.)/.test(
                prevText,
              );

            if (
              prevText.includes("----------------------------->") ||
              isStartPattern
            ) {
              startIndex = j;
              // If we found the actual method call, we can stop looking backward
              if (isStartPattern) {
                break;
              }
            }
          }

          const startPos = document.lineAt(startIndex).range.start;
          const endPos = line.rangeIncludingLineBreak.end;
          logsToRemove.push(new vscode.Range(startPos, endPos));
        }
      }

      if (logsToRemove.length === 0) {
        vscode.window.showInformationMessage(
          isGlobal
            ? "No auto-generated console logs found in file."
            : "No auto-generated console logs found in current function.",
        );
        return;
      }

      for (const range of logsToRemove) {
        edit.delete(document.uri, range);
      }

      vscode.workspace.applyEdit(edit).then((success) => {
        if (success) {
          vscode.window.showInformationMessage(
            `Removed ${logsToRemove.length} console logs${
              isGlobal ? " (File)" : " (Scope)"
            }.`,
          );
        } else {
          vscode.window.showErrorMessage("Failed to remove console logs.");
        }
      });
    }),
  );

  const insertConsoleLogs = async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor found!");
      return;
    }

    const document = editor.document;
    const languageId = document.languageId;
    const provider = providers[languageId];

    if (!provider) {
      vscode.window.showInformationMessage(
        `Auto Console Log not supported for ${languageId} files.`,
      );
      return;
    }

    try {
      await provider.insertConsoleLogs(editor, generateLogStatement);
    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
      console.error("Extension error:", error);
    }
  };

  const insertConsoleLogForSelection = async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor found!");
      return;
    }

    const document = editor.document;
    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showInformationMessage("No text selected.");
      return;
    }

    const varName = document.getText(selection).trim();
    if (!varName) return;

    const languageId = document.languageId;
    const provider = providers[languageId];

    if (!provider) {
      vscode.window.showInformationMessage(
        `Auto Console Log not supported for ${languageId} files.`,
      );
      return;
    }

    try {
      const insertLine = selection.end.line + 1;
      const lineText = document.lineAt(selection.end.line).text;
      let indent = lineText.match(/^\s*/)?.[0] || "";

      // Smart indent: try to inherit from the next non-empty line
      let foundBetterIndent = false;
      let i = insertLine;
      while (i < document.lineCount && document.lineAt(i).text.trim() === "") {
        i++;
      }
      if (i < document.lineCount) {
        const nextText = document.lineAt(i).text;
        const nextIndent = nextText.match(/^\s*/)?.[0] || "";
        if (
          nextIndent.length > indent.length &&
          !/^[}\])>]/.test(nextText.trim())
        ) {
          indent = nextIndent;
          foundBetterIndent = true;
        }
      }

      // If next line didn't help, check if current line opens a block
      if (!foundBetterIndent) {
        const cleanedLineText = lineText
          .split("//")[0]
          .split("/*")[0]
          .split("#")[0]
          .trim();
        if (
          cleanedLineText.endsWith("{") ||
          cleanedLineText.endsWith("(") ||
          cleanedLineText.endsWith("[") ||
          cleanedLineText.endsWith(":") ||
          cleanedLineText.endsWith("do") ||
          cleanedLineText.endsWith("then") ||
          cleanedLineText.endsWith("?") ||
          cleanedLineText.match(/=>$/)
        ) {
          const tabSize = Number(editor.options.tabSize) || 4;
          const insertSpaces = editor.options.insertSpaces !== false;
          const extraIndent = insertSpaces ? " ".repeat(tabSize) : "\t";
          indent += extraIndent;
        }
      }

      let logStatement = "";
      if (typeof provider.getLogStatement === "function") {
        logStatement = provider.getLogStatement(varName, indent);
      } else {
        // Fallback for JS/TS which uses the robust generateLogStatement
        logStatement = await generateLogStatement(
          document,
          "",
          varName,
          indent,
        );
      }

      const edit = new vscode.WorkspaceEdit();
      edit.insert(
        document.uri,
        new vscode.Position(insertLine, 0),
        logStatement,
      );

      const success = await vscode.workspace.applyEdit(edit);
      if (!success) {
        vscode.window.showErrorMessage("Failed to insert log for selection.");
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
      console.error("Extension error:", error);
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.addConsoleLogs",
      insertConsoleLogs,
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.addConsoleLogForSelection",
      insertConsoleLogForSelection,
    ),
  );

  // Command to manually re-patch keybindings (useful if user resets their keybindings.json)
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.fixKeybindingConflicts", () => {
      // Reset the patched flag so it runs again
      context.globalState.update("acl.keybindingsPatched.v1", false);
      autoDisableConflictingKeybindings(context);
      vscode.window.showInformationMessage(
        "✅ Auto Console Log: Keybinding conflicts resolved. Restart VS Code if shortcuts still don't work.",
      );
    }),
  );
}

// ─── Log Statement Generator ─────────────────────────────────────────────────

async function generateLogStatement(document, contextName, varName, indent) {
  const config = vscode.workspace.getConfiguration("autoConsoleLog");
  const logLevel = config.get("logLevel") || "info";
  const proConfig = config.get("pro") || {};

  // Clean varName for use inside a single-line string literal
  const safeVarName = varName
    .replace(/\r?\n|\r/g, " ")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');

  // Check Pro status
  let isPro = true; // Temporary allow all users to use Pro features
  /*
  try {
    const user = await extpay.getUser();
    isPro = user.paid;
  } catch {
    // ignore
  }

  // Developer Bypass
  if (
    process.env.USER === "vallarasu" ||
    process.env.USERNAME === "vallarasu" ||
    process.env.AUTO_CONSOLE_LOG_DEV === "true"
  ) {
    isPro = true;
  }
  */

  const suffix = " // [ACL]\n";

  if (isPro) {
    // 1. Remote Logging
    if (proConfig.remoteLogUrl && proConfig.remoteLogUrl.trim() !== "") {
      const url = proConfig.remoteLogUrl.trim();
      const payload = `{
    file: "${document.fileName.replace(/\\/g, "\\\\\\\\")}",
    line: ${contextName ? '"' + contextName + '"' : "null"},
    var: "${safeVarName}",
    value: ${varName},
    timestamp: new Date().toISOString()
}`;
      return `${indent}fetch('${url}', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(${payload}) }).catch(()=>{});${suffix}`;
    }

    // 2. Custom Templates
    if (proConfig.logTemplate && proConfig.logTemplate.trim() !== "") {
      let template = proConfig.logTemplate;
      // We pass the unescaped varName here to keep compatibility, or just safeVarName?
      // For custom templates it's safer to use the one without newlines, but we shouldn't add escape chars
      // since we don't know the context (console.log vs backticks).
      const templateVarName = varName.replace(/\r?\n|\r/g, " ");
      template = template.replace(/{varName}/g, templateVarName);
      template = template.replace(/{file}/g, document.fileName);
      template = template.replace(
        /{context}/g,
        contextName ? contextName.replace(/ > $/, "") : "",
      );
      return `${indent}${template};${suffix}`;
    }
  }

  // Default Behavior
  const method = ["warn", "error"].includes(logLevel) ? logLevel : "log";
  // Only needs single-quote escape since we use single-quote wrapping
  const labelVarName = varName.replace(/\r?\n|\r/g, " ").replace(/'/g, "\\'");
  return `${indent}console.${method}('${contextName}${labelVarName} ----------------------------->',  ${varName});${suffix}`;
}

function deactivate() {
  // Clean up our keybinding patches when extension is uninstalled/disabled
  removeConflictingKeybindingPatches();
}

module.exports = {
  activate,
  deactivate,
};
