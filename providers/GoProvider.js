const vscode = require("vscode");
const LogProvider = require("./LogProvider");

class GoProvider extends LogProvider {
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

    const varDeclRegex = /^\s*var\s+([a-zA-Z_]\w*)\s+/gm;
    const shortDeclRegex = /^\s*((?:[a-zA-Z_]\w*\s*,\s*)*[a-zA-Z_]\w*)\s*:=/gm;
    const forRangeRegex = /\bfor\s+((?:[a-zA-Z_]\w*\s*,\s*)*[a-zA-Z_]\w*)\s*:=\s*range\b/gm;

    let match;
    while ((match = varDeclRegex.exec(code)) !== null) {
      this.addOperation(document, selection, match[1], document.positionAt(match.index).line + 1, logOperations, scheduled, document.positionAt(match.index).line);
    }
    while ((match = shortDeclRegex.exec(code)) !== null) {
      const lineNum = document.positionAt(match.index).line;
      match[1].split(",").map(v => v.trim()).filter(Boolean).forEach(varName => {
        if (varName !== "_") this.addOperation(document, selection, varName, lineNum + 1, logOperations, scheduled, lineNum);
      });
    }
    while ((match = forRangeRegex.exec(code)) !== null) {
      const lineNum = document.positionAt(match.index).line;
      match[1].split(",").map(v => v.trim()).filter(Boolean).forEach(varName => {
        if (varName !== "_") this.addOperation(document, selection, varName, lineNum + 1, logOperations, scheduled, lineNum);
      });
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
    if (this.shouldSkipVariable(varName) || insertLine >= document.lineCount) return;
    if (!selection.isEmpty && varName !== document.getText(selection).trim()) return;

    const key = `${insertLine}:${varName}`;
    if (scheduled.has(key)) return;

    const end = Math.min(insertLine + 3, document.lineCount);
    for (let i = insertLine; i < end; i++) {
        if (document.lineAt(i).text.includes("fmt.Print") && document.lineAt(i).text.includes(varName)) return;
    }

    scheduled.add(key);
    const indent = document.lineAt(insertLine - 1).text.match(/^\s*/)?.[0] || "";
    logOperations.push({ uri: document.uri, position: new vscode.Position(insertLine, 0), varName, indent, declarationLine });
  }
}

module.exports = GoProvider;
