class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
  translate(lineNumberDelta = 0, characterDelta = 0) {
    return new Position(this.line + lineNumberDelta, this.character + characterDelta);
  }
  with(line = this.line, character = this.character) {
    return new Position(line, character);
  }
  isBefore(other) { return this.line < other.line || (this.line === other.line && this.character < other.character); }
  isBeforeOrEqual(other) { return this.line < other.line || (this.line === other.line && this.character <= other.character); }
  isAfter(other) { return !this.isBeforeOrEqual(other); }
  isAfterOrEqual(other) { return !this.isBefore(other); }
  isEqual(other) { return this.line === other.line && this.character === other.character; }
  compareTo(other) { return this.isEqual(other) ? 0 : (this.isBefore(other) ? -1 : 1); }
}

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
    this.isEmpty = start.isEqual(end);
    this.isSingleLine = start.line === end.line;
  }
  contains(_positionOrRange) { return true; } // Mocked
  isEqual(other) { return this.start.isEqual(other.start) && this.end.isEqual(other.end); }
  intersection(_range) { return this; }
  union(_range) { return this; }
  with(start = this.start, end = this.end) { return new Range(start, end); }
}

class Selection extends Range {
  constructor(anchor, active) {
    super(anchor.isBefore(active) ? anchor : active, anchor.isBefore(active) ? active : anchor);
    this.anchor = anchor;
    this.active = active;
    this.isReversed = anchor.isAfter(active);
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
  applyEdit: async (_edit) => {
    return true;
  },
  getConfiguration: () => ({
    get: (_key) => null,
  }),
};

const StatusBarAlignment = { Left: 1, Right: 2 };

const commands = {
  registerCommand: (_commandId, _handler) => ({ dispose: () => {} }),
};

module.exports = {
  Position,
  Range,
  Selection,
  Uri,
  WorkspaceEdit,
  window,
  workspace,
  commands,
  StatusBarAlignment,
};
