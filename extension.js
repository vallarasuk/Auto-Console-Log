const vscode = require("vscode");

const supportedLanguages = [
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact",
];

// Entry point - activate extension
function activate(context) {
  console.log("Auto Console Log Extension Activated!");

  const disposable = vscode.commands.registerCommand(
    "extension.addConsoleLogs",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found!");
        return;
      }

      const document = editor.document;
      const languageId = document.languageId;

      if (!supportedLanguages.includes(languageId)) {
        vscode.window.showInformationMessage(
          `Auto Console Log not supported for ${languageId} files.`
        );
        return;
      }

      try {
        const cursorPosition = editor.selection.active;
        const functionRange = getFunctionScopeRange(document, cursorPosition);

        if (!functionRange) {
          vscode.window.showInformationMessage(
            "Cursor must be inside a function or block to add logs."
          );
          return;
        }

        const functionText = document.getText(functionRange);
        const fullText = document.getText();

        const edit = new vscode.WorkspaceEdit();
        let hasInsertions = false;

        // Determine variables to skip (imports, hooks, etc)
        const skipPatterns = extractSkipPatterns(fullText);

        // Track logged variables to avoid duplicates in same run
        const loggedVariables = new Set();

        // Find variables declared in current function scope
        const variableNames = extractVariables(functionText);

        for (const varName of variableNames) {
          // Find variable declaration line number in document
          const varIndexInFunction = functionText.indexOf(varName);
          const varDocOffset =
            document.offsetAt(functionRange.start) + varIndexInFunction;
          const varPosition = document.positionAt(varDocOffset);
          const lineNumber = varPosition.line;
          const line = document.lineAt(lineNumber);

          if (
            shouldSkipVariable(
              varName,
              skipPatterns,
              loggedVariables,
              document,
              lineNumber
            )
          ) {
            continue;
          }

          // Compute insertion position after variable declaration ends
          const { insertPosition, indent } = getInsertPosition(
            document,
            lineNumber,
            line
          );

          // Get function or context name for log
          const contextName = getVariableContext(document, lineNumber);

          const logStatement = `${indent}console.log('${contextName}${varName} ---------------------------->', ${varName});\n`;

          edit.insert(document.uri, insertPosition, logStatement);
          hasInsertions = true;
          loggedVariables.add(varName);
        }

        if (!hasInsertions) {
          vscode.window.showInformationMessage(
            "No meaningful variables found to log in current scope."
          );
          return;
        }

        const success = await vscode.workspace.applyEdit(edit);
        if (!success) {
          vscode.window.showErrorMessage("Failed to insert console logs!");
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
        console.error("Extension error:", error);
      }
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * Extract variable names declared in the given code snippet.
 * Supports const, let, var declarations avoiding function declarations and React hooks.
 */
function extractVariables(code) {
  const vars = new Set();
  const varRegex =
    /(?:^|\s|\n)(const|let|var)\s+([a-zA-Z_$][\w$]*)\s*(?=[=;,\n])/g;
  let match;
  while ((match = varRegex.exec(code)) !== null) {
    vars.add(match[2]);
  }
  return Array.from(vars);
}

/**
 * Extract variable names/patterns to skip from the entire document text.
 * For example: React hooks, imports, exports, functions, classes, interfaces, etc.
 */
function extractSkipPatterns(text) {
  const skipSet = new Set();

  // Skip imports
  const importRegex =
    /^\s*import\s+(?:\{\s*([\w\s,]*)\s*\}|[\w*,\s]+)\s+from\s+['"][^'"]+['"];/gm;
  let importMatch;
  while ((importMatch = importRegex.exec(text)) !== null) {
    if (importMatch[1]) {
      importMatch[1]
        .split(",")
        .map((s) => s.trim())
        .forEach((name) => skipSet.add(name));
    }
  }

  // Skip exports (named and default)
  const exportRegex =
    /^\s*export\s+(?:(?:const|let|var|function|class)\s+)?(\w+)/gm;
  let exportMatch;
  while ((exportMatch = exportRegex.exec(text)) !== null) {
    skipSet.add(exportMatch[1]);
  }
  const exportDefaultRegex = /^\s*export\s+default\s+(\w+)/gm;
  let exportDefaultMatch;
  while ((exportDefaultMatch = exportDefaultRegex.exec(text)) !== null) {
    skipSet.add(exportDefaultMatch[1]);
  }

  // Skip function and class declarations
  const functionClassRegex = /^\s*(?:async\s+)?(?:function|class)\s+(\w+)/gm;
  let functionClassMatch;
  while ((functionClassMatch = functionClassRegex.exec(text)) !== null) {
    skipSet.add(functionClassMatch[1]);
  }

  // Skip interface and type aliases
  const interfaceTypeRegex = /^\s*(?:interface|type)\s+(\w+)/gm;
  let interfaceTypeMatch;
  while ((interfaceTypeMatch = interfaceTypeRegex.exec(text)) !== null) {
    skipSet.add(interfaceTypeMatch[1]);
  }

  // Skip React hooks (starting with 'use')
  const hookRegex = /\b(use[A-Z]\w*)\b/g;
  let hookMatch;
  while ((hookMatch = hookRegex.exec(text)) !== null) {
    skipSet.add(hookMatch[1]);
  }

  // Skip variables declared with arrow functions
  const arrowFunctionRegex = /const\s+(\w+)\s*=\s*\(?[\w\s,]*\)?\s*=>/g;
  let arrowMatch;
  while ((arrowMatch = arrowFunctionRegex.exec(text)) !== null) {
    skipSet.add(arrowMatch[1]);
  }

  // Skip destructured useState variables
  const useStateRegex = /const\s+\[(\w+),\s*\w+\]\s*=\s*useState/g;
  let useStateMatch;
  while ((useStateMatch = useStateRegex.exec(text)) !== null) {
    skipSet.add(useStateMatch[1]);
  }

  return skipSet;
}

/**
 * Decide whether to skip logging this variable.
 */
function shouldSkipVariable(
  varName,
  skipPatterns,
  loggedVariables,
  document,
  lineNumber
) {
  if (skipPatterns.has(varName)) return true;
  if (loggedVariables.has(varName)) return true;
  if (varName.length <= 2) return true;
  if (varName[0] === varName[0].toUpperCase()) return true; // Probably class or constant
  if (varName.startsWith("_")) return true;
  if (varName.startsWith("use")) return true; // Hooks
  if (["props", "context", "ref", "children"].includes(varName)) return true;
  if (hasConsoleLogInScope(document, lineNumber, varName)) return true;
  return false;
}

/**
 * Check if there is already a console.log for this variable in the current scope (function/block).
 */
function hasConsoleLogInScope(document, lineNumber, varName) {
  const scopeRange = findScopeRangeAroundLine(document, lineNumber);
  if (!scopeRange) return false;

  for (let i = scopeRange.start.line; i <= scopeRange.end.line; i++) {
    const lineText = document.lineAt(i).text;
    // Basic check if console.log with variable already exists
    const regex = new RegExp(`console\\.log\\([^)]*\\b${varName}\\b[^)]*\\)`);
    if (regex.test(lineText)) {
      return true;
    }
  }
  return false;
}

/**
 * Find the start and end range of the block (function or code block) around a line.
 */
function findScopeRangeAroundLine(document, lineNumber) {
  // Search upward to find opening brace of scope
  let startLine = -1;
  let braceBalance = 0;

  for (let i = lineNumber; i >= 0; i--) {
    const lineText = document.lineAt(i).text;

    // Count braces on this line
    const openBraces = (lineText.match(/{/g) || []).length;
    const closeBraces = (lineText.match(/}/g) || []).length;

    braceBalance += closeBraces - openBraces;

    if (lineText.includes("{") && braceBalance < 0) {
      startLine = i;
      break;
    }
  }
  if (startLine === -1) return null;

  // Search downward to find matching closing brace
  let endLine = -1;
  braceBalance = 0;
  for (let i = startLine; i < document.lineCount; i++) {
    const lineText = document.lineAt(i).text;
    const openBraces = (lineText.match(/{/g) || []).length;
    const closeBraces = (lineText.match(/}/g) || []).length;
    braceBalance += openBraces - closeBraces;

    if (braceBalance === 0) {
      endLine = i;
      break;
    }
  }
  if (endLine === -1) return null;

  return new vscode.Range(
    new vscode.Position(startLine, 0),
    new vscode.Position(endLine, document.lineAt(endLine).text.length)
  );
}

/**
 * Determine insert position for console.log statement after variable declaration.
 * Handles multi-line declarations by checking for balanced brackets.
 */
function getInsertPosition(document, lineNumber, line) {
  let insertLine = lineNumber;
  let currentLineNumber = lineNumber;
  let openBrackets = 0;
  let openBraces = 0;
  let openParens = 0;

  while (currentLineNumber < document.lineCount) {
    const currentLineText = document.lineAt(currentLineNumber).text.trim();

    for (const char of currentLineText) {
      if (char === "[") openBrackets++;
      else if (char === "]") openBrackets--;
      else if (char === "{") openBraces++;
      else if (char === "}") openBraces--;
      else if (char === "(") openParens++;
      else if (char === ")") openParens--;
    }

    // Check if the declaration seems to have ended
    if (
      currentLineNumber > lineNumber && // Don't check the starting line immediately
      openBrackets <= 0 &&
      openBraces <= 0 &&
      openParens <= 0 &&
      (currentLineText.endsWith(";") ||
        currentLineText.endsWith(",") ||
        currentLineText === "")
    ) {
      insertLine = currentLineNumber + (currentLineText === "" ? 0 : 1); // Insert after the line
      return {
        insertPosition: new vscode.Position(insertLine, 0),
        indent: line.text.match(/^\s*/)?.[0] || "",
      };
    }
    currentLineNumber++;
  }

  // Fallback if no clear end is found
  return {
    insertPosition: new vscode.Position(lineNumber + 1, 0),
    indent: line.text.match(/^\s*/)?.[0] || "",
  };
}

/**
 * Get the current function or const function name above the variable line for log context.
 */
function getVariableContext(document, lineNumber) {
  let contextParts = [];
  let currentLineNumber = lineNumber;
  let openBraces = 0;

  while (currentLineNumber >= 0) {
    const lineText = document.lineAt(currentLineNumber).text;

    // Match named function
    let match = lineText.match(/function\s+([a-zA-Z_$][\w$]*)\s*\(/);
    if (match) {
      contextParts.unshift(match[1]);
      return contextParts.join(" > ") + " > ";
    }

    // Match const arrow function or const function
    match = lineText.match(
      /const\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[\w\s,]*\)?\s*=>/
    );
    if (match) {
      contextParts.unshift(match[1]);
      return contextParts.join(" > ") + " > ";
    }

    // Match class method
    match = lineText.match(/([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*{/);
    if (match) {
      contextParts.unshift(match[1]);
      return contextParts.join(" > ") + " > ";
    }

    // Keep track of braces to potentially stop at a higher scope
    const open = (lineText.match(/{/g) || []).length;
    const close = (lineText.match(/}/g) || []).length;
    openBraces += open - close;

    // Consider stopping if we move out of the initial function scope (heuristic)
    if (currentLineNumber < lineNumber && openBraces <= 0) {
      break;
    }

    currentLineNumber--;
  }
  return "";
}

/**
 * Get the range of the function/block scope containing the cursor position.
 * Improved brace matching using offset in full document text.
 */
function getFunctionScopeRange(document, position) {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Find start of scope by balancing braces backward
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

  // Find end of scope by balancing braces forward
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
    document.positionAt(end + 1)
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
