const vscode = require("vscode");
const LogProvider = require("./LogProvider");

class PhpProvider extends LogProvider {
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

    const assignmentRegex = /(\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*=[^=]/gm;
    const functionRegex = /function\s+\w+\s*\(([^)]*)\)\s*(?::\s*\w+\s*)?\{/gm;
    const foreachRegex = /\bforeach\s*\(\s*\S+\s+as\s+(?:(\$[a-zA-Z_]\w*)\s*=>\s*)?(\$[a-zA-Z_]\w*)\s*\)/gm;

    let match;
    while ((match = assignmentRegex.exec(code)) !== null) {
      this.addOperation(document, selection, match[1], document.positionAt(match.index).line + 1, logOperations, scheduled, document.positionAt(match.index).line);
    }
    while ((match = functionRegex.exec(code)) !== null) {
      const lineNum = document.positionAt(match.index).line;
      if (!match[1].trim()) continue;
      match[1].split(",").map(arg => { const m = arg.match(/(\$[a-zA-Z_]\w*)/); return m ? m[1] : null; }).filter(Boolean).forEach(varName => {
        this.addOperation(document, selection, varName, lineNum + 1, logOperations, scheduled, lineNum);
      });
    }
    while ((match = foreachRegex.exec(code)) !== null) {
      const lineNum = document.positionAt(match.index).line;
      if (match[1]) this.addOperation(document, selection, match[1], lineNum + 1, logOperations, scheduled, lineNum);
      if (match[2]) this.addOperation(document, selection, match[2], lineNum + 1, logOperations, scheduled, lineNum);
    }

    if (logOperations.length === 0) return;

    const edit = new vscode.WorkspaceEdit();
    for (const op of logOperations) {
      const logStatement = await generateLogStatement(document, "", op.varName, op.indent, op.declarationLine);
      edit.insert(op.uri, op.position, logStatement);
    }
    await vscode.workspace.applyEdit(edit);
  }

  addOperation(document, selection, varName, insertLine, logOperations, scheduled, declarationLine) {
    const resolvedInsertLine = this.resolveInsertLine(document, declarationLine);
    if (!varName || varName.length <= 1 || resolvedInsertLine >= document.lineCount) return;
    if (!selection.isEmpty && varName !== document.getText(selection).trim()) return;

    const key = `${resolvedInsertLine}:${varName}`;
    if (scheduled.has(key)) return;

    const end = Math.min(resolvedInsertLine + 3, document.lineCount);
    for (let i = resolvedInsertLine; i < end; i++) {
        if (document.lineAt(i).text.includes("error_log(") && document.lineAt(i).text.includes(varName)) return;
    }
    if (this.hasNearbyLog(document, resolvedInsertLine, varName, ["error_log("])) return;

    scheduled.add(key);
    const indent = this.getIndentForDeclaration(document, declarationLine, resolvedInsertLine);
    logOperations.push({ uri: document.uri, position: new vscode.Position(resolvedInsertLine, 0), varName, indent, declarationLine });
  }
}

module.exports = PhpProvider;
