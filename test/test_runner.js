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

/**
 * Build a mock VS Code document from file content.
 */
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
      const lineNum =
        typeof lineOrPos === "number" ? lineOrPos : lineOrPos.line;
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
        const lineLen = lines[i].length + 1; // +1 for \n
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

/**
 * Build a mock editor with optional cursor position and selection.
 */
function buildEditor(document, cursorLine = 0, selectionText = null) {
  const selection = selectionText
    ? {
        isEmpty: false,
        active: new vscodeMock.Position(cursorLine, 0),
        getText: () => selectionText,
      }
    : {
        isEmpty: true,
        active: new vscodeMock.Position(cursorLine, 0),
      };

  // Patch document.getText to return selection text when range provided
  const originalGetText = document.getText.bind(document);
  document.getText = (range) => {
    if (!range && selectionText) return originalGetText();
    if (!range) return originalGetText();
    return selectionText || "";
  };

  return { document, selection };
}

/**
 * Mock log generator (simulates the JS/TS one from extension.js).
 */
async function mockLogGenerator(document, contextName, varName, indent) {
  return `${indent}console.log('${contextName}${varName} ---------------------------->', ${varName}); // [ACL]\n`;
}

/**
 * Run a single test case.
 */
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

  // Intercept WorkspaceEdit to capture insertions
  let capturedEdits = [];
  const originalApplyEdit = vscodeMock.workspace.applyEdit;
  vscodeMock.workspace.applyEdit = async (edit) => {
    capturedEdits = edit.edits || [];
    return true;
  };

  // Load provider
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
    await provider.insertConsoleLogs(editor, mockLogGenerator);
  } catch (e) {
    console.log(`❌ FAILED (exception: ${e.message})`);
    console.error("   ", e.stack);
    vscodeMock.workspace.applyEdit = originalApplyEdit;
    totalFailed++;
    return;
  }

  vscodeMock.workspace.applyEdit = originalApplyEdit;

  if (capturedEdits.length >= minExpected) {
    console.log(`✅ PASSED (${capturedEdits.length} insertions)`);
    capturedEdits.forEach((e) => {
      const preview = (e.newText || "").trim().substring(0, 80);
      console.log(`     Line ${e.position.line}: ${preview}`);
    });
    totalPassed++;
  } else if (capturedEdits.length > 0 && minExpected === 0) {
    console.log(`✅ PASSED (${capturedEdits.length} insertions)`);
    totalPassed++;
  } else if (capturedEdits.length === 0 && minExpected === 0) {
    console.log(`✅ PASSED (no insertions expected)`);
    totalPassed++;
  } else {
    console.log(
      `❌ FAILED (expected ≥${minExpected}, got ${capturedEdits.length})`,
    );
    totalFailed++;
  }
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

async function main() {
  const testDir = path.resolve(__dirname, "../test_files");

  console.log("🚀 Auto Console Log — Comprehensive Test Suite\n");
  console.log("=".repeat(60));

  // ── JavaScript / TypeScript ──────────────────────────────────
  console.log("\n📦 JavaScript / TypeScript");
  await runTest(
    "JS Basic",
    path.join(testDir, "test_js_basic.js"),
    "javascript",
    { minExpected: 3, description: "const/let/var declarations" },
  );
  await runTest(
    "JS Destructuring",
    path.join(testDir, "test_destructuring.js"),
    "javascriptreact",
    { minExpected: 1, description: "object & array destructuring" },
  );
  await runTest(
    "JS Arrow Fn",
    path.join(testDir, "test_js_arrow.js"),
    "javascript",
    { minExpected: 2, description: "arrow function context" },
  );
  await runTest("TS Basic", path.join(testDir, "test.ts"), "typescript", {
    minExpected: 3,
    description: "typed variables & interfaces",
  });
  await runTest(
    "TS Generics",
    path.join(testDir, "test_ts_generics.ts"),
    "typescript",
    { minExpected: 2, description: "generic types & async/await" },
  );

  // ── Python ───────────────────────────────────────────────────
  console.log("\n🐍 Python");
  await runTest("Python Basic", path.join(testDir, "test.py"), "python", {
    minExpected: 3,
    description: "assignments & function args",
  });
  await runTest(
    "Python Advanced",
    path.join(testDir, "test_python_advanced.py"),
    "python",
    { minExpected: 4, description: "for loops, with, *args" },
  );

  // ── Java ─────────────────────────────────────────────────────
  console.log("\n☕ Java");
  await runTest("Java Basic", path.join(testDir, "Test.java"), "java", {
    minExpected: 2,
    description: "typed declarations",
  });
  await runTest(
    "Java Advanced",
    path.join(testDir, "test_java_advanced.java"),
    "java",
    { minExpected: 3, description: "generics, loops, methods" },
  );

  // ── C# ───────────────────────────────────────────────────────
  console.log("\n🔷 C#");
  await runTest("C# Basic", path.join(testDir, "test.cs"), "csharp", {
    minExpected: 2,
    description: "typed declarations",
  });
  await runTest(
    "C# Advanced",
    path.join(testDir, "test_cs_advanced.cs"),
    "csharp",
    { minExpected: 3, description: "var, generics, foreach" },
  );

  // ── Go ───────────────────────────────────────────────────────
  console.log("\n🐹 Go");
  await runTest("Go Basic", path.join(testDir, "test.go"), "go", {
    minExpected: 2,
    description: "var & short declarations",
  });
  await runTest(
    "Go Multi-var",
    path.join(testDir, "test_go_advanced.go"),
    "go",
    { minExpected: 3, description: "multi-var :=, for-range" },
  );

  // ── PHP ──────────────────────────────────────────────────────
  console.log("\n🐘 PHP");
  await runTest("PHP Basic", path.join(testDir, "test.php"), "php", {
    minExpected: 1,
    description: "$variable assignments",
  });
  await runTest(
    "PHP Advanced",
    path.join(testDir, "test_php_advanced.php"),
    "php",
    { minExpected: 3, description: "functions, foreach" },
  );

  // ── C++ ──────────────────────────────────────────────────────
  console.log("\n⚙️  C++");
  await runTest("C++ Basic", path.join(testDir, "test.cpp"), "cpp", {
    minExpected: 2,
    description: "typed declarations & auto",
  });
  await runTest(
    "C++ Advanced",
    path.join(testDir, "test_cpp_advanced.cpp"),
    "cpp",
    { minExpected: 3, description: "const, std types, pointers" },
  );

  // ── Swift ────────────────────────────────────────────────────
  console.log("\n🍎 Swift");
  await runTest("Swift Basic", path.join(testDir, "test.swift"), "swift", {
    minExpected: 1,
    description: "var/let declarations",
  });
  await runTest(
    "Swift Advanced",
    path.join(testDir, "test_swift_advanced.swift"),
    "swift",
    { minExpected: 3, description: "type annotations, guard let" },
  );

  // ── Summary ──────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 Results: ${totalPassed} passed, ${totalFailed} failed`);
  if (totalFailed === 0) {
    console.log("🎉 All tests passed!\n");
    process.exit(0);
  } else {
    console.log("❌ Some tests failed. See above for details.\n");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal test error:", e);
  process.exit(1);
});
