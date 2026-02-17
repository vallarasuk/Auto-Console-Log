const vscode = require("vscode");
const ExtPay = require("./lib/extpay-vscode");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

// Global ExtPay instance
const extpay = ExtPay("auto-console-log-by-vallarasu-kanthasamy"); // Updated with user provided ID

const supportedLanguages = [
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact",
];

// Entry point - activate extension
function activate(context) {
  console.log("Auto Console Log Extension Activated!");

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

  // Command to open payment page
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openPaymentPage", () => {
      extpay.openPaymentPage();
    }),
  );

  // Command to remove all console logs
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.removeConsoleLogs", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const document = editor.document;
      const edit = new vscode.WorkspaceEdit();
      const logsToRemove = [];

      // Determine scope for removal
      // let deletionRange = null;
      const cursorPosition = editor.selection.active;
      // Re-use logic to find function scope usually used for insertion, but for deletion range limit
      // We can use the helper 'getFunctionScopeRange' if available or implement similar "is inside function" logic
      const scopeRange = getFunctionScopeRange(document, cursorPosition);

      // If cursor is inside a function, scope matches function.
      // If cursor is at top level, scopeRange might be null or we treat it as Global.
      // User Req: "cursor inside the function means inside only the function other wise outside of the fucntion means entire file"

      const isGlobal = !scopeRange;

      // If targeted (inside function), we restrict search to that range.
      // If global, we search entire lineCount.

      const startLine = isGlobal ? 0 : scopeRange.start.line;
      const endLine = isGlobal ? document.lineCount : scopeRange.end.line;

      for (let i = startLine; i < endLine; i++) {
        const line = document.lineAt(i);
        // Match default logs or Pro logs with signature
        if (
          line.text.includes("---------------------------->") ||
          line.text.trim().endsWith("// [ACL]")
        ) {
          logsToRemove.push(line.rangeIncludingLineBreak);
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
            `Removed ${logsToRemove.length} console logs${isGlobal ? " (File)" : " (Scope)"}.`,
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

    if (!supportedLanguages.includes(languageId)) {
      vscode.window.showInformationMessage(
        `Auto Console Log not supported for ${languageId} files.`,
      );
      return;
    }

    try {
      const selection = editor.selection;
      const code = document.getText();
      let ast;
      try {
        ast = parser.parse(code, {
          sourceType: "module",
          plugins: [
            "jsx",
            "typescript",
            "classProperties",
            "decorators-legacy",
            "dynamicImport",
          ],
        });
      } catch (e) {
        vscode.window.showErrorMessage(
          "Failed to parse file. Please fix syntax errors.",
        );
        console.error(e);
        return;
      }

      const edit = new vscode.WorkspaceEdit();
      const logOperations = [];

      // Analysis
      traverse(ast, {
        enter(path) {
          if (path.isVariableDeclaration()) {
            const declarations = path.node.declarations;
            declarations.forEach((decl) => {
              const varsToLog = [];

              // Handle destructuring
              if (decl.id.type === "Identifier") {
                varsToLog.push(decl.id.name);
              } else if (decl.id.type === "ObjectPattern") {
                decl.id.properties.forEach((prop) => {
                  if (
                    prop.type === "ObjectProperty" &&
                    prop.value.type === "Identifier"
                  ) {
                    varsToLog.push(prop.value.name);
                  } else if (
                    prop.type === "ObjectProperty" &&
                    prop.key.type === "Identifier" &&
                    prop.shorthand
                  ) {
                    varsToLog.push(prop.key.name);
                  }
                });
              } else if (decl.id.type === "ArrayPattern") {
                decl.id.elements.forEach((elem) => {
                  if (elem && elem.type === "Identifier") {
                    varsToLog.push(elem.name);
                  }
                });
              }

              if (varsToLog.length === 0) return;

              const insertLine = path.node.loc.end.line;
              const insertPos = new vscode.Position(insertLine, 0);

              varsToLog.forEach((varName) => {
                let inScope = false;

                if (!selection.isEmpty) {
                  const selectedText = document.getText(selection).trim();
                  if (varName === selectedText) {
                    inScope = true;
                  }
                } else {
                  const cursorLine = editor.selection.active.line;
                  const block = path.scope.block;
                  if (block.loc) {
                    const blockStart = block.loc.start.line - 1;
                    const blockEnd = block.loc.end.line - 1;

                    if (cursorLine >= blockStart && cursorLine <= blockEnd) {
                      inScope = true;
                    }
                  } else if (block.type === "Program") {
                    // Global scope
                    inScope = true;
                  }
                }

                if (!inScope) return;
                if (shouldSkipVariable(varName)) return;
                if (hasConsoleLogInScope(document, insertLine, varName)) return;

                const contextName = getContextName(path);
                const lineText = document.lineAt(insertLine - 1).text;
                const indent = lineText.match(/^\s*/)?.[0] || "";

                logOperations.push({
                  uri: document.uri,
                  position: insertPos,
                  contextName,
                  varName,
                  indent,
                });
              });
            });
          }
        },
      });

      if (logOperations.length === 0) {
        vscode.window.showInformationMessage("No variables found to log.");
        return;
      }

      // Generate and insert
      for (const op of logOperations) {
        const logStatement = await generateLogStatement(
          document,
          op.contextName,
          op.varName,
          op.indent,
        );
        edit.insert(op.uri, op.position, logStatement);
      }

      const success = await vscode.workspace.applyEdit(edit);
      if (!success) {
        vscode.window.showErrorMessage("Failed to insert logs.");
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
      insertConsoleLogs,
    ),
  );
}

// --- Helpers ---

function getContextName(path) {
  // Traverse up to find parent function/class
  let p = path.scope.path;
  const parts = [];

  while (p) {
    if (p.isFunctionDeclaration()) {
      if (p.node.id) parts.unshift(p.node.id.name);
    } else if (p.isClassMethod()) {
      if (p.node.key.type === "Identifier") parts.unshift(p.node.key.name);
    } else if (p.isVariableDeclarator()) {
      // const foo = () => {}
      if (p.node.id.type === "Identifier") parts.unshift(p.node.id.name);
    }

    p = p.parentPath;
    if (!p || p.isProgram()) break;
  }

  return parts.length > 0 ? parts.join(" > ") + " > " : "";
}

function shouldSkipVariable(varName) {
  if (varName.length <= 2) return true;
  if (["props", "context", "ref", "children"].includes(varName)) return true;
  if (varName.startsWith("_")) return true;
  if (varName === "undefined" || varName === "null") return true;
  return false;
}

function hasConsoleLogInScope(document, lineNumber, varName) {
  // Simple heuristic check in the next few lines?
  // Or just checking the immediate next line?
  // Let's check next 5 lines? or use document search?
  // The previous implementation searched the whole scope block.
  // We can simplify to just checking if a log exists nearby or if regex matches in file?
  // Let's trust the user or check if console.log(..., varName) is exactly after.

  // For safety/speed, let's just check if the next line already logs it.
  if (lineNumber < document.lineCount) {
    const nextLine = document.lineAt(lineNumber).text;
    if (nextLine.includes(`console.`) && nextLine.includes(varName))
      return true;
  }
  return false;
}

async function generateLogStatement(document, contextName, varName, indent) {
  const config = vscode.workspace.getConfiguration(
    "autoConsoleLogByVallarasuKanthasamy",
  );
  const logLevel = config.get("logLevel") || "info"; // log, info, warn, error
  const proConfig = config.get("pro") || {};

  // Check Pro status
  let isPro = false;
  try {
    const user = await extpay.getUser();
    isPro = user.paid;
  } catch {
    // console.error("Failed to check Pro status");
  }

  // Developer Bypass
  if (
    process.env.USER === "vallarasu" ||
    process.env.USERNAME === "vallarasu" ||
    process.env.AUTO_CONSOLE_LOG_DEV === "true"
  ) {
    isPro = true;
  }

  // Suffix to identify logs for removal
  const suffix = " // [ACL]\n";

  if (isPro) {
    // 1. Remote Logging
    if (proConfig.remoteLogUrl && proConfig.remoteLogUrl.trim() !== "") {
      const url = proConfig.remoteLogUrl.trim();
      const payload = `{
    file: "${document.fileName.replace(/\\/g, "\\\\\\\\")}",
    line: ${contextName ? '"' + contextName + '"' : "null"},
    var: "${varName}",
    value: ${varName},
    timestamp: new Date().toISOString()
}`;
      return `${indent}fetch('${url}', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(${payload}) }).catch(()=>{});${suffix}`;
    }

    // 2. Custom Templates
    if (proConfig.logTemplate && proConfig.logTemplate.trim() !== "") {
      let template = proConfig.logTemplate;
      template = template.replace(/{varName}/g, varName);
      template = template.replace(/{file}/g, document.fileName);
      template = template.replace(
        /{context}/g,
        contextName.replace(/ > $/, ""),
      );
      return `${indent}${template};${suffix}`;
    }
  }

  // Default Behavior
  const method = ["warn", "error"].includes(logLevel) ? logLevel : "log";
  return `${indent}console.${method}('${contextName}${varName} ---------------------------->', ${varName});${suffix}`;
}

/**
 * Get the range of the function/block scope containing the cursor position.
 * Improved brace matching using offset in full document text.
 */
function getFunctionScopeRange(document, position) {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Find start of scope by balancing braces backward
  let start = -1;
  let balance = 0;

  for (let i = offset; i >= 0; i--) {
    if (text[i] === "{") {
      balance--;
      if (balance < 0) {
        start = i;
        break;
      }
    } else if (text[i] === "}") {
      balance++;
    }
  }
  if (start === -1) return null;

  // Find end of scope by balancing braces forward
  let end = -1;
  balance = 1;
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === "{") balance++;
    else if (text[i] === "}") balance--;

    if (balance === 0) {
      end = i;
      break;
    }
  }

  if (end === -1) return null;

  return new vscode.Range(
    document.positionAt(start),
    document.positionAt(end + 1),
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
