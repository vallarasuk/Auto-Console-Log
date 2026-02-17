const path = require("path");
const fs = require("fs");

// Mock VS Code
const vscodeMock = require("./mocks/vscode");
const Module = require("module");
const originalRequire = Module.prototype.require;

// Override require to serve vscode mock
Module.prototype.require = function (request) {
  if (request === "vscode") {
    return vscodeMock;
  }
  return originalRequire.apply(this, arguments);
};

// Now generic requires will work
const JsTsProvider = require("../providers/JsTsProvider");
const PythonProvider = require("../providers/PythonProvider");
const CheckProvider = require("../providers/LogProvider");

async function runTest(filePath, languageId) {
  console.log(`\nTesting ${path.basename(filePath)} (${languageId})...`);

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Create Mock Document
  const document = {
    uri: vscodeMock.Uri.file(filePath),
    fileName: filePath,
    languageId: languageId,
    getText: (range) => {
      if (!range) return content;
      // Simplified range text extraction (single line assumption for simplification)
      return "";
    },
    lineAt: (lineOrPos) => {
      let lineNum = typeof lineOrPos === "number" ? lineOrPos : lineOrPos.line;
      return {
        lineNumber: lineNum,
        text: lines[lineNum] || "",
        isEmptyOrWhitespace: (lines[lineNum] || "").trim().length === 0,
      };
    },
    positionAt: (offset) => {
      // Very naive positionAt implementation
      // Counting lines
      let count = 0;
      for (let i = 0; i < lines.length; i++) {
        if (count + lines[i].length + 1 > offset) {
          return new vscodeMock.Position(i, offset - count);
        }
        count += lines[i].length + 1; // +1 for newline
      }
      return new vscodeMock.Position(lines.length, 0);
    },
    lineCount: lines.length,
  };

  // Create Mock Editor
  const editor = {
    document: document,
    selection: {
      isEmpty: true,
      active: new vscodeMock.Position(0, 0),
    },
    edit: () => Promise.resolve(true),
  };
  vscodeMock.window.activeTextEditor = editor;

  // Load Provider
  let provider;
  try {
    switch (languageId) {
      case "javascript":
      case "typescript":
      case "javascriptreact":
      case "typescriptreact":
        provider = new JsTsProvider();
        break;
      case "python":
        provider = new (require("../providers/PythonProvider"))();
        break;
      case "java":
        provider = new (require("../providers/JavaProvider"))();
        break;
      case "csharp":
        provider = new (require("../providers/CSharpProvider"))();
        break;
      case "go":
        provider = new (require("../providers/GoProvider"))();
        break;
      case "php":
        provider = new (require("../providers/PhpProvider"))();
        break;
      case "cpp":
        provider = new (require("../providers/CppProvider"))();
        break;
      case "swift":
        provider = new (require("../providers/SwiftProvider"))();
        break;
      default:
        console.log("No test provider configured for", languageId);
        return;
    }
  } catch (e) {
    console.error(`Failed to load provider for ${languageId}:`, e.message);
    return;
  }

  // Capture edits
  let capturedEdits = [];
  const originalApplyEdit = vscodeMock.workspace.applyEdit;
  vscodeMock.workspace.applyEdit = async (edit) => {
    capturedEdits = edit.edits;
    return true;
  };

  // Run
  try {
    await provider.insertConsoleLogs(
      editor,
      async (doc, ctx, varName, indent) => {
        // Mock generator
        return `${indent}console.log('${varName}', ${varName}); // [ACL]\n`;
      },
    );
  } catch (e) {
    console.error("Test Error:", e);
    return false;
  }

  // Verify
  if (capturedEdits.length > 0) {
    console.log(
      "✅ PASSED: Generated",
      capturedEdits.length,
      "log insertions.",
    );
    capturedEdits.forEach((e) => {
      console.log(`   Line ${e.position.line}: ${e.newText.trim()}`);
    });
    return true;
  } else {
    console.log("❌ FAILED: No logs generated.");
    return false;
  }
}

async function main() {
  const testCases = [
    { path: "../test_files/test_destructuring.js", lang: "javascriptreact" },
    { path: "../test_files/test.py", lang: "python" },
    { path: "../test_files/Test.java", lang: "java" },
    { path: "../test_files/test.cs", lang: "csharp" },
    { path: "../test_files/test.go", lang: "go" },
    { path: "../test_files/test.php", lang: "php" },
    { path: "../test_files/test.cpp", lang: "cpp" },
    { path: "../test_files/test.swift", lang: "swift" },
  ];

  // Ensure C++ and Swift test files exist
  const docRoot = path.resolve(__dirname, "../test_files");
  if (!fs.existsSync(docRoot)) fs.mkdirSync(docRoot, { recursive: true });

  const cppPath = path.join(docRoot, "test.cpp");
  if (!fs.existsSync(cppPath)) {
    fs.writeFileSync(
      cppPath,
      `
#include <iostream>
int main() {
    int x = 10;
    auto y = 20;
    std::string z = "hello";
    return 0;
}
`,
    );
  }

  const swiftPath = path.join(docRoot, "test.swift");
  if (!fs.existsSync(swiftPath)) {
    fs.writeFileSync(
      swiftPath,
      `
var x = 10
let y = 20
`,
    );
  }

  console.log("🚀 Starting Automated Tests...\n");

  for (const test of testCases) {
    const absPath = path.resolve(__dirname, test.path);
    if (fs.existsSync(absPath)) {
      await runTest(absPath, test.lang);
    } else {
      console.warn(`Skipping missing test file: ${test.path}`);
    }
  }
  console.log("\n✨ Tests Completed.");
}

main();
