const vscode = require("vscode");

// Common keywords to skip across all languages
const COMMON_KEYWORDS = new Set([
  // JS/TS
  "undefined",
  "null",
  "true",
  "false",
  "this",
  "super",
  "return",
  "typeof",
  "instanceof",
  "void",
  "delete",
  "new",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "throw",
  "import",
  "export",
  "default",
  "class",
  "extends",
  "const",
  "let",
  "var",
  "function",
  "async",
  "await",
  "yield",
  "of",
  "in",
  "from",
  "as",
  // Java / C#
  "int",
  "long",
  "short",
  "byte",
  "float",
  "double",
  "boolean",
  "char",
  "string",
  "String",
  "bool",
  "object",
  "Object",
  "void",
  "public",
  "private",
  "protected",
  "static",
  "final",
  "abstract",
  "interface",
  "enum",
  "struct",
  "delegate",
  "event",
  "sealed",
  "override",
  "virtual",
  "readonly",
  "const",
  "using",
  "namespace",
  "package",
  "import",
  "implements",
  "throws",
  "throw",
  // Go
  "func",
  "type",
  "map",
  "chan",
  "go",
  "defer",
  "select",
  "range",
  "make",
  "len",
  "cap",
  "append",
  "copy",
  "close",
  "panic",
  "recover",
  // Python
  "def",
  "lambda",
  "pass",
  "global",
  "nonlocal",
  "with",
  "assert",
  "del",
  "raise",
  "except",
  "elif",
  "not",
  "and",
  "or",
  "is",
  // C++
  "auto",
  "template",
  "typename",
  "namespace",
  "using",
  "include",
  "define",
  "ifdef",
  "ifndef",
  "endif",
  "inline",
  "explicit",
  "operator",
  "sizeof",
  "alignof",
  "decltype",
  "constexpr",
  // Swift
  "guard",
  "where",
  "fallthrough",
  "repeat",
  "inout",
  "typealias",
  "protocol",
  "extension",
  "convenience",
  "required",
  "lazy",
  "weak",
  "unowned",
  "mutating",
  "nonmutating",
  "fileprivate",
  "open",
  // PHP
  "echo",
  "print",
  "include",
  "require",
  "array",
  "list",
]);

class LogProvider {
  constructor() {}

  /**
   * Insert logs for all variables in the document or selection.
   * @param {vscode.TextEditor} editor
   */
  async insertConsoleLogs(editor) {
    throw new Error("Method 'insertConsoleLogs' must be implemented.");
  }

  /**
   * Get the range of the function/block scope containing the cursor position.
   * Used for context-aware removal.
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @returns {vscode.Range | null}
   */
  getFunctionScopeRange(document, position) {
    // Default implementation for C-style languages (brace matching)
    const text = document.getText();
    const offset = document.offsetAt(position);

    let start = -1;
    let balance = 0;

    for (let i = offset; i >= 0; i--) {
      if (text[i] === "{") {
        balance--;
        if (balance < 0) {
          start = i;
          break;
        }
      } else if (text[i] === "}") {
        balance++;
      }
    }
    if (start === -1) return null;

    let end = -1;
    balance = 1;
    for (let i = start + 1; i < text.length; i++) {
      if (text[i] === "{") balance++;
      else if (text[i] === "}") balance--;

      if (balance === 0) {
        end = i;
        break;
      }
    }

    if (end === -1) return null;

    return new vscode.Range(
      document.positionAt(start),
      document.positionAt(end + 1),
    );
  }

  /**
   * Check if a variable name should be skipped.
   * @param {string} varName
   * @returns {boolean}
   */
  shouldSkipVariable(varName) {
    if (!varName || varName.length === 0) return true;
    // Skip if starts with underscore (private/unused convention)
    if (varName.startsWith("_")) return true;
    // Skip common keywords
    if (COMMON_KEYWORDS.has(varName)) return true;
    // Skip single-letter variables that are likely loop counters (i, j, k, e)
    // but allow meaningful single-letter vars like x, y, z
    if (["i", "j", "k", "e", "n", "m"].includes(varName)) return true;
    return false;
  }
}

module.exports = LogProvider;
