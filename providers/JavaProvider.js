const vscode = require("vscode");
const LogProvider = require("./LogProvider");

// Java keywords that should never be treated as variable names
const JAVA_KEYWORDS = new Set([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "final",
  "finally",
  "float",
  "for",
  "goto",
  "if",
  "implements",
  "import",
  "instanceof",
  "int",
  "interface",
  "long",
  "native",
  "new",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "try",
  "void",
  "volatile",
  "while",
  "true",
  "false",
  "null",
  "String",
  "Object",
  "System",
  "Integer",
  "Long",
  "Double",
  "Float",
  "Boolean",
  "Character",
  "Byte",
  "Short",
  "Number",
  "Math",
  "Arrays",
  "ArrayList",
  "List",
  "Map",
  "HashMap",
  "Set",
  "HashSet",
]);

class JavaProvider extends LogProvider {
  /**
   * @param {vscode.TextEditor} editor
   */
  async insertConsoleLogs(editor) {
    const document = editor.document;
    const code = document.getText();
    const selection = editor.selection;
    const logOperations = [];
    const scheduled = new Set();

    // Match typed declarations: Type varName = ...  or  Type varName;
    // Handles primitives (int, long, double, float, boolean, char, byte, short)
    // and class types (String, List<T>, etc.) with optional modifiers.
    const typedDeclRegex =
      /^\s*(?:(?:final|static|private|public|protected|volatile|transient|synchronized|native|strictfp)\s+)*(?:(?:int|long|short|byte|float|double|boolean|char)|(?:[A-Z][a-zA-Z0-9_]*(?:<[^>]*>)?(?:\[\])*))\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|;)/gm;

    // Also catch simple reassignments: varName = value; (not ==, !=, <=, >=, +=, etc.)
    const reassignRegex = /^\s*([a-z_][a-zA-Z0-9_]*)\s*=(?![=><])/gm;

    let match;

    // 1. Typed declarations (most reliable)
    while ((match = typedDeclRegex.exec(code)) !== null) {
      const varName = match[1];
      if (JAVA_KEYWORDS.has(varName)) continue;

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
      );
    }

    // 2. Reassignments (only if not already scheduled)
    while ((match = reassignRegex.exec(code)) !== null) {
      const varName = match[1];
      if (JAVA_KEYWORDS.has(varName)) continue;

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

  addOperation(
    document,
    selection,
    varName,
    insertLine,
    logOperations,
    scheduled,
  ) {
    if (this.shouldSkipVariable(varName)) return;
    if (JAVA_KEYWORDS.has(varName)) return;
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
      if (lineText.includes("System.out.") && lineText.includes(varName))
        return;
    }

    scheduled.add(key);

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
