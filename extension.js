const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { generateLogStatement, isLineContinuation } = require("./lib/utils");

// Provider Registry
const providers = {
  javascript: new (require("./providers/JsTsProvider"))(),
  javascriptreact: new (require("./providers/JsTsProvider"))(),
  typescript: new (require("./providers/JsTsProvider"))(),
  typescriptreact: new (require("./providers/JsTsProvider"))(),
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

const CONFLICTING_KEYBINDINGS = [
  {
    key: "ctrl+l",
    command: "-expandLineSelection",
    _acl_managed: true,
  },
  {
    key: "ctrl+l",
    command: "-turboConsoleLog.addLogMessage",
    _acl_managed: true,
  },
  {
    key: "ctrl+l",
    command: "-workbench.action.chat.openInEditor",
    _acl_managed: true,
  },
];

function normalizeSelectedExpression(rawText) {
  let value = (rawText || "").trim();
  if (!value) return "";
  value = value
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[;,]+$/g, "")
    .trim();
  value = value.split(/\s+(?:as|is)\s+[A-Za-z_][\w<>\[\]?]*/)[0].trim();
  return value;
}

function hasNearbyAutoLog(document, insertLine, varName) {
  const start = Math.max(0, insertLine - 2);
  const end = Math.min(document.lineCount - 1, insertLine + 3);
  for (let i = start; i <= end; i++) {
    const text = document.lineAt(i).text;
    if (text.includes("[ACL]") && text.includes(varName)) return true;
  }
  return false;
}

