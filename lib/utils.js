const vscode = require("vscode");
const path = require("path");

/**
 * Clean varName for use inside a single-line string literal
 */
function escapeVarName(varName) {
  return varName
    .replace(/\r?\n|\r/g, " ")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

/**
 * Log Statement Generator
 */
async function generateLogStatement(
  document,
  contextName,
  varName,
  indent,
  lineNumber,
) {
  const config = vscode.workspace.getConfiguration(
    "autoConsoleLogByVallarasuKanthasamy",
  );
  const logLevel = config.get("logLevel") || "info";
  const proConfig = config.get("pro") || {};

  const emoji = config.get("logMessageEmoji") || "";
  const prefix = config.get("logMessagePrefix") || "";
  const includeFileName = config.get("includeFileName") || false;
  const includeLineNumber = config.get("includeLineNumber") || false;
  const delimiter =
    config.get("delimiter") || " ----------------------------->";

  const safeVarName = escapeVarName(varName);
  const languageId = getLanguageId(document);
  const suffix = getSuffixForLanguage(languageId);
  const cleanVarName = varName.trim().replace(/;+$/, "");

  if (
    (languageId === "javascript" ||
      languageId === "javascriptreact" ||
      languageId === "typescript" ||
      languageId === "typescriptreact") &&
    proConfig.remoteLogUrl &&
    proConfig.remoteLogUrl.trim() !== ""
  ) {
    const url = proConfig.remoteLogUrl.trim();
    const payload = `{
    file: "${document.fileName.replace(/\\/g, "\\\\\\\\")}",
    line: ${contextName ? '"' + contextName + '"' : "null"},
    var: "${safeVarName}",
    value: ${varName},
    timestamp: new Date().toISOString()
}`;
    return `${indent}fetch('${url}', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(${payload}) }).catch(()=>{});${suffix}`;
  }

  // Check if context should be shown
  const showContext = config.get("showContext") !== false;
  const finalContextName = showContext ? contextName : "";

  // Build the rich label
  let fileLineInfo = "";
  if (includeFileName || includeLineNumber) {
    const parts = [];
    if (includeFileName) parts.push(path.basename(document.fileName));
    if (includeLineNumber && lineNumber !== undefined)
      parts.push(lineNumber + 1);
    fileLineInfo = `[${parts.join(":")}] `;
  }

  const label = `${emoji}${prefix}${fileLineInfo}${finalContextName}${safeVarName}${delimiter}`;
  const escapedLabel = label.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'");

  // Default Behavior
  const method = ["warn", "error"].includes(logLevel) ? logLevel : "log";
  switch (languageId) {
    case "python":
      return `${indent}print("${escapedLabel}", ${cleanVarName})${suffix}`;
    case "java":
      return `${indent}System.out.println("${escapedLabel}" + String.valueOf(${cleanVarName}));${suffix}`;
    case "csharp":
      return `${indent}Console.WriteLine("${escapedLabel}" + ${cleanVarName});${suffix}`;
    case "go":
      return `${indent}fmt.Println("${escapedLabel}", ${cleanVarName})${suffix}`;
    case "php":
      return `${indent}error_log("${escapedLabel}" . print_r(${cleanVarName}, true));${suffix}`;
    case "cpp":
      return `${indent}std::cout << "${escapedLabel}" << ${cleanVarName} << std::endl;${suffix}`;
    case "swift":
      return `${indent}print("${escapedLabel}", ${cleanVarName})${suffix}`;
    default:
      return `${indent}console.${method}('${label.replace(
        /'/g,
        "\\'",
      )}', ${cleanVarName})${suffix}`;
  }
}

function getSuffixForLanguage(languageId) {
  if (languageId === "python") return " # [ACL]\n";
  if (languageId === "php") return " // [ACL]\n";
  return " // [ACL]\n";
}

function getLanguageId(document) {
  if (document.languageId) return document.languageId;
  const ext = path.extname(document.fileName || "").toLowerCase();
  switch (ext) {
    case ".py":
      return "python";
    case ".java":
      return "java";
    case ".cs":
      return "csharp";
    case ".go":
      return "go";
    case ".php":
      return "php";
    case ".cpp":
    case ".cc":
    case ".cxx":
    case ".hpp":
    case ".hh":
      return "cpp";
    case ".swift":
      return "swift";
    case ".ts":
      return "typescript";
    case ".tsx":
      return "typescriptreact";
    case ".jsx":
      return "javascriptreact";
    default:
      return "javascript";
  }
}

function isLineContinuation(currentLineText, nextLineText) {
  if (!currentLineText) return false;
  
  // Remove comments and trim
  const trimmedCurrent = currentLineText
    .replace(/\/\/.*$/, "")
    .replace(/#.*$/, "")
    .replace(/\/\*.*?\*\//g, "")
    .trim();
  
  if (!trimmedCurrent) return false;

  // Ends with an operator or continuation character
  // Note: ([{ are handled by paren/brace counting in the main loop, 
  // but we include them here for robustness if used standalone.
  const endsWithContinuation = /[,=+\-*/%&|^<>?:!]$|(&&|\|\||\?\?|\.|\/|\\|=>)$/.test(trimmedCurrent);
  if (endsWithContinuation) return true;

  if (nextLineText !== undefined) {
    const trimmedNext = nextLineText
      .replace(/\/\/.*$/, "")
      .replace(/#.*$/, "")
      .replace(/\/\*.*?\*\//g, "")
      .trim();
    
    // Starts with an operator that implies continuation
    const startsWithContinuation = /^[.?:\+\-\*\/%&|^<>!=]/.test(trimmedNext) || 
                                   /^(?:&&|\|\||\?\?|instanceof|as|is|in|extends|implements)\b/.test(trimmedNext);
    if (startsWithContinuation) return true;
  }

  return false;
}

module.exports = {
  escapeVarName,
  generateLogStatement,
  isLineContinuation,
};
