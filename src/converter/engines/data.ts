import YAML from "yaml";
import type { ConversionResult, ConversionSettings, LanguageId } from "../../types/conversion";

export function convertData(input: string, filename: string, source: LanguageId, target: LanguageId, settings: ConversionSettings): ConversionResult {
  try {
    const value = source === "json" ? JSON.parse(input) : YAML.parse(input);
    const output = target === "yaml" ? YAML.stringify(value, { indent: 2 }) : JSON.stringify(value, null, settings.formatOutput ? 2 : 0);
    // Parse the generated representation to validate serializer output.
    if (target === "yaml") YAML.parse(output); else JSON.parse(output);
    return {
      status: "success", output, outputFilename: filename.replace(/\.(json|ya?ml)$/i, "") + (target === "yaml" ? ".yaml" : ".json"),
      diagnostics: [], validation: { parsed: true, parser: target === "yaml" ? "YAML parser" : "JSON.parse", message: "Output parsed successfully." },
      engine: "JSON/YAML parser and serializer", notes: source === "json" ? ["JSON comments are not supported by the standard parser and cannot be preserved."] : ["YAML-specific tags and features may be normalized when serialized as JSON."]
    };
  } catch (error) {
    return {
      status: "error", output: "", outputFilename: filename.replace(/\.(json|ya?ml)$/i, "") + (target === "yaml" ? ".yaml" : ".json"),
      diagnostics: [{ severity: "error", message: error instanceof Error ? error.message : "Invalid input." }],
      validation: { parsed: false, parser: source === "json" ? "JSON.parse" : "YAML parser", message: "Input could not be parsed." },
      engine: "JSON/YAML parser and serializer", notes: []
    };
  }
}
