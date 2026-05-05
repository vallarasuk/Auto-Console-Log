const { isLineContinuation } = require("../lib/utils");

// Common keywords to skip across all languages
const COMMON_KEYWORDS = new Set([
  // JS/TS
  "undefined", "null", "true", "false", "this", "super", "return", "typeof", "instanceof", "void", "delete", "new",
  "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "try", "catch", "finally", "throw",
  "import", "export", "default", "class", "extends", "const", "let", "var", "function", "async", "await", "yield",
  "of", "in", "from", "as",
  // Java / C#
  "int", "long", "short", "byte", "float", "double", "boolean", "char", "string", "String", "bool", "object", "Object",
  "void", "public", "private", "protected", "static", "final", "abstract", "interface", "enum", "struct", "delegate",
  "event", "sealed", "override", "virtual", "readonly", "using", "namespace", "package", "implements", "throws",
  // Go
  "func", "type", "map", "chan", "go", "defer", "select", "range", "make", "len", "cap", "append", "copy", "close", "panic", "recover",
  // Python
  "def", "lambda", "pass", "global", "nonlocal", "with", "assert", "del", "raise", "except", "elif", "not", "and", "or", "is",
  // C++
  "auto", "template", "typename", "inline", "explicit", "operator", "sizeof", "alignof", "decltype", "constexpr",
  // Swift
  "guard", "where", "fallthrough", "repeat", "inout", "typealias", "protocol", "extension", "convenience", "required",
  "lazy", "weak", "unowned", "mutating", "nonmutating", "fileprivate", "open",
  // PHP
  "echo", "print", "array", "list",
]);

class LogProvider {
  constructor() {}

  /**
   * Insert logs for all variables in the document or selection.
   */
  async insertConsoleLogs(_editor, _generateLogStatement) {
    throw new Error("Method 'insertConsoleLogs()' must be implemented.");
  }

  /**
   * Check if a variable name should be skipped.
   * @param {string} varName
   * @returns {boolean}
   */
  shouldSkipVariable(varName) {
    if (!varName || varName.length === 0) return true;
    if (varName.startsWith("_")) return true;
    if (COMMON_KEYWORDS.has(varName)) return true;
    if (["i", "j", "k", "e", "n", "m"].includes(varName)) return true;
    return false;
  }

  resolveInsertLine(document, declarationLine) {
    let currentLine = declarationLine;
    let lineText = document.lineAt(currentLine).text;
    
    // Quick check for terminal inline (JS/TS)
    const terminalInline = /;\s*(return|throw|break|continue)\b/.test(lineText);
    if (terminalInline) return declarationLine;

    // Track parentheses/brackets/braces
    let openParens = 0, openBraces = 0, openBrackets = 0;
    const processLine = (t) => {
        const s = t.replace(/'[^']*'/g, "").replace(/"[^"]*"/g, "").replace(/\/\/.*/, "").replace(/#.*/, "");
        for (const char of s) {
            if (char === "(") openParens++;
            else if (char === ")") openParens = Math.max(0, openParens - 1);
            else if (char === "{") openBraces++;
            else if (char === "}") openBraces = Math.max(0, openBraces - 1);
            else if (char === "[") openBrackets++;
            else if (char === "]") openBrackets = Math.max(0, openBrackets - 1);
        }
    };

    processLine(lineText);

    while (currentLine < document.lineCount - 1) {
        const nextLineText = document.lineAt(currentLine + 1).text;
        if (openParens > 0 || openBraces > 0 || openBrackets > 0 || isLineContinuation(lineText, nextLineText)) {
            currentLine++;
            lineText = nextLineText;
            processLine(lineText);
        } else {
            break;
        }
    }

    return currentLine + 1;
  }

  getIndentForDeclaration(document, declarationLine, fallbackLine) {
    const sourceLine = Math.max(0, Math.min(fallbackLine, document.lineCount - 1));
    const declIndent = document.lineAt(declarationLine).text.match(/^\s*/)?.[0] || "";
    const sourceIndent = document.lineAt(sourceLine).text.match(/^\s*/)?.[0] || "";
    return sourceIndent.length >= declIndent.length ? sourceIndent : declIndent;
  }

  hasNearbyLog(document, insertLine, varName, fragments = []) {
    const start = Math.max(0, insertLine - 1);
    const end = Math.min(document.lineCount - 1, insertLine + 5);
    for (let i = start; i <= end; i++) {
      const text = document.lineAt(i).text;
      if (!text.includes(varName)) continue;
      if (text.includes("[ACL]")) return true;
      if (fragments.some((fragment) => text.includes(fragment))) return true;
    }
    return false;
  }
}

module.exports = LogProvider;
