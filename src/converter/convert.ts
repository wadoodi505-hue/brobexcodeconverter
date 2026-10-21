import prettier from "prettier/standalone";
import estreeParser from "prettier/plugins/estree";
import typescriptParser from "prettier/plugins/typescript";
import yamlParser from "prettier/plugins/yaml";
import type { ConversionSettings, ConversionResult, LanguageId } from "../types/conversion";
import { getConversion } from "../lib/languageRegistry";
import { convertTypeScript } from "./engines/typescript";
import { convertWithBabel } from "./engines/babel";
import { convertData } from "./engines/data";

const MAX_INPUT_CHARS = 1_000_000;

export async function convertCode(input: string, source: LanguageId, target: LanguageId, filename: string, settings: ConversionSettings): Promise<ConversionResult> {
  if (!input.trim()) return failure("Paste or upload code before converting.", filename, target);
  if (input.length > MAX_INPUT_CHARS) return failure("Input is larger than the 1,000,000-character safety limit. Split the file and try again.", filename, target);
  const definition = getConversion(source, target);
  if (!definition) return failure(`The conversion ${source} â†’ ${target} is not supported.`, filename, target);
  let result: ConversionResult;
  if (source === "typescript") result = convertTypeScript(input, filename, settings);
  else if (source === "tsx" || source === "jsx" || source === "javascript") result = convertWithBabel(input, filename, source, target, settings);
  else result = convertData(input, filename, source, target, settings);
  if (result.status === "error" || !settings.formatOutput || !result.output.trim()) return result;
  try {
    const parser = target === "json" ? "json" : target === "yaml" ? "yaml" : target === "typescript" || target === "tsx" ? "typescript" : target === "jsx" ? "babel" : "babel";
    const plugins = [babelParser, estreeParser, typescriptParser, yamlParser];
    const formatted = await prettier.format(result.output, { parser, plugins, semi: true, singleQuote: true, trailingComma: "all", tabWidth: 2 });
    return { ...result, output: formatted };
  } catch (error) {
    return { ...result, status: "warning", diagnostics: [...result.diagnostics, { severity: "warning", message: `Conversion succeeded, but formatting failed: ${error instanceof Error ? error.message : "unknown formatting error"}` }] };
  }
}
function failure(message: string, filename: string, target: LanguageId): ConversionResult {
  return { status: "error", output: "", outputFilename: filename.replace(/\.[^.]+$/, "") + (target === "tsx" ? ".tsx" : target === "jsx" ? ".jsx" : target === "javascript" ? ".js" : target === "typescript" ? ".ts" : target === "yaml" ? ".yaml" : ".json"), diagnostics: [{ severity: "error", message }], validation: { parsed: false, parser: "Conversion registry", message: "Conversion did not run." }, engine: "Not run", notes: [] };
}




