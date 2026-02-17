const vscode = require("vscode");

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
  shouldSkipVariable(varName) {
    // Skip if starts with underscore (private/unused convention)
    if (varName.startsWith("_")) return true;
    // Skip specific keywords
    if (["undefined", "null", "true", "false"].includes(varName)) return true;
    return false;
  }
}

module.exports = LogProvider;
