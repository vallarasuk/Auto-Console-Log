const path = require("path");
const fs = require("fs");

// ─── Mock VS Code ────────────────────────────────────────────────────────────
const vscodeMock = require("./mocks/vscode");
const Module = require("module");
const originalRequire = Module.prototype.require;

Module.prototype.require = function (request) {
  if (request === "vscode") return vscodeMock;
  return originalRequire.apply(this, arguments);
};

// ─── Utils ───
const { generateLogStatement } = require("../lib/utils");

// ─── Providers ───────────────────────────────────────────────────────────────
const JsTsProvider = require("../providers/JsTsProvider");
const PythonProvider = require("../providers/PythonProvider");
const JavaProvider = require("../providers/JavaProvider");
const CSharpProvider = require("../providers/CSharpProvider");
const GoProvider = require("../providers/GoProvider");
const PhpProvider = require("../providers/PhpProvider");
const CppProvider = require("../providers/CppProvider");
const SwiftProvider = require("../providers/SwiftProvider");

// ─── Test Counters ───────────────────────────────────────────────────────────
let totalPassed = 0;
let totalFailed = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDocument(filePath, content) {
  const lines = content.split("\n");
  return {
    uri: vscodeMock.Uri.file(filePath),
    fileName: filePath,
    getText: (range) => {
      if (!range) return content;
      return "";
    },
    lineAt: (lineOrPos) => {
      const lineNum = typeof lineOrPos === "number" ? lineOrPos : lineOrPos.line;
      const text = lines[lineNum] || "";
      return {
        lineNumber: lineNum,
        text,
        isEmptyOrWhitespace: text.trim().length === 0,
        rangeIncludingLineBreak: new vscodeMock.Range(
          new vscodeMock.Position(lineNum, 0),
          new vscodeMock.Position(lineNum + 1, 0),
        ),
      };
    },
    positionAt: (offset) => {
      let count = 0;
      for (let i = 0; i < lines.length; i++) {
        const lineLen = lines[i].length + 1;
        if (count + lineLen > offset) {
          return new vscodeMock.Position(i, offset - count);
        }
        count += lineLen;
      }
      return new vscodeMock.Position(lines.length, 0);
    },
    offsetAt: (position) => {
      let offset = 0;
      for (let i = 0; i < position.line && i < lines.length; i++) {
        offset += lines[i].length + 1;
      }
      offset += position.character;
      return offset;
    },
    lineCount: lines.length,
  };
}

function buildEditor(document, cursorLine = 0, selectionText = null) {
  const selection = selectionText
    ? {
        isEmpty: false,
        start: new vscodeMock.Position(cursorLine, 0),
        end: new vscodeMock.Position(cursorLine, selectionText.length), // Crude but enough for tests
        active: new vscodeMock.Position(cursorLine, 0),
        getText: () => selectionText,
      }
    : {
        isEmpty: true,
        active: new vscodeMock.Position(cursorLine, 0),
      };

  const originalGetText = document.getText.bind(document);
  document.getText = (range) => {
    if (!range) return originalGetText();
    return selectionText || "";
  };

  return { document, selection, options: { tabSize: 4, insertSpaces: true } };
}

async function runTest(testName, filePath, languageId, options = {}) {
  const {
    cursorLine = 0,
    selectionText = null,
    minExpected = 1,
    description = "",
  } = options;

  const label = description ? `${testName} — ${description}` : testName;
  process.stdout.write(`  Testing ${label}... `);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  SKIPPED (file not found: ${path.basename(filePath)})`);
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const document = buildDocument(filePath, content);
  const editor = buildEditor(document, cursorLine, selectionText);

  let capturedEdits = [];
  const originalApplyEdit = vscodeMock.workspace.applyEdit;
  vscodeMock.workspace.applyEdit = async (edit) => {
    capturedEdits = edit.edits || [];
    return true;
  };

  let provider;
  switch (languageId) {
    case "javascript":
    case "typescript":
    case "javascriptreact":
    case "typescriptreact":
      provider = new JsTsProvider();
      break;
    case "python":
      provider = new PythonProvider();
      break;
    case "java":
      provider = new JavaProvider();
      break;
    case "csharp":
      provider = new CSharpProvider();
      break;
    case "go":
      provider = new GoProvider();
      break;
    case "php":
      provider = new PhpProvider();
      break;
    case "cpp":
      provider = new CppProvider();
      break;
    case "swift":
      provider = new SwiftProvider();
      break;
    default:
      console.log(`⚠️  SKIPPED (no provider for ${languageId})`);
      vscodeMock.workspace.applyEdit = originalApplyEdit;
      return;
  }

  try {
    await provider.insertConsoleLogs(editor, generateLogStatement);
  } catch (e) {
    console.log(`❌ FAILED (exception: ${e.message})`);
    vscodeMock.workspace.applyEdit = originalApplyEdit;
    totalFailed++;
    return;
  }

  vscodeMock.workspace.applyEdit = originalApplyEdit;

  if (capturedEdits.length >= minExpected) {
    console.log(`✅ PASSED (${capturedEdits.length} insertions)`);
    totalPassed++;
  } else {
    console.log(`❌ FAILED (expected ≥${minExpected}, got ${capturedEdits.length})`);
    totalFailed++;
  }
}

async function main() {
  const testDir = path.resolve(__dirname, "../test_files");

  console.log("🚀 Auto Console Log — Comprehensive Test Suite\n");
  console.log("=".repeat(60));

  console.log("\n📦 JavaScript / TypeScript");
  await runTest("JS Basic", path.join(testDir, "test_js_basic.js"), "javascript", { minExpected: 3 });
  await runTest("JS Destructuring", path.join(testDir, "test_destructuring.js"), "javascriptreact", { minExpected: 1 });
  await runTest("JS Arrow Fn", path.join(testDir, "test_js_arrow.js"), "javascript", { minExpected: 2 });

  console.log("\n🐍 Python");
  await runTest("Python Basic", path.join(testDir, "test.py"), "python", { minExpected: 3 });

  console.log("\n☕ Java");
  await runTest("Java Basic", path.join(testDir, "Test.java"), "java", { minExpected: 2 });

  console.log("\n🔷 C#");
  await runTest("C# Basic", path.join(testDir, "test.cs"), "csharp", { minExpected: 2 });

  console.log("\n🐹 Go");
  await runTest("Go Basic", path.join(testDir, "test.go"), "go", { minExpected: 2 });

  console.log("\n🐘 PHP");
  await runTest("PHP Basic", path.join(testDir, "test.php"), "php", { minExpected: 1 });

  console.log("\n⚙️  C++");
  await runTest("C++ Basic", path.join(testDir, "test.cpp"), "cpp", { minExpected: 2 });

  console.log("\n🍎 Swift");
  await runTest("Swift Basic", path.join(testDir, "test.swift"), "swift", { minExpected: 1 });

  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 Results: ${totalPassed} passed, ${totalFailed} failed`);
  process.exit(totalFailed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal test error:", e);
  process.exit(1);
});
