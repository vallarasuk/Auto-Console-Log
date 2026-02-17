const vscode = require("vscode");
const LogProvider = require("./LogProvider");

class SwiftProvider extends LogProvider {
  /**
   * @param {vscode.TextEditor} editor
   */
  async insertConsoleLogs(editor) {
    const document = editor.document;
    const code = document.getText();
    const selection = editor.selection;
    const logOperations = [];

    // Swift: var x = ..., let x = ...
    const declRegex = /\b(?:var|let)\s+([a-zA-Z_]\w*)\s*=/g;

    let match;
    while ((match = declRegex.exec(code)) !== null) {
      const varName = match[1];
      const matchIndex = match.index;

      this.addOperation(
        document,
        selection,
        varName,
        matchIndex,
        logOperations,
      );
    }

    if (logOperations.length === 0) {
      vscode.window.showInformationMessage(
        "No variables found to log (Swift).",
      );
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    for (const op of logOperations) {
      // print("var: \(var)")
      const logStatement = `${op.indent}print("${op.varName}: \\(${op.varName})") // [ACL]\n`;
      edit.insert(op.uri, op.position, logStatement);
    }

    await vscode.workspace.applyEdit(edit);
  }

  addOperation(document, selection, varName, matchIndex, logOperations) {
    if (this.shouldSkipVariable(varName)) return;

    const position = document.positionAt(matchIndex);
    const line = document.lineAt(position.line);
    const insertLine = line.lineNumber + 1;

    if (insertLine >= document.lineCount) return;

    let inScope = false;
    if (!selection.isEmpty) {
      const selectedText = document.getText(selection).trim();
      if (varName === selectedText) inScope = true;
    } else {
      inScope = true;
    }

    if (!inScope) return;

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

module.exports = SwiftProvider;
