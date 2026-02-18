const vscode = require("vscode");
const LogProvider = require("./LogProvider");

class PhpProvider extends LogProvider {
  async insertConsoleLogs(editor) {
    const document = editor.document;
    const code = document.getText();
    const selection = editor.selection;
    const logOperations = [];
    const scheduled = new Set();

    // PHP variable assignments: $varName = value (not ==)
    // PHP variables always start with $
    const assignmentRegex =
      /(\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*=[^=]/gm;

    // PHP function parameters: function foo($a, $b = 'default', ...$rest)
    const functionRegex = /function\s+\w+\s*\(([^)]*)\)\s*(?::\s*\w+\s*)?\{/gm;

    // PHP foreach: foreach ($array as $key => $value) or foreach ($array as $value)
    const foreachRegex =
      /\bforeach\s*\(\s*\S+\s+as\s+(?:(\$[a-zA-Z_]\w*)\s*=>\s*)?(\$[a-zA-Z_]\w*)\s*\)/gm;

    let match;

    // 1. Variable assignments
    while ((match = assignmentRegex.exec(code)) !== null) {
      const varName = match[1]; // Includes $
      const position = document.positionAt(match.index);
      const line = document.lineAt(position.line);
      const insertLine = line.lineNumber + 1;

      this.addOperation(
        document,
        selection,
        varName,
        insertLine,
        logOperations,
        scheduled,
      );
    }

    // 2. Function parameters
    while ((match = functionRegex.exec(code)) !== null) {
      const argsStr = match[1];
      const position = document.positionAt(match.index);
      const line = document.lineAt(position.line);
      const insertLine = line.lineNumber + 1;

      if (!argsStr.trim()) continue;

      const args = argsStr
        .split(",")
        .map((arg) => {
          // Extract $varName, ignoring type hints and defaults
          const paramMatch = arg.match(/(\$[a-zA-Z_]\w*)/);
          return paramMatch ? paramMatch[1] : null;
        })
        .filter(Boolean);

      args.forEach((varName) => {
        this.addOperation(
          document,
          selection,
          varName,
          insertLine,
          logOperations,
          scheduled,
        );
      });
    }

    // 3. Foreach variables
    while ((match = foreachRegex.exec(code)) !== null) {
      const position = document.positionAt(match.index);
      const line = document.lineAt(position.line);
      const insertLine = line.lineNumber + 1;

      // Key (optional)
      if (match[1]) {
        this.addOperation(
          document,
          selection,
          match[1],
          insertLine,
          logOperations,
          scheduled,
        );
      }
      // Value
      if (match[2]) {
        this.addOperation(
          document,
          selection,
          match[2],
          insertLine,
          logOperations,
          scheduled,
        );
      }
    }

    if (logOperations.length === 0) {
      vscode.window.showInformationMessage("No variables found to log (PHP).");
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    for (const op of logOperations) {
      const logStatement = `${op.indent}error_log("${op.varName}: " . print_r(${op.varName}, true)); // [ACL]\n`;
      edit.insert(op.uri, op.position, logStatement);
    }

    await vscode.workspace.applyEdit(edit);
  }

  addOperation(
    document,
    selection,
    varName,
    insertLine,
    logOperations,
    scheduled,
  ) {
    // PHP vars start with $, skip base shouldSkipVariable for the $ prefix check
    if (!varName || varName.length <= 1) return;
    if (insertLine >= document.lineCount) return;

    let inScope = false;
    if (!selection.isEmpty) {
      const selectedText = document.getText(selection).trim();
      if (varName === selectedText) inScope = true;
    } else {
      inScope = true;
    }
    if (!inScope) return;

    const key = `${insertLine}:${varName}`;
    if (scheduled.has(key)) return;

    // Check if log already exists nearby
    const windowSize = 3;
    const end = Math.min(insertLine + windowSize, document.lineCount);
    for (let i = insertLine; i < end; i++) {
      const lineText = document.lineAt(i).text;
      if (lineText.includes("error_log(") && lineText.includes(varName)) return;
    }

    scheduled.add(key);

    const lineText = document.lineAt(insertLine - 1).text;
    const indent = lineText.match(/^\s*/)?.[0] || "";

    logOperations.push({
      uri: document.uri,
      position: new vscode.Position(insertLine, 0),
      varName,
      indent,
    });
  }
}

module.exports = PhpProvider;
