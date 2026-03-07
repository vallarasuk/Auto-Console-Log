const vscode = require("vscode");
const LogProvider = require("./LogProvider");
const { generateLogStatement } = require("../extension");

class GoProvider extends LogProvider {
  async insertConsoleLogs(editor) {
    const document = editor.document;
    const code = document.getText();
    const selection = editor.selection;
    const logOperations = [];
    const scheduled = new Set();

    // var x = ... or var x int = ...
    const varDeclRegex = /^\s*var\s+([a-zA-Z_]\w*)\s+/gm;

    // Short declarations: x := ... or x, y := ...
    const shortDeclRegex = /^\s*((?:[a-zA-Z_]\w*\s*,\s*)*[a-zA-Z_]\w*)\s*:=/gm;

    // For-range: for k, v := range ...
    const forRangeRegex =
      /\bfor\s+((?:[a-zA-Z_]\w*\s*,\s*)*[a-zA-Z_]\w*)\s*:=\s*range\b/gm;

    let match;

    // 1. var declarations
    while ((match = varDeclRegex.exec(code)) !== null) {
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

    // 2. Short declarations
    while ((match = shortDeclRegex.exec(code)) !== null) {
      const varNames = match[1]
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const position = document.positionAt(match.index);
      const line = document.lineAt(position.line);
      const insertLine = line.lineNumber + 1;

      varNames.forEach((varName) => {
        if (varName !== "_") {
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
      });
    }

    // 3. For-range variables
    while ((match = forRangeRegex.exec(code)) !== null) {
      const varNames = match[1]
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const position = document.positionAt(match.index);
      const line = document.lineAt(position.line);
      const insertLine = line.lineNumber + 1;

      varNames.forEach((varName) => {
        if (varName !== "_") {
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
      });
    }

    if (logOperations.length === 0) {
      vscode.window.showInformationMessage("No variables found to log (Go).");
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
      if (lineText.includes("fmt.Print") && lineText.includes(varName)) return;
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
    return `${indent}fmt.Printf("${varName}: %+v\\n", ${varName}) // [ACL]\n`;
  }
}

module.exports = GoProvider;