function autoDisableConflictingKeybindings(context) {
  const stateKey = "acl.keybindingsPatched.v1";
  const alreadyPatched = context.globalState.get(stateKey, false);
  if (alreadyPatched) return;

  const keybindingsPath = getKeybindingsFilePath();

  try {
    const dir = path.dirname(keybindingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let existing = [];
    if (fs.existsSync(keybindingsPath)) {
      const raw = fs.readFileSync(keybindingsPath, "utf-8").trim();
      if (raw && raw !== "") {
        const stripped = raw
          .replace(/\/\/[^\n]*/g, "")
          .replace(/\/\*[\s\S]*?\*\//g, "");
        try {
          existing = JSON.parse(stripped);
          if (!Array.isArray(existing)) existing = [];
        } catch {
          fs.writeFileSync(keybindingsPath + ".acl-backup", raw, "utf-8");
          existing = [];
        }
      }
    }

    existing = existing.filter((entry) => !entry._acl_managed);

    let added = 0;
    for (const entry of CONFLICTING_KEYBINDINGS) {
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
    }
    context.globalState.update(stateKey, true);
  } catch (err) {
    console.warn("[Auto Console Log] Could not auto-patch keybindings:", err.message);
  }
}

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
  autoDisableConflictingKeybindings(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.removeConsoleLogs", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const document = editor.document;
      const languageId = document.languageId;
      const provider = providers[languageId];

      if (!provider) {
        vscode.window.showInformationMessage(`Log removal not fully supported for ${languageId} yet.`);
        return;
      }

      const edit = new vscode.WorkspaceEdit();
      const logsToRemove = [];
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
              break;
            }

            const isStartPattern =
              /^\s*(?:(?:[a-zA-Z0-9_$]+\.)?(?:log|warn|error|info|debug|dir|println|WriteLine|Printf|Println)\s*\(|console\.|print|System\.|Console\.|fmt\.|echo|error_log|std::cout|NSLog|fetch|Log\.)/.test(
                prevText,
              );

            if (prevText.includes("----------------------------->") || isStartPattern) {
              startIndex = j;
              if (isStartPattern) break;
            }
          }

          const startPos = document.lineAt(startIndex).range.start;
          const endPos = line.rangeIncludingLineBreak.end;
          logsToRemove.push(new vscode.Range(startPos, endPos));
        }
      }

      if (logsToRemove.length === 0) {
        vscode.window.showInformationMessage("No auto-generated console logs found in file.");
        return;
      }

      for (const range of logsToRemove) {
        edit.delete(document.uri, range);
      }

      vscode.workspace.applyEdit(edit).then((success) => {
        if (success) {
          vscode.window.showInformationMessage(`Removed ${logsToRemove.length} console logs.`);
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
      vscode.window.showInformationMessage(`Auto Console Log not supported for ${languageId} files.`);
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

    let varName = normalizeSelectedExpression(document.getText(selection));
    if (!varName) return;

    const languageId = document.languageId;
    const provider = providers[languageId];

    if (!provider) {
      vscode.window.showInformationMessage(`Auto Console Log not supported for ${languageId} files.`);
      return;
    }

    try {
      if (provider.insertLogForSelection) {
        const handled = await provider.insertLogForSelection(
          editor,
          varName,
          generateLogStatement,
        );
        if (handled) return;
      }

      const selectionEndLine = selection.end.line;
      let lineText = document.lineAt(selectionEndLine).text;

      const isTerminalStatement = /(?:^|\s|;|{)(return|throw|break|continue)\b/.test(lineText);

      let insertLine;
      let indent = lineText.match(/^\s*/)?.[0] || "";

      if (isTerminalStatement) {
        insertLine = selectionEndLine; // Insert at the start of the line containing the end of selection
      } else {
        insertLine = selectionEndLine;
        let openParens = 0, openBraces = 0, openBrackets = 0;

        const processLine = (t) => {
          const s = t.replace(/'[^']*'/g, "").replace(/"[^"]*"/g, "").replace(/\/\/.*/, "").replace(/#.*/, "");
          for (const char of s) {
            if (char === "(") openParens++;
            else if (char === ")") openParens = Math.max(0, openParens - 1);
            else if (char === "{") openBraces++;
            else if (char === "}") openBraces = Math.max(0, openBraces - 1);
            else if (char === "[") openBrackets++;
            else if (char === "]") openBrackets = Math.max(0, openBrackets - 1);
          }
        };

        processLine(lineText);


        while (insertLine < document.lineCount - 1) {
            const nextLineText = document.lineAt(insertLine + 1).text;
            if (openParens > 0 || openBraces > 0 || openBrackets > 0 || isLineContinuation(lineText, nextLineText)) {
                insertLine++;
                lineText = nextLineText;
                processLine(lineText);
            } else {
                break;
            }
        }
        insertLine++;

        let i = insertLine;
        while (i < document.lineCount && document.lineAt(i).text.trim() === "") i++;
        if (i < document.lineCount) {
          const nextText = document.lineAt(i).text;
          const nextIndent = nextText.match(/^\s*/)?.[0] || "";
          if (nextIndent.length > indent.length && !/^[}\])>]/.test(nextText.trim())) {
            indent = nextIndent;
          }
        }
      }

      if (hasNearbyAutoLog(document, insertLine, varName)) {
        return;
      }

      const logStatement = await generateLogStatement(
        document,
        "",
        varName,
        indent,
        selection.start.line,
      );
      const edit = new vscode.WorkspaceEdit();
      edit.insert(document.uri, new vscode.Position(insertLine, 0), logStatement);
      await vscode.workspace.applyEdit(edit);
    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
  };

  context.subscriptions.push(vscode.commands.registerCommand("extension.addConsoleLogs", insertConsoleLogs));
  context.subscriptions.push(vscode.commands.registerCommand("extension.addConsoleLogForSelection", insertConsoleLogForSelection));
  context.subscriptions.push(vscode.commands.registerCommand("extension.fixKeybindingConflicts", () => {
    context.globalState.update("acl.keybindingsPatched.v1", false);
    autoDisableConflictingKeybindings(context);
    vscode.window.showInformationMessage("✅ Auto Console Log: Keybinding conflicts resolved.");
  }));

  // ─── Support View ──────────────────────────────────────────────────────────

  const supportProvider = new SupportViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("acl-support-view", supportProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.supportDeveloper", () => {
      vscode.commands.executeCommand("workbench.view.extension.auto-console-log-support");
    })
  );

  // ─── Welcome / Support Modal ────────────────────────────────────────────────
  const supportMessageShownKey = "acl.supportMessageShown.v1";
  const supportShown = context.globalState.get(supportMessageShownKey, false);

  if (!supportShown) {
    setTimeout(() => {
      vscode.window
        .showInformationMessage(
          "Thank you for installing Auto Console Log! If you find this tool helpful, please consider supporting the developer.",
          "Support Developer ❤️",
          "Maybe Later"
        )
        .then((selection) => {
          if (selection === "Support Developer ❤️") {
            showSupportModal(context.extensionUri);
          }
          context.globalState.update(supportMessageShownKey, true);
        });
    }, 3000); // Delay slightly after startup
  }

  // ─── Code Action Provider ──────────────────────────────────────────────────
  class AutoConsoleLogActionProvider {
    provideCodeActions(document, range, context, token) {
      let varName = "";
      if (range.isEmpty) {
        const wordRange = document.getWordRangeAtPosition(range.start);
        if (wordRange) {
          varName = document.getText(wordRange);
        }
      } else {
        varName = document.getText(range);
      }

      varName = normalizeSelectedExpression(varName);

      if (!varName || varName.length === 0) return [];

      const action = new vscode.CodeAction(`Add Console Log for '${varName}'`, vscode.CodeActionKind.QuickFix);
      action.command = {
        command: "extension.addConsoleLogForSelection",
        title: "Add Console Log"
      };

      const removeAction = new vscode.CodeAction(`Remove All Console Logs`, vscode.CodeActionKind.QuickFix);
      removeAction.command = {
        command: "extension.removeConsoleLogs",
        title: "Remove All Console Logs"
      };

      return [action, removeAction];
    }
  }

  const supportedLanguages = [
    "javascript", "javascriptreact", "typescript", "typescriptreact",
    "python", "java", "csharp", "go", "php", "cpp", "swift"
  ];

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      supportedLanguages.map(lang => ({ language: lang })),
      new AutoConsoleLogActionProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );
}

