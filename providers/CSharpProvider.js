const vscode = require("vscode");
const LogProvider = require("./LogProvider");

const CSHARP_KEYWORDS = new Set([
  "abstract", "as", "base", "bool", "break", "byte", "case", "catch", "char", "checked", "class", "const", "continue", "decimal", "default", "delegate", "do", "double", "else", "enum", "event", "explicit", "extern", "false", "finally", "fixed", "float", "for", "foreach", "goto", "if", "implicit", "in", "int", "interface", "internal", "is", "lock", "long", "namespace", "new", "null", "object", "operator", "out", "override", "params", "private", "protected", "public", "readonly", "ref", "return", "sbyte", "sealed", "short", "sizeof", "stackalloc", "static", "string", "struct", "switch", "this", "throw", "true", "try", "typeof", "uint", "ulong", "unchecked", "unsafe", "ushort", "using", "virtual", "void", "volatile", "while", "var", "dynamic", "async", "await", "yield", "partial", "get", "set", "add", "remove", "value", "global", "where", "select", "from", "join", "String", "Object", "Boolean", "Int32", "Int64", "Double", "Single", "Decimal", "Char", "Byte", "Short", "Number", "Math", "Array", "List", "Dictionary", "Task", "Exception", "Type", "Enum", "Nullable"
]);

class CSharpProvider extends LogProvider {
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

    const typedDeclRegex = /^\s*(?:(?:readonly|static|private|public|protected|internal|override|virtual|sealed|abstract|const|volatile)\s+)*(?:var|[A-Za-z][a-zA-Z0-9_]*(?:<[^>]*>)?(?:\[\])*\??)\s+([a-z_][a-zA-Z0-9_]*)\s*(?:=|;)/gm;
    const foreachRegex = /\bforeach\s*\(\s*(?:var|[A-Za-z][a-zA-Z0-9_<>\[\]]*)\s+([a-z_][a-zA-Z0-9_]*)\s+in\b/gm;

    let match;
    while ((match = typedDeclRegex.exec(code)) !== null) {
      this.addOperation(document, selection, match[1], document.positionAt(match.index).line + 1, logOperations, scheduled, document.positionAt(match.index).line);
    }
    while ((match = foreachRegex.exec(code)) !== null) {
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
    if (this.shouldSkipVariable(varName) || CSHARP_KEYWORDS.has(varName) || insertLine >= document.lineCount) return;
    if (!selection.isEmpty && varName !== document.getText(selection).trim()) return;

    const key = `${insertLine}:${varName}`;
    if (scheduled.has(key)) return;

    const end = Math.min(insertLine + 3, document.lineCount);
    for (let i = insertLine; i < end; i++) {
        if (document.lineAt(i).text.includes("Console.Write") && document.lineAt(i).text.includes(varName)) return;
    }

    scheduled.add(key);
    const indent = document.lineAt(insertLine - 1).text.match(/^\s*/)?.[0] || "";
    logOperations.push({ uri: document.uri, position: new vscode.Position(insertLine, 0), varName, indent, declarationLine });
  }
}

module.exports = CSharpProvider;
