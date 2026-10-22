import prettier from "prettier/standalone";
import * as estreeParser from "prettier/plugins/estree";
import * as babelParser from "prettier/plugins/babel";
import * as typescriptParser from "prettier/plugins/typescript";
import * as yamlParser from "prettier/plugins/yaml";
import * as htmlParser from "prettier/plugins/html";
import * as postcssParser from "prettier/plugins/postcss";
import * as markdownParser from "prettier/plugins/markdown";
import * as graphqlParser from "prettier/plugins/graphql";
import { parse } from "@babel/parser";
import type { ParserPlugin } from "@babel/parser";
import { transformFromAstSync } from "@babel/core";
import transformTypeScript from "@babel/plugin-transform-typescript";
import ts from "typescript";
import type { ConversionSettings, ConversionResult, LanguageId } from "../types/conversion";
import { getConversion, languages } from "../lib/languageRegistry";
import { convertTypeScript } from "./engines/typescript";
import { convertWithBabel } from "./engines/babel";
import { convertData } from "./engines/data";

const MAX_INPUT_CHARS = 1_000_000;
const prettierPlugins = [babelParser, estreeParser, typescriptParser, yamlParser, htmlParser, postcssParser, markdownParser, graphqlParser];

export async function convertCode(input: string, source: LanguageId, target: LanguageId, filename: string, settings: ConversionSettings): Promise<ConversionResult> {
  if (!input.trim()) return failure("Paste or upload code before converting.", filename, target);
  if (input.length > MAX_INPUT_CHARS) return failure("Input is larger than the 1,000,000-character safety limit. Split the file and try again.", filename, target);
  const definition = getConversion(source, target);
  if (!definition) return failure(`The conversion ${source} -> ${target} is not supported.`, filename, target);
  let result: ConversionResult;
  if (source === "typescript" && target === "javascript") result = convertTypeScript(input, filename, settings);
  else if ((source === "tsx" && target === "jsx") || (source === "jsx" && target === "tsx") || (source === "javascript" && target === "typescript")) result = convertWithBabel(input, filename, source, target, settings);
  else if (["json", "yaml", "toml", "csv", "properties"].includes(source) && ["json", "yaml", "toml", "csv", "properties"].includes(target) && source !== target) result = convertData(input, filename, source, target, settings);
  else result = { status: "success", output: input, outputFilename: outputName(filename, target), diagnostics: [], validation: { parsed: true, parser: "Source-preserving formatter pipeline", message: "Input accepted for formatting. Formatting is not a compiler or a full semantic validation." }, engine: `Prettier ${languages[source].parser} parser`, notes: [] };
  if (result.status === "error") return result;
  if (source === target && ["toml", "csv", "properties"].includes(target)) {
    return failure(`${languages[target].label} formatting is not implemented.`, filename, target);
  }
  if ((!settings.formatOutput && source !== target) || !result.output.trim() || ["toml", "csv", "properties"].includes(target)) return result;
  try {
    const formatted = await formatSource(result.output, target);
    return { ...result, output: formatted };
  } catch (error) {
    const message = `Formatting is unavailable or failed: ${error instanceof Error ? error.message : "unknown formatting error"}`;
    // For format-only requests, do not report a successful operation when no formatter ran.
    if (source === target) return failure(message, filename, target);
    return { ...result, status: "warning", diagnostics: [...result.diagnostics, { severity: "warning", message }] };
  }
}

