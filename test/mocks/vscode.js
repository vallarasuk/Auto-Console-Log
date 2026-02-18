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
    this.scheme = "file";
  }
  static file(path) {
    return new Uri(path);
  }
  toString() {
    return `file://${this.path}`;
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
  replace(uri, range, newText) {
    this.edits.push({ type: "replace", uri, range, newText });
  }
}

const window = {
  showErrorMessage: (msg) => {
    console.error("[VSCode Error]", msg);
    return Promise.resolve();
  },
  showInformationMessage: (msg) => {
    console.log("[VSCode Info]", msg);
    return Promise.resolve();
  },
  showWarningMessage: (msg) => {
    console.warn("[VSCode Warn]", msg);
    return Promise.resolve();
  },
  activeTextEditor: null,
};

const workspace = {
  applyEdit: async (edit) => {
    return true;
  },
  getConfiguration: () => ({
    get: (key) => null,
  }),
};

const StatusBarAlignment = { Left: 1, Right: 2 };

module.exports = {
  Position,
  Range,
  Uri,
  WorkspaceEdit,
  window,
  workspace,
  StatusBarAlignment,
};
