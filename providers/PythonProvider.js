const vscode = require("vscode");
const LogProvider = require("./LogProvider");

class PythonProvider extends LogProvider {
  /**
   * @param {vscode.TextEditor} editor
   * @param {Function} generateLogStatement
   */
  async insertConsoleLogs(editor, generateLogStatement) {
    const document = editor.document;
    const code = document.getText();
    const selection = editor.selection;

    const logOperations = [];
    const scheduled = new Set();

    const assignmentRegex = /^(\s*)([a-zA-Z_]\w*)\s*=[^=]/gm;
    const functionRegex = /^(\s*)def\s+\w+\(([^)]*)\)\s*(?:->[^:]+)?:/gm;
    const forLoopRegex = /^(\s*)for\s+([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s+in\s+/gm;
    const withRegex = /^(\s*)with\s+.+?\s+as\s+([a-zA-Z_]\w*)\s*:/gm;

    let match;

    while ((match = assignmentRegex.exec(code)) !== null) {
      this.addOperation(document, selection, match[2], document.positionAt(match.index).line + 1, match[1], logOperations, scheduled, document.positionAt(match.index).line);
    }

    while ((match = functionRegex.exec(code)) !== null) {
      const funcIndent = match[1];
      const argsParams = match[2];
      const lineNum = document.positionAt(match.index).line;
      const bodyIndent = funcIndent + "    ";

      if (!argsParams.trim()) continue;

      argsParams.split(",").map(arg => arg.split(":")[0].split("=")[0].trim()).forEach(arg => {
        if (arg && !["self", "cls", "*", "**"].includes(arg)) {
          const cleanArg = arg.replace(/^\*+/, "");
          if (cleanArg) {
            this.addOperation(document, selection, cleanArg, lineNum + 1, bodyIndent, logOperations, scheduled, lineNum);
          }
        }
      });
    }

    while ((match = forLoopRegex.exec(code)) !== null) {
      const lineNum = document.positionAt(match.index).line;
      match[2].split(",").map(v => v.trim()).forEach(varName => {
        if (varName) this.addOperation(document, selection, varName, lineNum + 1, match[1] + "    ", logOperations, scheduled, lineNum);
      });
    }

    while ((match = withRegex.exec(code)) !== null) {
      const lineNum = document.positionAt(match.index).line;
      this.addOperation(document, selection, match[2], lineNum + 1, match[1] + "    ", logOperations, scheduled, lineNum);
    }

    if (logOperations.length === 0) return;

    const edit = new vscode.WorkspaceEdit();
    for (const op of logOperations) {
      const logStatement = await generateLogStatement(document, "", op.varName, op.indent, op.declarationLine);
      edit.insert(op.uri, op.position, logStatement);
    }
    await vscode.workspace.applyEdit(edit);
  }

  addOperation(document, selection, varName, insertLine, indent, logOperations, scheduled, declarationLine) {
    if (this.shouldSkipVariable(varName) || insertLine >= document.lineCount) return;
    if (!selection.isEmpty && varName !== document.getText(selection).trim()) return;

    const key = `${insertLine}:${varName}`;
    if (scheduled.has(key) || this.hasPrintInScope(document, insertLine, varName)) return;

    scheduled.add(key);
    logOperations.push({ uri: document.uri, position: new vscode.Position(insertLine, 0), varName, indent, declarationLine });
  }

  hasPrintInScope(document, lineNumber, varName) {
    const end = Math.min(lineNumber + 5, document.lineCount);
    for (let i = lineNumber; i < end; i++) {
      const text = document.lineAt(i).text;
      if (text.includes("print(") && text.includes(varName)) return true;
    }
    return false;
  }
}

module.exports = PythonProvider;
