const vscode = require("vscode");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const LogProvider = require("./LogProvider");

class JsTsProvider extends LogProvider {
  async insertConsoleLogs(editor, generateLogStatement) {
    const document = editor.document;
    const selection = editor.selection;
    const code = document.getText();
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
        ],
      });
    } catch (e) {
      vscode.window.showErrorMessage(
        "Failed to parse file. Please fix syntax errors.",
      );
      console.error(e);
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    const logOperations = [];

    traverse(ast, {
      enter: (path) => {
        if (path.isVariableDeclaration()) {
          const declarations = path.node.declarations;
          declarations.forEach((decl) => {
            const varsToLog = [];

            if (decl.id.type === "Identifier") {
              varsToLog.push(decl.id.name);
            } else if (decl.id.type === "ObjectPattern") {
              decl.id.properties.forEach((prop) => {
                if (
                  prop.type === "ObjectProperty" &&
                  prop.value.type === "Identifier"
                ) {
                  varsToLog.push(prop.value.name);
                } else if (
                  prop.type === "ObjectProperty" &&
                  prop.key.type === "Identifier" &&
                  prop.shorthand
                ) {
                  varsToLog.push(prop.key.name);
                }
              });
            } else if (decl.id.type === "ArrayPattern") {
              decl.id.elements.forEach((elem) => {
                if (elem && elem.type === "Identifier") {
                  varsToLog.push(elem.name);
                }
              });
            }

            if (varsToLog.length === 0) return;

            const insertLine = path.node.loc.end.line;
            const insertPos = new vscode.Position(insertLine, 0);

            varsToLog.forEach((varName) => {
              let inScope = false;

              if (!selection.isEmpty) {
                const selectedText = document.getText(selection).trim();
                if (varName === selectedText) {
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
              if (this.hasConsoleLogInScope(document, insertLine, varName))
                return;

              const contextName = this.getContextName(path);
              const lineText = document.lineAt(insertLine - 1).text;
              const indent = lineText.match(/^\s*/)?.[0] || "";

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
        // Pass a language specific log generator? Handled by common generateLogStatement for now.
      );
      edit.insert(op.uri, op.position, logStatement);
    }

    const success = await vscode.workspace.applyEdit(edit);
    if (!success) {
      vscode.window.showErrorMessage("Failed to insert logs.");
    }
  }

  getContextName(path) {
    let p = path.scope.path;
    const parts = [];

    while (p) {
      if (p.isFunctionDeclaration()) {
        if (p.node.id) parts.unshift(p.node.id.name);
      } else if (p.isClassMethod()) {
        if (p.node.key.type === "Identifier") parts.unshift(p.node.key.name);
      } else if (p.isVariableDeclarator()) {
        if (p.node.id.type === "Identifier") parts.unshift(p.node.id.name);
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
        "this",
        "window",
        "document",
      ].includes(varName)
    )
      return true;

    return false;
  }

  hasConsoleLogInScope(document, lineNumber, varName) {
    if (lineNumber < document.lineCount) {
      const nextLine = document.lineAt(lineNumber).text;
      if (nextLine.includes(`console.`) && nextLine.includes(varName))
        return true;
    }
    return false;
  }
}

module.exports = JsTsProvider;
