import { parse } from "@babel/parser";
import transformTypeScript from "@babel/plugin-transform-typescript";
import { transformFromAstSync } from "@babel/core";
import type { ConversionSettings, ConversionResult, Diagnostic, LanguageId } from "../../types/conversion";

export function convertWithBabel(input: string, filename: string, source: LanguageId, target: LanguageId, settings: ConversionSettings): ConversionResult {
  const isTs = source === "tsx" || source === "typescript";
  const targetExt = target === "tsx" ? ".tsx" : target === "jsx" ? ".jsx" : ".ts";
  const diagnostics: Diagnostic[] = [];
  try {
    const ast = parse(input, {
      sourceType: "unambiguous",
      sourceFilename: filename,
      plugins: [isTs ? "typescript" : "jsx", "decorators-legacy", "classProperties", "dynamicImport", "importAttributes"],
      errorRecovery: false
    });
    let output: string;
    if (isTs) {
      const transformed = transformFromAstSync(ast, input, {
        filename,
        configFile: false,
        babelrc: false,
        comments: settings.preserveComments,
        plugins: [[transformTypeScript, { isTSX: source === "tsx", allExtensions: true, allowDeclareFields: true }]],
        presets: source === "tsx" ? [["@babel/preset-react", { runtime: "automatic" }]] : []
      });
      output = transformed?.code ?? "";
    } else {
      // Conservative migration: parse/print with JSX preserved, without fabricating types.
      const transformed = transformFromAstSync(ast, input, {
        filename,
        configFile: false,
        babelrc: false,
        comments: settings.preserveComments,
        presets: source === "jsx" ? [["@babel/preset-react", { runtime: "automatic" }]] : []
      });
      output = transformed?.code ?? input;
      diagnostics.push({ severity: "warning", message: "No types were inferred or invented. Add and verify TypeScript annotations manually." });
    }
    if (!output.trim() && input.trim()) throw new Error("The transformation engine returned empty output.");
    // Validate output with the target grammar after transformation.
    parse(output, {
      sourceType: "unambiguous",
      plugins: [target === "tsx" || target === "typescript" ? "typescript" : "jsx", "decorators-legacy", "classProperties", "dynamicImport", "importAttributes"]
    });
    const errors = diagnostics.some((d) => d.severity === "error");
    return {
      status: errors ? "error" : diagnostics.length ? "warning" : "success",
      output: errors ? "" : output,
      outputFilename: filename.replace(/\.(tsx?|jsx?)$/i, "") + targetExt,
      diagnostics,
      validation: { parsed: true, parser: "Babel parser", message: "Generated output parsed successfully. Parsing does not prove behavioral equivalence." },
      engine: isTs ? "Babel TypeScript transform" : "Babel parser / conservative syntax migration",
      notes: isTs ? ["This transform removes TypeScript-only syntax. Review compiler-specific behavior, decorators, namespaces, and project-level settings."] : ["Reverse migration intentionally avoids guessing types. Syntax remains valid JavaScript-compatible code until you add type annotations."]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parser or transformation error.";
    return {
      status: "error", output: "", outputFilename: filename.replace(/\.(tsx?|jsx?)$/i, "") + targetExt,
      diagnostics: [{ severity: "error", message }], validation: { parsed: false, parser: "Babel parser", message: "Parsing or transformation failed." },
      engine: "Babel", notes: []
    };
  }
}

