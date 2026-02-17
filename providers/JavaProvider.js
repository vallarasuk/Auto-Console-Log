const vscode = require("vscode");
const LogProvider = require("./LogProvider");

class JavaProvider extends LogProvider {
  /**
   * @param {vscode.TextEditor} editor
   */
  async insertConsoleLogs(editor) {
    const document = editor.document;
    const code = document.getText();
    const selection = editor.selection;
    const logOperations = [];

    // Assignments: Type var = val; or var = val;
    // Regex: \b(?:[a-zA-Z_]\w+\s+)?([a-zA-Z_]\w*)\s*=
    const assignmentRegex = /\b(?:[a-zA-Z_]\w+\s+)?([a-zA-Z_]\w*)\s*=/g;

    let match;
    while ((match = assignmentRegex.exec(code)) !== null) {
      const varName = match[1];
      const matchIndex = match.index;
      const position = document.positionAt(matchIndex);
      const line = document.lineAt(position.line);
      const insertLine = line.lineNumber + 1;

      this.addOperation(
        document,
        selection,
        varName,
        insertLine,
        logOperations,
      );
    }

    if (logOperations.length === 0) {
      vscode.window.showInformationMessage("No variables found to log (Java).");
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    for (const op of logOperations) {
      const logStatement = `${op.indent}System.out.println("${op.varName}: " + ${op.varName}); // [ACL]\n`;
      edit.insert(op.uri, op.position, logStatement);
    }

    await vscode.workspace.applyEdit(edit);
  }

  addOperation(document, selection, varName, insertLine, logOperations) {
    if (insertLine >= document.lineCount) return;
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

module.exports = JavaProvider;
