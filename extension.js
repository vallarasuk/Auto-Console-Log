const vscode = require("vscode");
const ExtPay = require("./lib/extpay-vscode");
const JsTsProvider = require("./providers/JsTsProvider");

// Global ExtPay instance
const extpay = ExtPay("auto-console-log-by-vallarasu-kanthasamy");

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
};

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
      const languageId = document.languageId;
      const provider = providers[languageId];

      if (!provider) {
        // Fallback removal for unsupported languages?
        // We can use a generic removal if we assume standard log formats or user-defined formats.
        // For now, let's allow it if we know the language specific log format or just generic cleanup?
        // Actually, let's keep it consistent: only support removal if we support the language OR if we add a GenericProvider.
        vscode.window.showInformationMessage(
          `Log removal not fully supported for ${languageId} yet.`,
        );
        return;
      }

      const edit = new vscode.WorkspaceEdit();
      const logsToRemove = [];

      // Determine scope for removal
      const cursorPosition = editor.selection.active;
      // Use provider's scope detection
      const scopeRange = provider.getFunctionScopeRange(
        document,
        cursorPosition,
      );

      const isGlobal = !scopeRange;
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

// Helper: Generate Log Statement (Shared)
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
        contextName ? contextName.replace(/ > $/, "") : "",
      );
      return `${indent}${template};${suffix}`;
    }
  }

  // Default Behavior
  const method = ["warn", "error"].includes(logLevel) ? logLevel : "log";
  // Note: Some languages (python) might not use 'console.log'.
  // We might need to delegate this generation to the provider or make it language-aware if it's not generic 'console.log'
  // For JS/TS, this is fine. For others, we need logic.
  // FIXME: Move log generation string construction to Provider or make this function language-aware?
  // Current refactor only affects logic flow. `JsTsProvider` calls this.
  return `${indent}console.${method}('${contextName}${varName} ---------------------------->', ${varName});${suffix}`;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
