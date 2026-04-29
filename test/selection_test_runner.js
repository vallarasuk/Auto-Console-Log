const path = require("path");
const fs = require("fs");
const Module = require("module");

// ─── Mock VS Code ────────────────────────────────────────────────────────────
const vscodeMock = require("./mocks/vscode");
const originalRequire = Module.prototype.require;

let capturedCommands = {};

vscodeMock.commands.registerCommand = (commandId, handler) => {
    capturedCommands[commandId] = handler;
    return { dispose: () => {} };
};

Module.prototype.require = function (request) {
  if (request === "vscode") return vscodeMock;
  return originalRequire.apply(this, arguments);
};

// ─── Load Extension ───
const extension = require("../extension");
const context = { subscriptions: [], globalState: { get: () => true, update: () => {} } };
extension.activate(context);

// ─── Helpers ───
function buildDocument(content) {
  const lines = content.split("\n");
  return {
    uri: vscodeMock.Uri.file("test.js"),
    fileName: "test.js",
    languageId: "javascript",
    getText: (range) => {
        if (!range) return content;
        const start = range.start;
        const end = range.end;
        if (start.line === end.line) {
            return lines[start.line].substring(start.character, end.character);
        }
        // Simplified multiline getText
        return content;
    },
    lineAt: (lineNum) => {
      const text = lines[lineNum] || "";
      return {
        lineNumber: lineNum,
        text,
        range: { start: new vscodeMock.Position(lineNum, 0), end: new vscodeMock.Position(lineNum, text.length) },
        rangeIncludingLineBreak: { end: new vscodeMock.Position(lineNum, text.length + 1) },
      };
    },
    lineCount: lines.length,
  };
}

async function runSelectionTest(testName, content, selectionLine, varName, expectedLine) {
    process.stdout.write(`  Testing ${testName}... `);
    
    const document = buildDocument(content);
    const selection = new vscodeMock.Selection(
        new vscodeMock.Position(selectionLine, 0),
        new vscodeMock.Position(selectionLine, varName.length)
    );
    
    const editor = {
        document,
        selection,
        window: { activeTextEditor: true }
    };
    
    vscodeMock.window.activeTextEditor = editor;
    
    let insertedPos = null;
    // @ts-ignore
    vscodeMock.WorkspaceEdit = class {
        insert(uri, pos, _text) {
            insertedPos = pos;
        }
    };
    
    const handler = capturedCommands["extension.addConsoleLogForSelection"];
    if (!handler) {
        console.log("❌ FAILED (command not registered)");
        return false;
    }
    
    try {
        await handler();
    } catch (e) {
        console.log(`❌ FAILED (exception: ${e.message})`);
        return false;
    }
    
    // @ts-ignore
    if (insertedPos && insertedPos.line === expectedLine) {
        // @ts-ignore
        console.log(`✅ PASSED (inserted at line ${insertedPos.line})`);
        return true;
    } else {
        // @ts-ignore
        console.log(`❌ FAILED (expected line ${expectedLine}, got ${insertedPos ? insertedPos.line : 'null'})`);
        return false;
    }
}

async function main() {
    console.log("🚀 Selection Heuristic Test Suite\n");
    let passed = 0;
    let failed = 0;

    const chainedCode = fs.readFileSync(path.join(__dirname, "../test_files/test_chained_calls.js"), "utf8");
    if (await runSelectionTest("Chained Call Selection", chainedCode, 1, "data", 26)) passed++; else failed++;

    const ternaryCode = fs.readFileSync(path.join(__dirname, "../test_files/test_ternary_multiline.js"), "utf8");
    if (await runSelectionTest("Ternary Multiline Selection", ternaryCode, 1, "profileImage", 5)) passed++; else failed++;

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
}

main().catch(console.error);
