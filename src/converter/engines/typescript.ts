import ts from "typescript";
import type { ConversionSettings, ConversionResult, Diagnostic } from "../../types/conversion";

export function convertTypeScript(input: string, filename: string, settings: ConversionSettings): ConversionResult {
  const diagnostics: Diagnostic[] = [];
  const sourceFile = ts.createSourceFile(filename.endsWith(".tsx") ? filename : `${filename}.ts`, input, ts.ScriptTarget.Latest, true, filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const parseErrors = (sourceFile as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  if (parseErrors.length) {
    return {
      status: "error", output: "", outputFilename: outputName(filename, ".js"),
      diagnostics: parseErrors.map((d) => ({ severity: "error", message: ts.flattenDiagnosticMessageText(d.messageText, "\n"), line: d.start === undefined ? undefined : sourceFile.getLineAndCharacterOfPosition(d.start).line + 1, column: d.start === undefined ? undefined : sourceFile.getLineAndCharacterOfPosition(d.start).character + 1 })),
      validation: { parsed: false, parser: "TypeScript Compiler API", message: "Source parsing failed." }, engine: "TypeScript Compiler API", notes: []
    };
  }
  const result = ts.transpileModule(input, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      removeComments: !settings.preserveComments,
      sourceMap: false,
      experimentalDecorators: false
    }
  });
  for (const d of result.diagnostics ?? []) {
    diagnostics.push({ severity: d.category === ts.DiagnosticCategory.Error ? "error" : "warning", message: ts.flattenDiagnosticMessageText(d.messageText, "\n") });
  }
  let output = result.outputText;
  if (settings.formatOutput) {
    // Formatting is handled by the shared async formatter after engine execution.
  }
  const hasErrors = diagnostics.some((d) => d.severity === "error");
  return {
    status: hasErrors ? "error" : diagnostics.length ? "warning" : "success",
    output: hasErrors ? "" : output,
    outputFilename: outputName(filename, ".js"),
    diagnostics,
    validation: { parsed: !hasErrors, parser: "TypeScript Compiler API", message: hasErrors ? "Compiler reported errors." : "Source parsed and TypeScript transpilation completed; runtime behavior was not executed." },
    engine: "TypeScript Compiler API",
    notes: ["This is a single-file transpilation, not a full project build or type-check. Imports, compiler configuration, and external declarations may affect the final application."]
  };
}
function outputName(filename: string, ext: string) {
  const base = filename.replace(/\.(tsx?|jsx?)$/i, "").replace(/[\\/:*?"<>|]/g, "_") || "converted";
  return `${base}${ext}`;
}

