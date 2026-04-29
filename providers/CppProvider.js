const vscode = require("vscode");
const LogProvider = require("./LogProvider");

const CPP_KEYWORDS = new Set([
  "alignas", "alignof", "and", "and_eq", "asm", "auto", "bitand", "bitor", "bool", "break", "case", "catch", "char", "char8_t", "char16_t", "char32_t", "class", "compl", "concept", "const", "consteval", "constexpr", "constinit", "const_cast", "continue", "co_await", "co_return", "co_yield", "decltype", "default", "delete", "do", "double", "dynamic_cast", "else", "enum", "explicit", "export", "extern", "false", "float", "for", "friend", "goto", "if", "inline", "int", "long", "mutable", "namespace", "new", "noexcept", "not", "not_eq", "nullptr", "operator", "or", "or_eq", "private", "protected", "public", "register", "reinterpret_cast", "requires", "return", "short", "signed", "sizeof", "static", "static_assert", "static_cast", "struct", "switch", "template", "this", "thread_local", "throw", "true", "try", "typedef", "typeid", "typename", "union", "unsigned", "using", "virtual", "void", "volatile", "wchar_t", "while", "xor", "xor_eq", "string", "vector", "map", "set", "pair", "tuple", "array", "list", "cout", "cin", "cerr", "endl", "std", "size_t", "nullptr_t"
]);

class CppProvider extends LogProvider {
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

    const typedDeclRegex = /^\s*(?:(?:const|static|volatile|mutable|inline|extern|register|thread_local)\s+)*(?:auto|(?:unsigned\s+|signed\s+)?(?:int|long|short|char|float|double|bool|wchar_t|size_t)|(?:[A-Za-z_]\w*(?:::[A-Za-z_]\w*)*(?:<[^>]*>)?(?:\s*\*+|\s*&+)?))\s+([a-zA-Z_]\w*)(?!\s*\()\s*(?:=|{|;)/gm;

    let match;
    while ((match = typedDeclRegex.exec(code)) !== null) {
      const varName = match[1];
      if (CPP_KEYWORDS.has(varName)) continue;
      this.addOperation(document, selection, varName, document.positionAt(match.index).line + 1, logOperations, scheduled, document.positionAt(match.index).line);
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
    const resolvedInsertLine = this.resolveInsertLine(document, declarationLine);
    if (this.shouldSkipVariable(varName) || CPP_KEYWORDS.has(varName) || resolvedInsertLine >= document.lineCount) return;
    if (!selection.isEmpty && varName !== document.getText(selection).trim()) return;

    const key = `${resolvedInsertLine}:${varName}`;
    if (scheduled.has(key)) return;

    const end = Math.min(resolvedInsertLine + 3, document.lineCount);
    for (let i = resolvedInsertLine; i < end; i++) {
        if (document.lineAt(i).text.includes("std::cout") && document.lineAt(i).text.includes(varName)) return;
    }
    if (this.hasNearbyLog(document, resolvedInsertLine, varName, ["std::cout"])) return;

    scheduled.add(key);
    const indent = this.getIndentForDeclaration(document, declarationLine, resolvedInsertLine);
    logOperations.push({ uri: document.uri, position: new vscode.Position(resolvedInsertLine, 0), varName, indent, declarationLine });
  }
}

module.exports = CppProvider;
