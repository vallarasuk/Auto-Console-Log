const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { generateLogStatement } = require("./lib/utils");

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

    let varName = document.getText(selection).trim();
    if (!varName) return;

    // Clean up varName: remove trailing type annotations, semicolons, or assignments
    varName = varName.split(/[:;=]/)[0].trim();

    const languageId = document.languageId;
    const provider = providers[languageId];

    if (!provider) {
      vscode.window.showInformationMessage(`Auto Console Log not supported for ${languageId} files.`);
      return;
    }

    try {
      if (provider.insertLogForSelection) {
        await provider.insertLogForSelection(editor, varName, generateLogStatement);
        return;
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

        const isLineContinuation = (currentLineText, nextLineText) => {
          const trimmedCurrent = currentLineText.replace(/\/\/.*$/, "").replace(/#.*$/, "").replace(/\/\*.*?\*\//g, "").trim();
          const endsWithContinuation = /[,=+\-*/%&|^<>?:!]$|(&&|\|\||\?\?|\.|\/|\\)$/.test(trimmedCurrent);
          
          if (endsWithContinuation) return true;
          
          if (nextLineText !== undefined) {
              const trimmedNext = nextLineText.trim();
              const startsWithContinuation = /^[.\?:]/.test(trimmedNext) || /^(&&|\|\||\?\?)/.test(trimmedNext);
              if (startsWithContinuation) return true;
          }
          
          return false;
        };

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

      const logStatement = await generateLogStatement(document, "", varName, indent, selection.start.line);
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
}

function deactivate() {
  removeConflictingKeybindingPatches();
}

module.exports = { activate, deactivate };
