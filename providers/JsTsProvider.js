const vscode = require("vscode");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const LogProvider = require("./LogProvider");

class JsTsProvider extends LogProvider {
  /**
   * @param {vscode.TextEditor} editor
   * @param {Function} generateLogStatement
   */
  async insertConsoleLogs(editor, generateLogStatement) {
    const document = editor.document;
    const selection = editor.selection;
    const code = document.getText();
    let ast;

    try {
      ast = parser.parse(code, {
        sourceType: "module",
        plugins: [
          "jsx", "typescript", "classProperties", "decorators-legacy",
          "dynamicImport", "optionalChaining", "nullishCoalescingOperator",
        ],
        errorRecovery: true,
      });
    } catch {
      vscode.window.showErrorMessage("Failed to parse file. Please fix syntax errors first.");
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    const logOperations = [];
    const scheduled = new Set();

    traverse(ast, {
      VariableDeclaration: (path) => {
        path.node.declarations.forEach((decl) => {
          this.collectLogOps(path, decl.id, document, selection, editor, scheduled, logOperations);
        });
      },
      "FunctionDeclaration|ArrowFunctionExpression|FunctionExpression|ClassMethod|ObjectMethod": (path) => {
        const params = path.node.params || [];
        params.forEach((param) => {
          this.collectLogOps(path, param, document, selection, editor, scheduled, logOperations);
        });
      },
    });

    if (logOperations.length === 0) {
      vscode.window.showInformationMessage("No variables found to log.");
      return;
    }

    for (const op of logOperations) {
      let logStatement = await generateLogStatement(
        document,
        op.contextName,
        op.varName,
        op.indent,
        op.declarationLine
      );

      if (op.isInsideJSX) {
        const trimmed = logStatement.trim();
        const suffix = trimmed.endsWith(";") ? "" : ";";
        logStatement = `${op.indent}{${trimmed}${suffix}}${op.suffix || ""}\n`;
      }

      const finalLogStatement = op.position.character > 0 ? "\n" + logStatement : logStatement;
      edit.insert(op.uri, op.position, finalLogStatement);
    }

    await vscode.workspace.applyEdit(edit);
  }

  collectLogOps(path, idNode, document, selection, editor, scheduled, logOperations) {
    const varsToLog = [];
    this.collectVarsFromPattern(idNode, varsToLog);

    if (varsToLog.length === 0) return;

    let insertLine = this.resolveInsertLine(document, path.node.loc.end.line - 1);
    let endLineIndex = path.node.loc.end.line - 1;
    const lineText = document.lineAt(endLineIndex).text;
    const textAfterDecl = lineText.substring(path.node.loc.end.column).trim();

    let insertPos = new vscode.Position(insertLine, 0);
    let indent = document.lineAt(insertLine > 0 ? insertLine - 1 : 0).text.match(/^\s*/)?.[0] || "";

    const isTerminalAfter = /(?:^|\s|;|{)(return|throw|break|continue)\b/.test(textAfterDecl);
    if (isTerminalAfter) {
      insertPos = new vscode.Position(endLineIndex, path.node.loc.end.column);
    }

    const isInsideJSX = this.isInsideJSXContext(path);

    varsToLog.forEach((varName) => {
      let inScope = false;

      if (!selection.isEmpty) {
        const selectedText = document.getText(selection).trim();
        if (varName === selectedText || (selectedText.length > 2 && selectedText.includes(varName))) {
          inScope = true;
        }
      } else {
        const cursorLine = editor.selection.active.line;
        let block = path.scope.block;
        
        if (path.isFunction()) {
            block = path.node;
        }

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

      if (!inScope || this.shouldSkipVariable(varName)) return;

      const key = `${insertLine}:${varName}`;
      if (scheduled.has(key) || this.hasConsoleLogInScope(document, insertLine, varName)) return;

      scheduled.add(key);
      const contextName = this.getContextName(path);

      logOperations.push({
        uri: document.uri,
        position: insertPos,
        contextName,
        varName,
        indent,
        declarationLine: path.node.loc.end.line - 1,
        isInsideJSX,
        suffix: document.lineAt(insertLine > 0 ? insertLine - 1 : 0).text.endsWith(";") ? "" : ""
      });
    });
  }

  isInsideJSXContext(path) {
    if (!path) return false;
    const parent = path.parentPath;
    if (parent && (parent.isJSXElement() || parent.isJSXFragment())) {
      return true;
    }
    return false;
  }


  /**
   * Enhanced selection logging using AST to find insertion point.
   */
  async insertLogForSelection(editor, varName, generateLogStatement) {
      const document = editor.document;
      const selection = editor.selection;
      const code = document.getText();
      let ast;

      try {
          ast = parser.parse(code, {
              sourceType: "module",
              plugins: ["jsx", "typescript", "classProperties", "decorators-legacy", "dynamicImport", "optionalChaining", "nullishCoalescingOperator"],
              errorRecovery: true,
          });
      } catch {
        return false; // Fallback to heuristic
    }



      let bestPath = null;
      traverse(ast, {
          enter(path) {
              if (path.node.loc && path.node.loc.start.line - 1 <= selection.start.line && path.node.loc.end.line - 1 >= selection.end.line) {
                  if (!bestPath || (path.node.loc.end.line - path.node.loc.start.line < bestPath.node.loc.end.line - bestPath.node.loc.start.line)) {
                      bestPath = path;
                  }
              }
          }
      });

      if (!bestPath) return false;

      /** @type {any} */
      let statementPath = bestPath;
      while (statementPath && !statementPath.isStatement() && !statementPath.isDeclaration() && 
             !statementPath.isJSXElement() && !statementPath.isJSXFragment() && !statementPath.isJSXExpressionContainer() &&
             statementPath.parentPath) {
          statementPath = statementPath.parentPath;
      }

      if (!statementPath || !statementPath.node.loc) return false;

      const endLine = this.resolveInsertLine(document, statementPath.node.loc.end.line - 1);
      const startLineIndex = statementPath.node.loc.start.line - 1;


      let indent = document.lineAt(startLineIndex).text.match(/^\s*/)?.[0] || "";

      // Try to match indentation of the content if it's deeper
      if (endLine > startLineIndex + 1) {
          const contentIndent = document.lineAt(startLineIndex + 1).text.match(/^\s*/)?.[0] || "";
          if (contentIndent.length > indent.length) {
              indent = contentIndent;
          }
      }

      const contextName = this.getContextName(statementPath);
      const isInsideJSX = this.isInsideJSXContext(statementPath);
      
      let logStatement = await generateLogStatement(document, contextName, varName, indent, selection.start.line);
      
      if (isInsideJSX) {
        const trimmed = logStatement.trim();
        const suffix = trimmed.endsWith(";") ? "" : ";";
        logStatement = `${indent}{${trimmed}${suffix}}\n`;
      }

      const edit = new vscode.WorkspaceEdit();
      edit.insert(document.uri, new vscode.Position(endLine, 0), logStatement);
      return await vscode.workspace.applyEdit(edit);
  }



  collectVarsFromPattern(node, result) {
    if (!node) return;
    switch (node.type) {
      case "Identifier": result.push(node.name); break;
      case "ObjectPattern":
        node.properties.forEach((prop) => {
          if (prop.type === "RestElement") this.collectVarsFromPattern(prop.argument, result);
          else if (prop.type === "ObjectProperty") this.collectVarsFromPattern(prop.value, result);
        });
        break;
      case "ArrayPattern":
        node.elements.forEach((elem) => {
          if (elem) this.collectVarsFromPattern(elem.type === "RestElement" ? elem.argument : elem, result);
        });
        break;
      case "AssignmentPattern": this.collectVarsFromPattern(node.left, result); break;
    }
  }

  getContextName(path) {
    let p = path.scope.path;
    const parts = [];
    while (p) {
      if (p.isFunctionDeclaration()) { if (p.node.id) parts.unshift(p.node.id.name); }
      else if (p.isArrowFunctionExpression() || p.isFunctionExpression()) {
        const parent = p.parentPath;
        if (parent && parent.isVariableDeclarator() && parent.node.id && parent.node.id.type === "Identifier") parts.unshift(parent.node.id.name);
        else if (parent && parent.isObjectProperty() && parent.node.key && parent.node.key.type === "Identifier") parts.unshift(parent.node.key.name);
      } else if (p.isClassMethod() || p.isObjectMethod()) {
        if (p.node.key && p.node.key.type === "Identifier") parts.unshift(p.node.key.name);
      } else if (p.isClassDeclaration() || p.isClassExpression()) {
        if (p.node.id) parts.unshift(p.node.id.name);
      }
      p = p.parentPath;
      if (!p || p.isProgram()) break;
    }
    return parts.length > 0 ? parts.join(" > ") + " > " : "";
  }

  shouldSkipVariable(varName) {
    if (super.shouldSkipVariable(varName)) return true;
    return ["props", "context", "ref", "children", "window", "document", "module", "exports", "require", "process", "console", "global", "Symbol", "Promise", "Array", "Object", "Number", "String", "Boolean", "Math", "Date", "RegExp", "Error", "Map", "Set", "WeakMap", "WeakSet", "JSON"].includes(varName);
  }

  hasConsoleLogInScope(document, lineNumber, varName) {
    const windowSize = 5;
    const end = Math.min(lineNumber + windowSize, document.lineCount);
    for (let i = lineNumber; i < end; i++) {
        const lineText = document.lineAt(i).text;
        if (lineText.includes("console.") && lineText.includes(varName)) return true;
    }
    return false;
  }
}

module.exports = JsTsProvider;
