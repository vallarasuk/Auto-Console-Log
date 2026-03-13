const vscode = require("vscode");
const LogProvider = require("./LogProvider");

const JAVA_KEYWORDS = new Set([
  "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const", "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float", "for", "goto", "if", "implements", "import", "instanceof", "int", "interface", "long", "native", "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp", "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void", "volatile", "while", "true", "false", "null", "String", "Object", "System", "Integer", "Long", "Double", "Float", "Boolean", "Character", "Byte", "Short", "Number", "Math", "Arrays", "ArrayList", "List", "Map", "HashMap", "Set", "HashSet"
]);

class JavaProvider extends LogProvider {
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

    const typedDeclRegex = /^\s*(?:(?:final|static|private|public|protected|volatile|transient|synchronized|native|strictfp)\s+)*(?:(?:int|long|short|byte|float|double|boolean|char)|(?:[A-Z][a-zA-Z0-9_]*(?:<[^>]*>)?(?:\[\])*))\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|;)/gm;
    const reassignRegex = /^\s*([a-z_][a-zA-Z0-9_]*)\s*=(?![=><])/gm;

    let match;
    while ((match = typedDeclRegex.exec(code)) !== null) {
      this.addOperation(document, selection, match[1], document.positionAt(match.index).line + 1, logOperations, scheduled, document.positionAt(match.index).line);
    }
    while ((match = reassignRegex.exec(code)) !== null) {
      this.addOperation(document, selection, match[1], document.positionAt(match.index).line + 1, logOperations, scheduled, document.positionAt(match.index).line);
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
    if (this.shouldSkipVariable(varName) || JAVA_KEYWORDS.has(varName) || insertLine >= document.lineCount) return;
    if (!selection.isEmpty && varName !== document.getText(selection).trim()) return;

    const key = `${insertLine}:${varName}`;
    if (scheduled.has(key)) return;

    const end = Math.min(insertLine + 3, document.lineCount);
    for (let i = insertLine; i < end; i++) {
        if (document.lineAt(i).text.includes("System.out.") && document.lineAt(i).text.includes(varName)) return;
    }

    scheduled.add(key);
    const indent = document.lineAt(insertLine - 1).text.match(/^\s*/)?.[0] || "";
    logOperations.push({ uri: document.uri, position: new vscode.Position(insertLine, 0), varName, indent, declarationLine });
  }
}

module.exports = JavaProvider;
