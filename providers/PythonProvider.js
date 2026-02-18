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
    // Track (line, varName) to avoid duplicates
    const scheduled = new Set();

    // Regex for simple assignments: var = value (avoids ==, !=, <=, >=, +=, -=, etc.)
    // Uses negative lookbehind for [=!<>+\-*/%&|^] and negative lookahead for =
    const assignmentRegex = /^(\s*)([a-zA-Z_]\w*)\s*=[^=]/gm;

    // Regex for augmented assignments (+=, -=, etc.) — we still want to log these
    // Actually skip augmented assignments, they don't declare new variables

    // Regex for function definitions: def func(arg1, arg2: type = default):
    const functionRegex = /^(\s*)def\s+\w+\(([^)]*)\)\s*(?:->[^:]+)?:/gm;

    // Regex for 'for' loop variables: for x in ...: or for x, y in ...:
    const forLoopRegex =
      /^(\s*)for\s+([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s+in\s+/gm;

    // Regex for 'with' statement: with open(...) as f:
    const withRegex = /^(\s*)with\s+.+?\s+as\s+([a-zA-Z_]\w*)\s*:/gm;

    let match;

    // 1. Find simple assignments
    while ((match = assignmentRegex.exec(code)) !== null) {
      const baseIndent = match[1];
      const varName = match[2];
      const matchIndex = match.index;
      const position = document.positionAt(matchIndex);
      const line = document.lineAt(position.line);
      const insertLine = line.lineNumber + 1;

      this.addOperation(
        document,
        selection,
        varName,
        insertLine,
        baseIndent,
        logOperations,
        scheduled,
      );
    }

    // 2. Find function arguments
    while ((match = functionRegex.exec(code)) !== null) {
      const funcIndent = match[1];
      const argsParams = match[2];
      const matchIndex = match.index;
      const position = document.positionAt(matchIndex);
      const line = document.lineAt(position.line);
      // Insert at the first line of the function body
      const insertLine = line.lineNumber + 1;
      // Body indent = function indent + 4 spaces
      const bodyIndent = funcIndent + "    ";

      if (!argsParams.trim()) continue;

      const args = argsParams.split(",").map((arg) => {
        // Remove type hints (: Type) and defaults (= value) and strip whitespace
        return arg.split(":")[0].split("=")[0].trim();
      });

      args.forEach((arg) => {
        if (
          arg &&
          arg !== "self" &&
          arg !== "cls" &&
          arg !== "*" &&
          arg !== "**"
        ) {
          // Remove leading * or ** from *args/**kwargs
          const cleanArg = arg.replace(/^\*+/, "");
          if (cleanArg) {
            this.addOperation(
              document,
              selection,
              cleanArg,
              insertLine,
              bodyIndent,
              logOperations,
              scheduled,
            );
          }
        }
      });
    }

    // 3. Find for-loop variables
    while ((match = forLoopRegex.exec(code)) !== null) {
      const baseIndent = match[1];
      const varNames = match[2].split(",").map((v) => v.trim());
      const matchIndex = match.index;
      const position = document.positionAt(matchIndex);
      const line = document.lineAt(position.line);
      const insertLine = line.lineNumber + 1;
      const bodyIndent = baseIndent + "    ";

      varNames.forEach((varName) => {
        if (varName) {
          this.addOperation(
            document,
            selection,
            varName,
            insertLine,
            bodyIndent,
            logOperations,
            scheduled,
          );
        }
      });
    }

    // 4. Find 'with ... as var:' variables
    while ((match = withRegex.exec(code)) !== null) {
      const baseIndent = match[1];
      const varName = match[2];
      const matchIndex = match.index;
      const position = document.positionAt(matchIndex);
      const line = document.lineAt(position.line);
      const insertLine = line.lineNumber + 1;
      const bodyIndent = baseIndent + "    ";

      this.addOperation(
        document,
        selection,
        varName,
        insertLine,
        bodyIndent,
        logOperations,
        scheduled,
      );
    }

    if (logOperations.length === 0) {
      vscode.window.showInformationMessage(
        "No variables found to log (Python).",
      );
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    for (const op of logOperations) {
      const logStatement = this.generatePythonLog(op.indent, op.varName);
      edit.insert(op.uri, op.position, logStatement);
    }

    const success = await vscode.workspace.applyEdit(edit);
    if (!success) {
      vscode.window.showErrorMessage("Failed to insert logs.");
    }
  }

  addOperation(
    document,
    selection,
    varName,
    insertLine,
    indent,
    logOperations,
    scheduled,
  ) {
    if (this.shouldSkipVariable(varName)) return;

    let inScope = false;
    if (!selection.isEmpty) {
      const selectedText = document.getText(selection).trim();
      if (varName === selectedText) inScope = true;
    } else {
      inScope = true;
    }

    if (!inScope) return;

    // Check if valid line
    if (insertLine >= document.lineCount) return;

    // Deduplication
    const key = `${insertLine}:${varName}`;
    if (scheduled.has(key)) return;

    // Check if a print for this var already exists nearby
    if (this.hasPrintInScope(document, insertLine, varName)) return;

    scheduled.add(key);

    logOperations.push({
      uri: document.uri,
      position: new vscode.Position(insertLine, 0),
      varName,
      indent,
    });
  }

  generatePythonLog(indent, varName) {
    // Use # for Python comments (not //)
    return `${indent}print(f"${varName}: {${varName}}")  # [ACL]\n`;
  }

  /**
   * Check if a print statement for varName already exists within a few lines.
   */
  hasPrintInScope(document, lineNumber, varName) {
    const windowSize = 5;
    const end = Math.min(lineNumber + windowSize, document.lineCount);
    for (let i = lineNumber; i < end; i++) {
      const lineText = document.lineAt(i).text;
      if (lineText.includes("print(") && lineText.includes(varName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Python uses indentation for scope.
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   */
  getFunctionScopeRange(document, position) {
    const line = document.lineAt(position.line);
    const indentSize = (line.text.match(/^\s*/) || [""])[0].length;

    // Search upwards for a line with LESS indentation (the parent block)
    let startLine = -1;
    for (let i = position.line - 1; i >= 0; i--) {
      const currentLine = document.lineAt(i);
      if (currentLine.isEmptyOrWhitespace) continue;

      const currentIndent = (currentLine.text.match(/^\s*/) || [""])[0].length;
      if (currentIndent < indentSize && currentLine.text.trim().endsWith(":")) {
        startLine = i;
        break;
      }
    }

    if (startLine === -1) return null;

    // Search downwards for the end of the block
    let endLine = document.lineCount - 1;
    const parentIndent = (document.lineAt(startLine).text.match(/^\s*/) || [
      "",
    ])[0].length;

    for (let i = startLine + 1; i < document.lineCount; i++) {
      const currentLine = document.lineAt(i);
      if (currentLine.isEmptyOrWhitespace) continue;

      const currentIndent = (currentLine.text.match(/^\s*/) || [""])[0].length;
      if (currentIndent <= parentIndent) {
        endLine = i - 1;
        break;
      }
    }

    return new vscode.Range(
      new vscode.Position(startLine, 0),
      new vscode.Position(endLine, 1000),
    );
  }
}

module.exports = PythonProvider;
