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

    // Regex for variable assignments: var = value
    // Regex for function arguments: def func(arg1, arg2):
    // Simplified regex approach
    const assignmentRegex = /\b([a-zA-Z_]\w*)\s*=/g;
    const functionRegex = /def\s+\w+\(([^)]+)\)/g;

    let match;

    // 1. Find assignments
    while ((match = assignmentRegex.exec(code)) !== null) {
      const varName = match[1];
      const matchIndex = match.index;
      const position = document.positionAt(matchIndex);
      // Insert after the current line
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

    // 2. Find function arguments
    while ((match = functionRegex.exec(code)) !== null) {
      const argsParams = match[1];
      const matchIndex = match.index;
      // Split args by comma, ignore defaults (=) and type hints (:)
      // This is tricky with regex. Simple split by ',' might work for simple cases.
      const args = argsParams.split(",").map((arg) => {
        // Remove type hints and defaults
        return arg.split(":")[0].split("=")[0].trim();
      });

      const position = document.positionAt(matchIndex);
      const line = document.lineAt(position.line);
      const insertLine = line.lineNumber + 1; // Assuming function body starts next line

      args.forEach((arg) => {
        if (arg && arg !== "self" && arg !== "cls") {
          this.addOperation(
            document,
            selection,
            arg,
            insertLine,
            logOperations,
          );
        }
      });
    }

    if (logOperations.length === 0) {
      vscode.window.showInformationMessage(
        "No variables found to log (Python).",
      );
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    for (const op of logOperations) {
      // Custom python log generation?
      // For now using the generic one which produces console.log.
      // We need to override log generation or pass a custom one?
      // The current shared generateLogStatement assumes console.log.
      // We should probably adapt it or produce the string here.

      // Let's create a python specific log statement here
      const logStatement = this.generatePythonLog(op.indent, op.varName);
      edit.insert(op.uri, op.position, logStatement);
    }

    const success = await vscode.workspace.applyEdit(edit);
    if (!success) {
      vscode.window.showErrorMessage("Failed to insert logs.");
    }
  }

  addOperation(document, selection, varName, insertLine, logOperations) {
    if (this.shouldSkipVariable(varName)) return;

    let inScope = false;
    if (!selection.isEmpty) {
      const selectedText = document.getText(selection).trim();
      if (varName === selectedText) inScope = true;
    } else {
      // Basic scope check: is cursor near?
      // For Python, "Global" means file level.
      // If cursor is in the same function block?
      // Regex doesn't easily give us function blocks.
      // Let's default: if no selection, add all found vars?
      // Or checks if cursor is in the same document (Global).
      inScope = true;
    }

    if (!inScope) return;

    // Check if valid line
    if (insertLine >= document.lineCount) return;

    const lineText = document.lineAt(insertLine - 1).text; // Line where var is defined
    // Indent should match the NEXT line (where we insert), or the current line?
    // In Python, if we define 'def foo():', the next line body has indent.
    // If we have 'x = 1', next line has same indent.

    // Simple heuristic: take indent of the definition line.
    // If it's a function def, we might need to add indentation.
    let indent = lineText.match(/^\s*/)?.[0] || "";

    // If previous line ends with ':', likely need to increase indent
    if (lineText.trim().endsWith(":")) {
      indent += "    "; // Assume 4 spaces? or detect?
    }

    logOperations.push({
      uri: document.uri,
      position: new vscode.Position(insertLine, 0),
      varName,
      indent,
    });
  }

  shouldSkipVariable(varName) {
    return varName.startsWith("_");
  }

  generatePythonLog(indent, varName) {
    return `${indent}print(f"${varName}: {${varName}}") // [ACL]\n`;
  }
}

module.exports = PythonProvider;
