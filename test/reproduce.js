const vscodeMock = require("../test/mocks/vscode");
const JsTsProvider = require("../providers/JsTsProvider");

// Our mock generator
async function mockLogGenerator(document, contextName, varName, indent) {
  return `${indent}console.log('${contextName}${varName} ---------------------------->', ${varName}); // [ACL]\n`;
}

// Build a simple mock document
const content = `
const endpoints = () => ({ accountEntryReportAPI: '/api' });
const ArrayList = { toQueryString: () => '' };
const Url = { get: () => {} };

class Test {
  static search = async (params) => {
    let queryString = await ArrayList.toQueryString(params);
    let response = await Url.get(
      \`\${endpoints().accountEntryReportAPI}/search\`,
      queryString
    );
    return response;
  }
}
`;

function run() {
  const lines = content.split("\n");
  const document = {
    uri: "file:///test.js",
    getText: () => content,
    lineAt: (lineNum) => {
      const text = lines[lineNum] || "";
      return { text, lineNumber: lineNum };
    },
    lineCount: lines.length,
  };

  // Cursor on line 9 ("let response = ...")
  const editor = {
    document,
    selection: { isEmpty: true, active: { line: 9, character: 0 } },
  };

  const provider = new JsTsProvider();

  // We mock vscode.WorkspaceEdit
  const inserted = [];
  vscodeMock.WorkspaceEdit = class {
    insert(uri, pos, text) {
      inserted.push({ uri, pos, text });
    }
  };
  vscodeMock.workspace = {
    applyEdit: async () => true,
  };

  provider
    .insertConsoleLogs(editor, mockLogGenerator)
    .then(() => {
      console.log("Inserted logs:", inserted);
    })
    .catch((e) => console.error(e));
}

run();
