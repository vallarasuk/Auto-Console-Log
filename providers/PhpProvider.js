const vscode = require("vscode");
const LogProvider = require("./LogProvider");

class PhpProvider extends LogProvider {
  async insertConsoleLogs(editor) {
    const document = editor.document;
    const code = document.getText();
    const selection = editor.selection;
    const logOperations = [];

    // PHP assignments: $var = ...
    const assignmentRegex = /(\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*=/g;

    let match;
    while ((match = assignmentRegex.exec(code)) !== null) {
      const varName = match[1]; // Includes $
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
      vscode.window.showInformationMessage("No variables found to log (PHP).");
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    for (const op of logOperations) {
      // Use error_log or echo? var_dump is common for debugging.
      // error_log is safer for server environments.
      // Let's use var_dump wrapped in pre for HTML output or just error_log?
      // Simple echo for now: echo "var: " . $var . "\n";
      // Or error_log: error_log("var: " . print_r($var, true));
      const logStatement = `${op.indent}error_log("${op.varName}: " . print_r(${op.varName}, true)); // [ACL]\n`;
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

module.exports = PhpProvider;
