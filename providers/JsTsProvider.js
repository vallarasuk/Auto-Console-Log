const vscode = require("vscode");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const LogProvider = require("./LogProvider");

class JsTsProvider extends LogProvider {
  async insertConsoleLogs(editor, generateLogStatement) {
    const document = editor.document;
    const selection = editor.selection;
    const code = document.getText();
    /** @type {any} */
    let ast;

    try {
      ast = parser.parse(code, {
        sourceType: "module",
        plugins: [
          "jsx",
          "typescript",
          "classProperties",
          "decorators-legacy",
          "dynamicImport",
          "optionalChaining",
          "nullishCoalescingOperator",
        ],
        errorRecovery: true,
      });
    } catch (e) {
      vscode.window.showErrorMessage(
        "Failed to parse file. Please fix syntax errors first.",
      );
      console.error(e);
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    const logOperations = [];
    // Track already-scheduled (line, varName) pairs to avoid duplicates
    const scheduled = new Set();

    traverse(ast, {
      enter: (path) => {
        if (path.isVariableDeclaration()) {
          const declarations = path.node.declarations;
          declarations.forEach((decl) => {
            const varsToLog = [];
            this.collectVarsFromPattern(decl.id, varsToLog);

            if (varsToLog.length === 0) return;

            // Babel loc.end.line is 1-based.
            const endLineIndex = path.node.loc.end.line - 1;
            const lineText = document.lineAt(endLineIndex).text;
            const textAfterDecl = lineText
              .substring(path.node.loc.end.column)
              .trim();

            let insertLine = path.node.loc.end.line;
            let insertPos = new vscode.Position(insertLine, 0);
            let indent = lineText.match(/^\s*/)?.[0] || "";

            // If there's a terminal statement on the same line after the declaration,
            // we should try to insert the log BEFORE that statement.
            // For simplicity and to avoid complex line splitting, if we detect
            // a terminal keyword on the same line, we insert the log ON THE PREVIOUS LINE
            // if the declaration started on a previous line, OR we just accept it might be tricky.
            // Actually, the most robust way is to check if the NEXT statement is a return.

            // We check for terminal keywords that are NOT property-like (not preceded by a dot).
            const isTerminalAfter =
              /(?:^|\s|;|{)(return|throw|break|continue)\b/.test(textAfterDecl);
            if (isTerminalAfter) {
              // Insert AFTER the declaration semicolon but BEFORE the rest of the line
              insertPos = new vscode.Position(
                endLineIndex,
                path.node.loc.end.column,
              );
              // Mark this op to prepend a newline so it doesn't stay on the same line as the decl
              // We'll manage this by passing a slightly modified indent
            }

            varsToLog.forEach((varName) => {
              let inScope = false;

              if (!selection.isEmpty) {
                const selectedText = document.getText(selection).trim();
                // Support selecting just the variable name or the whole declaration
                if (
                  varName === selectedText ||
                  selectedText.includes(varName)
                ) {
                  inScope = true;
                }
              } else {
                const cursorLine = editor.selection.active.line;
                const block = path.scope.block;

                if (block.type === "Program") {
                  inScope = true;
                } else if (block.loc) {
                  const blockStart = block.loc.start.line - 1;
                  const blockEnd = block.loc.end.line - 1;
                  if (cursorLine >= blockStart && cursorLine <= blockEnd) {
                    inScope = true;
                  }
                }
              }

              if (!inScope) return;
              if (this.shouldSkipVariable(varName)) return;

              const key = `${insertLine}:${varName}`;
              if (scheduled.has(key)) return;
              if (this.hasConsoleLogInScope(document, insertLine, varName))
                return;

              scheduled.add(key);

              const contextName = this.getContextName(path);

              logOperations.push({
                uri: document.uri,
                position: insertPos,
                contextName,
                varName,
                indent,
              });
            });
          });
        }
      },
    });

    if (logOperations.length === 0) {
      vscode.window.showInformationMessage("No variables found to log.");
      return;
    }

    for (const op of logOperations) {
      const logStatement = await generateLogStatement(
        document,
        op.contextName,
        op.varName,
        op.indent,
      );

      // If we are inserting at a column (same-line terminal statement),
      // prepend a newline to the log statement.
      const finalLogStatement =
        op.position.character > 0 ? "\n" + logStatement : logStatement;

      edit.insert(op.uri, op.position, finalLogStatement);
    }

    const success = await vscode.workspace.applyEdit(edit);
    if (!success) {
      vscode.window.showErrorMessage("Failed to insert logs.");
    }
  }

  /**
   * Recursively collect variable names from any pattern node.
   * Handles: Identifier, ObjectPattern, ArrayPattern, RestElement, AssignmentPattern.
   */
  collectVarsFromPattern(node, result) {
    if (!node) return;

    switch (node.type) {
      case "Identifier":
        result.push(node.name);
        break;

      case "ObjectPattern":
        node.properties.forEach((prop) => {
          if (prop.type === "RestElement") {
            // const { a, ...rest } = obj  →  log 'rest'
            this.collectVarsFromPattern(prop.argument, result);
          } else if (prop.type === "ObjectProperty") {
            // const { key: value } = obj  →  log 'value'
            // const { key } = obj  →  log 'key' (shorthand)
            this.collectVarsFromPattern(prop.value, result);
          }
        });
        break;

      case "ArrayPattern":
        node.elements.forEach((elem) => {
          if (elem) {
            if (elem.type === "RestElement") {
              this.collectVarsFromPattern(elem.argument, result);
            } else {
              this.collectVarsFromPattern(elem, result);
            }
          }
        });
        break;

      case "AssignmentPattern":
        // const { a = defaultVal } = obj  →  log 'a'
        this.collectVarsFromPattern(node.left, result);
        break;

      default:
        break;
    }
  }

  /**
   * Build a human-readable context name like "MyClass > myMethod > "
   */
  getContextName(path) {
    let p = path.scope.path;
    const parts = [];

    while (p) {
      if (p.isFunctionDeclaration()) {
        if (p.node.id) parts.unshift(p.node.id.name);
      } else if (p.isArrowFunctionExpression() || p.isFunctionExpression()) {
        // Arrow / function expression: look at the parent for a name
        const parent = p.parentPath;
        if (parent && parent.isVariableDeclarator() && parent.node.id) {
          if (parent.node.id.type === "Identifier") {
            parts.unshift(parent.node.id.name);
          }
        } else if (parent && parent.isObjectProperty()) {
          if (parent.node.key && parent.node.key.type === "Identifier") {
            parts.unshift(parent.node.key.name);
          }
        } else if (parent && parent.isAssignmentExpression()) {
          if (
            parent.node.left &&
            parent.node.left.type === "MemberExpression"
          ) {
            parts.unshift(parent.node.left.property.name || "");
          }
        }
      } else if (p.isClassMethod() || p.isObjectMethod()) {
        if (p.node.key && p.node.key.type === "Identifier") {
          parts.unshift(p.node.key.name);
        }
      } else if (p.isClassDeclaration() || p.isClassExpression()) {
        if (p.node.id) parts.unshift(p.node.id.name);
      }

      p = p.parentPath;
      if (!p || p.isProgram()) break;
    }

    return parts.length > 0 ? parts.join(" > ") + " > " : "";
  }

  shouldSkipVariable(varName) {
    // Check base specific skips first
    if (super.shouldSkipVariable(varName)) return true;

    // JS/React specific skips
    if (
      [
        "props",
        "context",
        "ref",
        "children",
        "window",
        "document",
        "module",
        "exports",
        "require",
        "process",
        "console",
        "global",
        "Symbol",
        "Promise",
        "Array",
        "Object",
        "Number",
        "String",
        "Boolean",
        "Math",
        "Date",
        "RegExp",
        "Error",
        "Map",
        "Set",
        "WeakMap",
        "WeakSet",
        "JSON",
      ].includes(varName)
    )
      return true;

    return false;
  }

  /**
   * Check if a console.log for varName already exists within a few lines of insertLine.
   */
  hasConsoleLogInScope(document, lineNumber, varName) {
    const windowSize = 5;
    const end = Math.min(lineNumber + windowSize, document.lineCount);
    for (let i = lineNumber; i < end; i++) {
      const lineText = document.lineAt(i).text;
      if (lineText.includes("console.") && lineText.includes(varName)) {
        return true;
      }
    }
    return false;
  }
}

module.exports = JsTsProvider;
