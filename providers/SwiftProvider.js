const vscode = require("vscode");
const LogProvider = require("./LogProvider");
const { generateLogStatement } = require("../extension");

class SwiftProvider extends LogProvider {
  /**
   * @param {vscode.TextEditor} editor
   */
  async insertConsoleLogs(editor) {
    const document = editor.document;
    const code = document.getText();
    const selection = editor.selection;
    const logOperations = [];
    const scheduled = new Set();

    // Swift: var x = ..., let x = ..., var x: Type = ..., let x: Type = ...
    const declRegex =
      /^\s*(?:(?:private|public|internal|fileprivate|open|static|class|lazy|weak|unowned|override|final|mutating|nonmutating)\s+)*(?:var|let)\s+([a-zA-Z_]\w*)(?:\s*:\s*[^=\n{]+?)?\s*(?:=|{)/gm;

    // Guard let / if let: guard let x = ..., if let x = ...
    const guardLetRegex = /\b(?:guard|if)\s+let\s+([a-zA-Z_]\w*)\s*=/gm;

    // For-in loop: for item in collection
    const forInRegex = /\bfor\s+([a-zA-Z_]\w*)\s+in\b/gm;

    let match;

    // 1. var/let declarations
    while ((match = declRegex.exec(code)) !== null) {
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

    // 2. guard let / if let
    while ((match = guardLetRegex.exec(code)) !== null) {
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

    // 3. for-in loop variables
    while ((match = forInRegex.exec(code)) !== null) {
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

    if (logOperations.length === 0) {
      vscode.window.showInformationMessage(
        "No variables found to log (Swift).",
      );
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
    if (this.shouldSkipVariable(varName)) return;
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
      if (lineText.includes("print(") && lineText.includes(varName)) return;
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
    return `${indent}print("${varName}: \\(${varName})") // [ACL]\n`;
  }
}

module.exports = SwiftProvider;