/**
 * Shows a webview panel with support information and QR code.
 */
function showSupportModal(extensionUri) {
  const panel = vscode.window.createWebviewPanel(
    "aclSupportModal",
    "Support the Developer",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [extensionUri],
    }
  );

  panel.webview.html = getSupportHtml(panel.webview, extensionUri);
}

/**
 * Generates the common HTML for support view and modal.
 */
function getSupportHtml(webview, extensionUri) {
  const qrUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "assets", "support_qr.png")
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Support Developer</title>
    <style>
        body {
            padding: 40px 20px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
        .container {
            width: 100%;
            max-width: 400px;
            background: var(--vscode-sideBar-background);
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            border: 1px solid var(--vscode-widget-border);
        }
        h1 {
            margin-top: 0;
            font-size: 1.5rem;
            color: var(--vscode-button-background);
        }
        p {
            font-size: 1rem;
            line-height: 1.6;
            opacity: 0.9;
        }
        .qr-code {
            margin: 30px 0;
            padding: 15px;
            background: white;
            border-radius: 12px;
            display: inline-block;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .qr-code img {
            display: block;
            width: 220px;
            height: 220px;
        }
        .upi-id {
            background: var(--vscode-textBlockQuote-background);
            padding: 12px 20px;
            border-radius: 8px;
            font-family: var(--vscode-editor-font-family);
            font-size: 1rem;
            word-break: break-all;
            margin: 15px 0;
            border: 1px dashed var(--vscode-textSeparator-foreground);
            color: var(--vscode-textLink-foreground);
        }
        .heart {
            color: #ff4d4d;
            font-size: 3rem;
            margin-bottom: 20px;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        .footer {
            margin-top: 30px;
            font-size: 0.9rem;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="heart">❤️</div>
    <h1>Support the Developer</h1>
    <div class="container">
        <p>Hi! I'm <b>Vallarasu Kanthasamy</b>. I hope <b>Auto Console Log</b> is saving you time!</p>
        <p>If you'd like to support the continued development of this extension, you can donate via UPI by scanning the code below.</p>
        
        <div class="qr-code">
            <img src="${qrUri}" alt="UPI QR Code">
        </div>
        
        <div class="upi-id">
            vallarasuk143@pingpay
        </div>
        
        <p style="font-size: 0.8rem; opacity: 0.7;">Scan to support via UPI</p>
    </div>
    
    <div class="footer">
        Thank you for being part of the community!
    </div>
</body>
</html>`;
}

class SupportViewProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
  }

  resolveWebviewView(webviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = getSupportHtml(webviewView.webview, this._extensionUri);
  }
}

function deactivate() {
  removeConflictingKeybindingPatches();
}

module.exports = { activate, deactivate };
