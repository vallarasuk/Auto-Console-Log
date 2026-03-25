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
  const suffix = " // [ACL]\n";

  if (proConfig.remoteLogUrl && proConfig.remoteLogUrl.trim() !== "") {
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

  const cleanVarName = varName.trim().replace(/;+$/, "");

  // Default Behavior
  const method = ["warn", "error"].includes(logLevel) ? logLevel : "log";
  // Remove the hardcoded semicolon at the end; let Prettier/linters handle it or keep it clean
  return `${indent}console.${method}('${label.replace(
    /'/g,
    "\\'",
  )}', ${cleanVarName})${suffix}`;
}

module.exports = {
  escapeVarName,
  generateLogStatement,
};
