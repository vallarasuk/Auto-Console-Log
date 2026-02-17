const vscode = require("vscode");
const LogProvider = require("./LogProvider");

class GoProvider extends LogProvider {
  async insertConsoleLogs(editor) {
    const document = editor.document;
    const code = document.getText();
    const selection = editor.selection;
    const logOperations = [];

    // Go declarations: var x = ..., x := ...
    const declRegex = /\bvar\s+([a-zA-Z_]\w*)\s+=/g;
    const shortDeclRegex = /\b([a-zA-Z_]\w*)\s*:=/g;

    const regexes = [declRegex, shortDeclRegex];

    for (const regex of regexes) {
      let match;
      while ((match = regex.exec(code)) !== null) {
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
    }

    if (logOperations.length === 0) {
      vscode.window.showInformationMessage("No variables found to log (Go).");
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    for (const op of logOperations) {
      const logStatement = `${op.indent}fmt.Printf("${op.varName}: %+v\\n", ${op.varName}) // [ACL]\n`;
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

module.exports = GoProvider;
