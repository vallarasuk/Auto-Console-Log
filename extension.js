const vscode = require("vscode");

function activate(context) {
  console.log("Auto Console Log Extension Activated!");

  const supportedLanguages = [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
  ];

  const disposable = vscode.commands.registerCommand(
    "extension.addConsoleLogs", 
    function () {
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

        const text = document.getText(functionRange);
        const fullText = document.getText();
        const edit = new vscode.WorkspaceEdit();
        let hasInsertions = false;
        const skipPatterns = new Set();
        const loggedVariables = new Set();

        // First pass: Identify skip patterns
        const skipRegex =
          /(?:^|\n)(?:\s*)(?:export\s+)?(?:default\s+|function\s+|class\s+|interface\s+|type\s+|const\s+\[([a-zA-Z_$][\w$]*),\s*set\w+\]\s*=\s*useState|const\s+(\w+)\s*=\s*(?:\(\s*.*\s*\)\s*=>|function)|import\s+(?:\{[^}]*\}|\w+)\s+from|useEffect\s*\(|useReducer\s*\(|useState\s*\(|useContext\s*\(|useRef\s*\(|React.memo\s*\()/g;

        // Second pass: Process variables in current scope
        const varRegex =
          /(?:^|\n)(?:\s*)(const|let|var)\s+([a-zA-Z_$][\w$]*)\s*(?=\s*(?!function\b|\(\s*.*\s*\)\s*=>|\b(useEffect|useReducer|useState|useContext|useRef|React.memo)\b))/g;

        let skipMatch;
        while ((skipMatch = skipRegex.exec(fullText)) !== null) {
          if (skipMatch[1]) skipPatterns.add(skipMatch[1]);
          if (skipMatch[2]) skipPatterns.add(skipMatch[2]);
        }

        let varMatch;
        while ((varMatch = varRegex.exec(text)) !== null) {
          const varName = varMatch[2];
          const indexInDoc =
            document.offsetAt(functionRange.start) + varMatch.index;
          const lineNumber = document.positionAt(indexInDoc).line;
          const line = document.lineAt(lineNumber);

          // Skip conditions
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

          // Find insertion position (after the variable declaration)
          const { insertPosition, indent } = getInsertPosition(
            document,
            lineNumber,
            line
          );
          const context = getVariableContext(document, lineNumber);
          const logStatement = `${indent}console.log('${context}${varName} ---------------------------->', ${varName});\n`;

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

        vscode.workspace.applyEdit(edit).then((success) => {
          if (!success) {
            vscode.window.showErrorMessage("Failed to insert console logs!");
          }
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
        console.error("Extension error:", error);
      }
    }
  );

  context.subscriptions.push(disposable);
}

function shouldSkipVariable(
  varName,
  skipPatterns,
  loggedVariables,
  document,
  lineNumber
) {
  return (
    skipPatterns.has(varName) ||
    varName.length <= 2 ||
    varName[0] === varName[0].toUpperCase() ||
    varName.startsWith("_") ||
    varName.startsWith("use") ||
    ["props", "context", "ref", "children"].includes(varName) ||
    loggedVariables.has(varName) ||
    hasConsoleLogInScope(document, lineNumber, varName)
  );
}

function getInsertPosition(document, lineNumber, line) {
  let insertLine = lineNumber + 1;
  while (insertLine < document.lineCount) {
    const nextLine = document.lineAt(insertLine).text.trim();
    if (nextLine && !nextLine.match(/^(const|let|var)\s/)) break;
    insertLine++;
  }
  return {
    insertPosition: new vscode.Position(insertLine, 0),
    indent: line.text.match(/^\s*/)[0],
  };
}

function getFunctionScopeRange(document, position) {
  const text = document.getText();
  const offset = document.offsetAt(position);

  let functionStart = -1;
  let braceBalance = 0;
  let found = false;

  for (let i = offset; i >= 0; i--) {
    if (text[i] === "{") {
      braceBalance--;
      if (braceBalance < 0) {
        functionStart = i;
        found = true;
        break;
      }
    } else if (text[i] === "}") {
      braceBalance++;
    }
  }

  if (!found) return null;

  let functionEnd = -1;
  braceBalance = 1;
  for (let i = functionStart + 1; i < text.length; i++) {
    if (text[i] === "{") braceBalance++;
    else if (text[i] === "}") braceBalance--;

    if (braceBalance === 0) {
      functionEnd = i;
      break;
    }
  }

  return functionEnd === -1
    ? null
    : new vscode.Range(
        document.positionAt(functionStart),
        document.positionAt(functionEnd + 1)
      );
}

function hasConsoleLogInScope(document, lineNumber, varName) {
  const scopeStart = findScopeStart(document, lineNumber);
  const scopeEnd = findScopeEnd(document, lineNumber);

  for (let i = scopeStart; i <= scopeEnd; i++) {
    const line = document.lineAt(i).text;
    if (
      line.includes(`console.log(`) &&
      line.includes(varName) &&
      !line.includes(`console.log(` + varName + `)`)
    ) {
      return true;
    }
  }
  return false;
}

function findScopeStart(document, lineNumber) {
  for (let i = lineNumber; i >= 0; i--) {
    const line = document.lineAt(i).text;
    if (line.match(/function\s|const\s+\w+\s*=\s*\(|class\s|interface\s/)) {
      return i;
    }
  }
  return 0;
}

function findScopeEnd(document, lineNumber) {
  let braceCount = 0;
  for (let i = lineNumber; i < document.lineCount; i++) {
    const line = document.lineAt(i).text;
    braceCount += (line.match(/{/g) || []).length;
    braceCount -= (line.match(/}/g) || []).length;

    if (braceCount < 0) return i;
  }
  return document.lineCount - 1;
}

function getVariableContext(document, lineNumber) {
  for (let i = lineNumber; i >= 0; i--) {
    const line = document.lineAt(i).text;
    const funcMatch = line.match(/function\s+([a-zA-Z_$][\w$]*)/);
    const componentMatch = line.match(/const\s+([A-Z][a-zA-Z_$]*)\s*=/);

    if (funcMatch) return `${funcMatch[1]} > `;
    if (componentMatch) return `${componentMatch[1]} > `;
  }
  return "";
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
