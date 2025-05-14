const vscode = require("vscode");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");

function activate(context) {
  console.log("Auto Console Log Extension Activated! (Improved)");

  const supportedLanguages = [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
  ];

  const disposable = vscode.commands.registerCommand(
    "auto-console-log-by-vallarasu-kanthasamy.addConsoleLogs",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found!");
        return;
      }

      const document = editor.document;
      const languageId = document.languageId;

      if (!supportedLanguages.includes(languageId)) {
        vscode.window.showInformationMessage(
          `Auto Console Log not fully supported for ${languageId} files. Falling back to basic logic.`
        );
        return;
      }

      try {
        const cursorPosition = editor.selection.active;
        const edit = new vscode.WorkspaceEdit();
        let hasInsertions = false;

        const text = document.getText();
        const ast = parser.parse(text, {
          sourceType: "module", // or "script" depending on your project
          plugins: [
            "jsx",
            "typescript",
            "classProperties",
            "decorators-legacy",
          ],
        });

        const loggedVariables = new Set();
        let scopePath = null; // Changed from scopeNode to scopePath

        traverse(ast, {
          enter(path) {
            const node = path.node;
            const startPosition = document.positionAt(node.start || 0);
            const endPosition = document.positionAt(node.end || 0);
            const range = new vscode.Range(startPosition, endPosition);

            if (range.contains(cursorPosition)) {
              if (
                path.isBlockStatement() ||
                path.isFunctionDeclaration() ||
                path.isArrowFunctionExpression() ||
                path.isClassMethod() ||
                path.isClassDeclaration()
              ) {
                scopePath = path; // Store the path instead of just the node
              }
            }
          },
        });

        if (scopePath) {
          traverse(scopePath.node, {
            // Traverse the node of the path
            VariableDeclarator(path) {
              const node = path.node;
              if (t.isIdentifier(node.id)) {
                const varName = node.id.name;
                const declarationNode = path.parentPath.node;
                const isConstLetVar =
                  t.isVariableDeclaration(declarationNode) &&
                  ["const", "let", "var"].includes(declarationNode.kind);

                if (
                  isConstLetVar &&
                  !shouldSkipVariable(varName, loggedVariables)
                ) {
                  const insertPosition = document.positionAt(
                    declarationNode.end
                  );
                  const indent = getIndentation(
                    document,
                    document.positionAt(declarationNode.start).line
                  );
                  const context = getVariableContextForAST(path);
                  const logStatement = `${indent}console.log('${context}${varName} --> okay', ${varName});\n`;
                  edit.insert(document.uri, insertPosition, logStatement);
                  hasInsertions = true;
                  loggedVariables.add(varName);
                }
              } else if (t.isObjectPattern(node.id)) {
                node.id.properties.forEach((property) => {
                  if (t.isIdentifier(property.key)) {
                    const varName = property.key.name;
                    const declarationNode = path.parentPath.node;
                    const isConstLetVar =
                      t.isVariableDeclaration(declarationNode) &&
                      ["const", "let", "var"].includes(declarationNode.kind);

                    if (
                      isConstLetVar &&
                      !shouldSkipVariable(varName, loggedVariables)
                    ) {
                      const insertPosition = document.positionAt(
                        declarationNode.end
                      );
                      const indent = getIndentation(
                        document,
                        document.positionAt(declarationNode.start).line
                      );
                      const context = getVariableContextForAST(path);
                      const logStatement = `$console.log('${context}${varName} =======================> ', ${varName});\n`;
                      edit.insert(document.uri, insertPosition, logStatement);
                      hasInsertions = true;
                      loggedVariables.add(varName);
                    }
                  }
                });
              } else if (t.isArrayPattern(node.id)) {
                node.id.elements.forEach((element) => {
                  if (t.isIdentifier(element)) {
                    const varName = element.name;
                    const declarationNode = path.parentPath.node;
                    const isConstLetVar =
                      t.isVariableDeclaration(declarationNode) &&
                      ["const", "let", "var"].includes(declarationNode.kind);

                    if (
                      isConstLetVar &&
                      !shouldSkipVariable(varName, loggedVariables)
                    ) {
                      const insertPosition = document.positionAt(
                        declarationNode.end
                      );
                      const indent = getIndentation(
                        document,
                        document.positionAt(declarationNode.start).line
                      );
                      const context = getVariableContextForAST(path);
                      const logStatement = `${indent}console.log('${context}${varName} --> okay', ${varName});\n`;
                      edit.insert(document.uri, insertPosition, logStatement);
                      hasInsertions = true;
                      loggedVariables.add(varName);
                    }
                  }
                });
              }
            },
            FunctionDeclaration(path) {
              // Log at the end of function bodies
              const node = path.node;
              if (node.body && node.body.end) {
                const endPosition = document.positionAt(node.body.end - 1); // Before the closing brace
                const indent = getIndentation(document, endPosition.line);
                const functionName = node.id
                  ? node.id.name
                  : "anonymous function";
                const logStatement = `${indent}console.log('${functionName} END --> okay');\n`;
                edit.insert(document.uri, endPosition, logStatement);
                hasInsertions = true;
              }
            },
            ArrowFunctionExpression(path) {
              // Log at the end of arrow function bodies (if block statement)
              const node = path.node;
              if (t.isBlockStatement(node.body) && node.body.end) {
                const endPosition = document.positionAt(node.body.end - 1); // Before the closing brace
                const indent = getIndentation(document, endPosition.line);
                const logStatement = `${indent}console.log('arrow function END --> okay');\n`;
                edit.insert(document.uri, endPosition, logStatement);
                hasInsertions = true;
              }
            },
            ClassMethod(path) {
              // Log at the end of class method bodies
              const node = path.node;
              if (node.body && node.body.end) {
                const endPosition = document.positionAt(node.body.end - 1); // Before the closing brace
                const indent = getIndentation(document, endPosition.line);
                const methodName = node.key.name;
                const logStatement = `${indent}console.log('${methodName} END --> okay');\n`;
                edit.insert(document.uri, endPosition, logStatement);
                hasInsertions = true;
              }
            },
          });
        } else {
          // Fallback to the older regex-based approach if no scope is found via AST
          const functionRange = getFunctionScopeRange(document, cursorPosition);
          if (functionRange) {
            const textInScope = document.getText(functionRange);
            hasInsertions = processVariablesWithRegex(
              document,
              functionRange,
              edit,
              loggedVariables,
              textInScope
            );
          } else {
            vscode.window.showInformationMessage(
              "Cursor must be inside a function or block to add logs."
            );
            return;
          }
        }

        if (!hasInsertions) {
          vscode.window.showInformationMessage(
            "No meaningful variables found to log in the current scope."
          );
          return;
        }

        await vscode.workspace.applyEdit(edit);
      } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
        console.error("Extension error:", error);
      }
    }
  );

  context.subscriptions.push(disposable);
}