export async function formatSource(input: string, language: LanguageId): Promise<string> {
  if (!input.trim()) return "";
  if (language === "jsonc") {
    // TypeScript's JSONC parser validates comments and trailing commas; Prettier handles the actual formatting.
    const sf = ts.parseJsonText("input.jsonc", input);
    const errors = (sf as unknown as { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
    if (errors.length) throw new Error(ts.flattenDiagnosticMessageText(errors[0].messageText, "\n"));
  }
  if (["toml", "csv", "properties"].includes(language)) {
    throw new Error(`${languages[language].label} formatting is not implemented. This format can only be used in the explicitly listed conversion operations.`);
  }
  const parser = languages[language].parser as "typescript" | "babel-ts" | "babel" | "json" | "jsonc" | "yaml" | "html" | "css" | "markdown" | "graphql";
  return prettier.format(input, { parser, plugins: prettierPlugins, semi: true, singleQuote: true, trailingComma: "all", tabWidth: 2 });
}

export async function minifySource(input: string, language: LanguageId, preserveComments = false): Promise<ConversionResult> {
  const originalBytes = new TextEncoder().encode(input).length;
  const fail = (message: string): ConversionResult => ({
    status: "error", output: "", outputFilename: "minified" + languages[language].extension,
    diagnostics: [{ severity: "error", message }],
    validation: { parsed: false, parser: languages[language].parser, message: "Minification was not completed." },
    engine: "BROBEX safe minifier", notes: ["The original input has not been modified."]
  });
  if (!input.trim()) return fail("Paste or upload code before minifying.");
  if (input.length > MAX_INPUT_CHARS) return fail("Input exceeds the 1,000,000-character safety limit.");
  try {
    let output: string;
    if (["javascript", "jsx", "typescript", "tsx"].includes(language)) {
      const isTs = language === "typescript" || language === "tsx";
      const ast = parse(input, {
        sourceType: "unambiguous",
        plugins: getBabelPlugins(language)
      });
      const transformed = transformFromAstSync(ast, input, {
        configFile: false, babelrc: false, comments: preserveComments,
        compact: true, minified: true,
        plugins: isTs ? [[transformTypeScript, { isTSX: language === "tsx", allExtensions: true, allowDeclareFields: true }]] : []
      });
      output = transformed?.code ?? "";
      if (!output && input.trim()) return fail("The parser did not produce minified output.");
      parse(output, { sourceType: "unambiguous", plugins: getBabelPlugins(language) });
    } else if (language === "json") {
      output = JSON.stringify(JSON.parse(input));
    } else if (language === "jsonc") {
      return fail("JSONC comments and trailing commas require a dedicated JSONC serializer for safe minification. Formatting is supported.");
    } else if (language === "yaml" || language === "css" || language === "html" || language === "markdown" || language === "graphql") {
      // Formatting is intentionally offered instead of unsafe or misleading text-based minification.
      return fail(`Safe minification for ${languages[language].label} is not enabled. Use Format / Beautify instead.`);
    } else return fail(`Safe minification is not available for ${languages[language].label}.`);
    const optimizedBytes = new TextEncoder().encode(output).length;
    const saved = originalBytes - optimizedBytes;
    return {
      status: "success", output, outputFilename: "minified" + languages[language].extension,
      diagnostics: [], validation: { parsed: true, parser: languages[language].parser, message: "The minified output passed the available parser/serializer check. This is not proof of equivalent runtime behavior." },
      engine: ["javascript", "jsx", "typescript", "tsx"].includes(language) ? "Babel AST minifier" : `${languages[language].label} serializer`,
      notes: [`Original: ${originalBytes.toLocaleString()} bytes`, `Output: ${optimizedBytes.toLocaleString()} bytes`, `Bytes saved: ${saved.toLocaleString()}`, `Size change: ${originalBytes === 0 ? "0.00" : ((saved / originalBytes) * 100).toFixed(2)}%`, preserveComments ? "Comments were requested to be preserved where supported." : "Non-license comments may be removed by the selected engine."]
    };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to safely minify this input.");
  }
}

function getBabelPlugins(language: LanguageId): ParserPlugin[] {
  const languagePlugins: ParserPlugin[] = language === "tsx"
    ? ["typescript", "jsx"]
    : language === "typescript"
      ? ["typescript"]
      : language === "jsx"
        ? ["jsx"]
        : [];
  return [...languagePlugins, "decorators-legacy", "classProperties", "dynamicImport", "importAttributes"];
}

function outputName(filename: string, target: LanguageId) {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]/g, "_") || "converted";
  return `${base}${languages[target].extension}`;
}

function failure(message: string, filename: string, target: LanguageId): ConversionResult {
  return { status: "error", output: "", outputFilename: outputName(filename, target), diagnostics: [{ severity: "error", message }], validation: { parsed: false, parser: "Conversion registry", message: "Conversion did not run." }, engine: "Not run", notes: [] };
}
