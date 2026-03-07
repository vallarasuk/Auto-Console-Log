const vscode = require("vscode");
const LogProvider = require("./LogProvider");
const { generateLogStatement } = require("../extension");

class PhpProvider extends LogProvider {
  async insertConsoleLogs(editor) {
    const document = editor.document;
    const code = document.getText();
    const selection = editor.selection;
    const logOperations = [];
    const scheduled = new Set();

    // PHP variable assignments
    const assignmentRegex =
      /(\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*=[^=]/gm;

    // PHP function parameters
    const functionRegex = /function\s+\w+\s*\(([^)]*)\)\s*(?::\s*\w+\s*)?\{/gm;

    // PHP foreach
    const foreachRegex =
      /\bforeach\s*\(\s*\S+\s+as\s+(?:(\$[a-zA-Z_]\w*)\s*=>\s*)?(\$[a-zA-Z_]\w*)\s*\)/gm;

    let match;

    // 1. Variable assignments
    while ((match = assignmentRegex.exec(code)) !== null) {
      const varName = match[1];
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
        line.lineNumber,
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
          line.lineNumber,
        );
      });
    }

    // 3. Foreach variables
    while ((match = foreachRegex.exec(code)) !== null) {
      const position = document.positionAt(match.index);
      const line = document.lineAt(position.line);
      const insertLine = line.lineNumber + 1;

      if (match[1]) {
        this.addOperation(
          document,
          selection,
          match[1],
          insertLine,
          logOperations,
          scheduled,
          line.lineNumber,
        );
      }
      if (match[2]) {
        this.addOperation(
          document,
          selection,
          match[2],
          insertLine,
          logOperations,
          scheduled,
          line.lineNumber,
        );
      }
    }

    if (logOperations.length === 0) {
      vscode.window.showInformationMessage("No variables found to log (PHP).");
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    for (const op of logOperations) {
      const logStatement = await generateLogStatement(
        document,
        "",
        op.varName,
        op.indent,
        op.declarationLine,
      );
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
    declarationLine,
  ) {
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
      declarationLine,
    });
  }

  getLogStatement(varName, indent) {
    return `${indent}error_log("${varName}: " . print_r(${varName}, true)); // [ACL]\n`;
  }
}

module.exports = PhpProvider;