function processVariablesWithRegex(
  document,
  functionRange,
  edit,
  loggedVariables,
  textInScope
) {
  let hasInsertions = false;
  const skipPatterns = new Set();

  // First pass: Identify skip patterns (same as before)
  const fullText = document.getText();
  const skipRegex =
    /(?:^|\n)(?:\s*)(?:export\s+)?(?:default\s+|function\s+|class\s+|interface\s+|type\s+|const\s+\[([a-zA-Z_$][\w$]*),\s*set\w+\]\s*=\s*useState|const\s+(\w+)\s*=\s*(?:\(\s*.*\s*\)\s*=>|function)|import\s+(?:\{[^}]*\}|\w+)\s+from|useEffect\s*\(|useReducer\s*\(|useState\s*\(|useContext\s*\(|useRef\s*\(|React.memo\s*\()/g;

  let skipMatch;
  while ((skipMatch = skipRegex.exec(fullText)) !== null) {
    if (skipMatch[1]) skipPatterns.add(skipMatch[1]);
    if (skipMatch[2]) skipPatterns.add(skipMatch[2]);
  }

  // Second pass: Process variables in current scope
  const varRegex =
    /(?:^|\n)(?:\s*)(const|let|var)\s+([a-zA-Z_$][\w$]*)\s*(?=\s*(?!function\b|\(\s*.*\s*\)\s*=>|\b(useEffect|useReducer|useState|useContext|useRef|React.memo)\b))/g;

  let varMatch;
  while ((varMatch = varRegex.exec(textInScope)) !== null) {
    const varName = varMatch[2];
    const indexInDoc = document.offsetAt(functionRange.start) + varMatch.index;
    const lineNumber = document.positionAt(indexInDoc).line;
    const line = document.lineAt(lineNumber);

    if (!shouldSkipVariable(varName, loggedVariables)) {
      const { insertPosition, indent } = getInsertPosition(
        document,
        lineNumber,
        line
      );
      const context = getVariableContext(document, lineNumber);
      const logStatement = `${indent}console.log('${context}${varName} --> okay', ${varName});\n`;
      edit.insert(document.uri, insertPosition, logStatement);
      hasInsertions = true;
      loggedVariables.add(varName);
    }
  }
  return hasInsertions;
}

function shouldSkipVariable(varName, loggedVariables) {
  return (
    varName.length <= 2 ||
    varName[0] === varName[0].toUpperCase() ||
    varName.startsWith("_") ||
    varName.startsWith("use") ||
    ["props", "context", "ref", "children"].includes(varName) ||
    loggedVariables.has(varName)
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
    insertPosition: new vscode.Position(
      insertLine,
      line.firstNonWhitespaceCharacterIndex
    ),
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

function getVariableContext(document, lineNumber) {
  for (let i = lineNumber; i >= 0; i--) {
    const line = document.lineAt(i).text;
    const funcMatch = line.match(/function\s+([a-zA-Z_$][\w$]*)/);
    const componentMatch = line.match(/const\s+([A-Z][a-zA-Z_$]*)\s*=/);
    const classMatch = line.match(/class\s+([a-zA-Z_$][\w$]*)/);

    if (funcMatch) return `${funcMatch[1]} > `;
    if (componentMatch) return `${componentMatch[1]} > `;
    if (classMatch) return `${classMatch[1]} > `;
  }
  return "";
}

function getVariableContextForAST(path) {
  let context = "";
  let current = path;
  while (current.parentPath) {
    const node = current.node;
    if (t.isFunctionDeclaration(node) && node.id) {
      context = `${node.id.name} > ` + context;
      break;
    } else if (t.isArrowFunctionExpression(node)) {
      context = `arrow function > ` + context;
      break;
    } else if (t.isClassMethod(node) && node.key.type === "Identifier") {
      context = `${node.key.name} > ` + context;
      break;
    } else if (t.isClassDeclaration(node) && node.id) {
      context = `${node.id.name} > ` + context;
      break;
    }
    current = current.parentPath;
  }
  return context;
}

function getIndentation(document, lineNumber) {
  return document.lineAt(lineNumber).text.match(/^\s*/)[0];
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
