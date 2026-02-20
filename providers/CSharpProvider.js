const vscode = require("vscode");
const LogProvider = require("./LogProvider");

// C# keywords that should never be treated as variable names
const CSHARP_KEYWORDS = new Set([
  "abstract",
  "as",
  "base",
  "bool",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "checked",
  "class",
  "const",
  "continue",
  "decimal",
  "default",
  "delegate",
  "do",
  "double",
  "else",
  "enum",
  "event",
  "explicit",
  "extern",
  "false",
  "finally",
  "fixed",
  "float",
  "for",
  "foreach",
  "goto",
  "if",
  "implicit",
  "in",
  "int",
  "interface",
  "internal",
  "is",
  "lock",
  "long",
  "namespace",
  "new",
  "null",
  "object",
  "operator",
  "out",
  "override",
  "params",
  "private",
  "protected",
  "public",
  "readonly",
  "ref",
  "return",
  "sbyte",
  "sealed",
  "short",
  "sizeof",
  "stackalloc",
  "static",
  "string",
  "struct",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "uint",
  "ulong",
  "unchecked",
  "unsafe",
  "ushort",
  "using",
  "virtual",
  "void",
  "volatile",
  "while",
  "var",
  "dynamic",
  "async",
  "await",
  "yield",
  "partial",
  "get",
  "set",
  "add",
  "remove",
  "value",
  "global",
  "where",
  "select",
  "from",
  "join",
  "String",
  "Object",
  "Boolean",
  "Int32",
  "Int64",
  "Double",
  "Single",
  "Decimal",
  "Char",
  "Byte",
  "Console",
  "Math",
  "Array",
  "List",
  "Dictionary",
  "Task",
  "Exception",
  "Type",
  "Enum",
  "Nullable",
]);

class CSharpProvider extends LogProvider {
  async insertConsoleLogs(editor) {
    const document = editor.document;
    const code = document.getText();
    const selection = editor.selection;
    const logOperations = [];
    const scheduled = new Set();

    // Match typed declarations: Type varName = ... or var varName = ...
    // Handles: int x = 10; string name = "foo"; var result = ...; List<T> items = ...
    const typedDeclRegex =
      /^\s*(?:(?:readonly|static|private|public|protected|internal|override|virtual|sealed|abstract|const|volatile)\s+)*(?:var|[A-Za-z][a-zA-Z0-9_]*(?:<[^>]*>)?(?:\[\])*\??)\s+([a-z_][a-zA-Z0-9_]*)\s*(?:=|;)/gm;

    // Foreach variable: foreach (Type varName in collection)
    const foreachRegex =
      /\bforeach\s*\(\s*(?:var|[A-Za-z][a-zA-Z0-9_<>\[\]]*)\s+([a-z_][a-zA-Z0-9_]*)\s+in\b/gm;

    let match;

    // 1. Typed declarations
    while ((match = typedDeclRegex.exec(code)) !== null) {
      const varName = match[1];
      if (CSHARP_KEYWORDS.has(varName)) continue;

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

    // 2. Foreach variables
    while ((match = foreachRegex.exec(code)) !== null) {
      const varName = match[1];
      if (CSHARP_KEYWORDS.has(varName)) continue;

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
      vscode.window.showInformationMessage("No variables found to log (C#).");
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    for (const op of logOperations) {
      const logStatement = this.getLogStatement(op.varName, op.indent);
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
    if (CSHARP_KEYWORDS.has(varName)) return;
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
      if (lineText.includes("Console.Write") && lineText.includes(varName))
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

  getLogStatement(varName, indent) {
    return `${indent}Console.WriteLine($"${varName}: {${varName}}"); // [ACL]\n`;
  }
}

module.exports = CSharpProvider;
