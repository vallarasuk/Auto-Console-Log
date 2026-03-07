const vscode = require("vscode");
const LogProvider = require("./LogProvider");
const { generateLogStatement } = require("../extension");

// C++ keywords that should never be treated as variable names
const CPP_KEYWORDS = new Set([
  "alignas",
  "alignof",
  "and",
  "and_eq",
  "asm",
  "auto",
  "bitand",
  "bitor",
  "bool",
  "break",
  "case",
  "catch",
  "char",
  "char8_t",
  "char16_t",
  "char32_t",
  "class",
  "compl",
  "concept",
  "const",
  "consteval",
  "constexpr",
  "constinit",
  "const_cast",
  "continue",
  "co_await",
  "co_return",
  "co_yield",
  "decltype",
  "default",
  "delete",
  "do",
  "double",
  "dynamic_cast",
  "else",
  "enum",
  "explicit",
  "export",
  "extern",
  "false",
  "float",
  "for",
  "friend",
  "goto",
  "if",
  "inline",
  "int",
  "long",
  "mutable",
  "namespace",
  "new",
  "noexcept",
  "not",
  "not_eq",
  "nullptr",
  "operator",
  "or",
  "or_eq",
  "private",
  "protected",
  "public",
  "register",
  "reinterpret_cast",
  "requires",
  "return",
  "short",
  "signed",
  "sizeof",
  "static",
  "static_assert",
  "static_cast",
  "struct",
  "switch",
  "template",
  "this",
  "thread_local",
  "throw",
  "true",
  "false",
  "try",
  "typedef",
  "typeid",
  "typename",
  "union",
  "unsigned",
  "using",
  "virtual",
  "void",
  "volatile",
  "wchar_t",
  "while",
  "xor",
  "xor_eq",
  "string",
  "vector",
  "map",
  "set",
  "pair",
  "tuple",
  "array",
  "list",
  "cout",
  "cin",
  "cerr",
  "endl",
  "std",
  "size_t",
  "nullptr_t",
]);

class CppProvider extends LogProvider {
  /**
   * @param {vscode.TextEditor} editor
   */
  async insertConsoleLogs(editor) {
    const document = editor.document;
    const code = document.getText();
    const selection = editor.selection;
    const logOperations = [];
    const scheduled = new Set();

    // Match typed declarations
    const typedDeclRegex =
      /^\s*(?:(?:const|static|volatile|mutable|inline|extern|register|thread_local)\s+)*(?:auto|(?:unsigned\s+|signed\s+)?(?:int|long|short|char|float|double|bool|wchar_t|size_t)|(?:[A-Za-z_]\w*(?:::[A-Za-z_]\w*)*(?:<[^>]*>)?(?:\s*\*+|\s*&+)?))\s+([a-zA-Z_]\w*)(?!\s*\()\s*(?:=|{|;)/gm;

    let match;

    while ((match = typedDeclRegex.exec(code)) !== null) {
      const varName = match[1];
      if (CPP_KEYWORDS.has(varName)) continue;

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
      vscode.window.showInformationMessage("No variables found to log (C++).");
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
    if (CPP_KEYWORDS.has(varName)) return;
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
      if (lineText.includes("std::cout") && lineText.includes(varName)) return;
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
    return `${indent}std::cout << "${varName}: " << ${varName} << std::endl; // [ACL]\n`;
  }
}

module.exports = CppProvider;
