class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}

class Uri {
  constructor(path) {
    this.path = path;
    this.fsPath = path;
  }
  static file(path) {
    return new Uri(path);
  }
}

class WorkspaceEdit {
  constructor() {
    this.edits = [];
  }
  insert(uri, position, newText) {
    this.edits.push({ type: "insert", uri, position, newText });
  }
  delete(uri, range) {
    this.edits.push({ type: "delete", uri, range });
  }
}

const window = {
  showErrorMessage: (msg) => console.error("[Mock VSCode Error]", msg),
  showInformationMessage: (msg) => console.log("[Mock VSCode Info]", msg),
  activeTextEditor: null, // Set this in test runner
};

const workspace = {
  applyEdit: async (edit) => {
    // console.log("[Mock VSCode] applyEdit called with", edit.edits.length, "edits");
    return true;
  },
  getConfiguration: () => ({
    get: (key) => null,
  }),
};

module.exports = {
  Position,
  Range,
  Uri,
  WorkspaceEdit,
  window,
  workspace,
  StatusBarAlignment: { Right: 1 },
};
