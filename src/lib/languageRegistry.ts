import type { ConversionDefinition, LanguageId } from "../types/conversion";

export const languages: Record<LanguageId, { label: string; monaco: string; extension: string; parser: string }> = {
  typescript: { label: "TypeScript", monaco: "typescript", extension: ".ts", parser: "typescript" },
  tsx: { label: "TypeScript React (TSX)", monaco: "typescript", extension: ".tsx", parser: "babel-ts" },
  javascript: { label: "JavaScript", monaco: "javascript", extension: ".js", parser: "babel" },
  jsx: { label: "JavaScript React (JSX)", monaco: "javascript", extension: ".jsx", parser: "babel" },
  json: { label: "JSON", monaco: "json", extension: ".json", parser: "json" },
  jsonc: { label: "JSON with comments (JSONC)", monaco: "json", extension: ".jsonc", parser: "jsonc" },
  yaml: { label: "YAML", monaco: "yaml", extension: ".yaml", parser: "yaml" },
  toml: { label: "TOML", monaco: "ini", extension: ".toml", parser: "toml" },
  csv: { label: "CSV", monaco: "plaintext", extension: ".csv", parser: "csv" },
  properties: { label: "Java Properties", monaco: "ini", extension: ".properties", parser: "properties" },
  html: { label: "HTML", monaco: "html", extension: ".html", parser: "html" },
  css: { label: "CSS", monaco: "css", extension: ".css", parser: "css" },
  markdown: { label: "Markdown", monaco: "markdown", extension: ".md", parser: "markdown" },
  graphql: { label: "GraphQL", monaco: "graphql", extension: ".graphql", parser: "graphql" }
};

const formatOnly = (id: LanguageId): ConversionDefinition => ({
  id: `${id}-format`, label: `${languages[id].label} formatting`, source: id, target: id,
  sourceExtension: [languages[id].extension], outputExtension: languages[id].extension,
  engine: `Prettier ${languages[id].parser} parser`,
  limitations: ["Formatting is not a conversion to another programming language and does not guarantee runtime equivalence."]
});

export const conversions: ConversionDefinition[] = [
  { id: "tsx-jsx", label: "TSX → JSX", source: "tsx", target: "jsx", sourceExtension: [".tsx"], outputExtension: ".jsx", engine: "Babel parser + TypeScript transform", limitations: ["TypeScript syntax is erased; runtime semantics still depend on the source program and build setup."] },
  { id: "ts-js", label: "TS → JS", source: "typescript", target: "javascript", sourceExtension: [".ts"], outputExtension: ".js", engine: "TypeScript Compiler API", limitations: ["This is single-file transpilation, not a project build or full type-check."] },
  { id: "jsx-tsx", label: "JSX → TSX", source: "jsx", target: "tsx", sourceExtension: [".jsx", ".js"], outputExtension: ".tsx", engine: "Babel parser + conservative migration", limitations: ["Types are not inferred automatically; review and annotate component props and external APIs."] },
  { id: "js-ts", label: "JS → TS", source: "javascript", target: "typescript", sourceExtension: [".js"], outputExtension: ".ts", engine: "Babel parser + conservative migration", limitations: ["Types are not invented; manual typing is usually required."] },
  { id: "json-yaml", label: "JSON → YAML", source: "json", target: "yaml", sourceExtension: [".json"], outputExtension: ".yaml", engine: "JSON parser + YAML serializer", limitations: ["JSON comments are not supported."] },
  { id: "yaml-json", label: "YAML → JSON", source: "yaml", target: "json", sourceExtension: [".yaml", ".yml"], outputExtension: ".json", engine: "YAML parser + JSON serializer", limitations: ["YAML-specific tags and features may be normalized or rejected."] },
  { id: "json-toml", label: "JSON → TOML", source: "json", target: "toml", sourceExtension: [".json"], outputExtension: ".toml", engine: "JSON parser + TOML serializer", limitations: ["TOML has no null value; null fields are omitted with a warning."] },
  { id: "toml-json", label: "TOML → JSON", source: "toml", target: "json", sourceExtension: [".toml"], outputExtension: ".json", engine: "BROBEX TOML subset parser", limitations: ["The browser engine supports common TOML scalars, arrays, tables and inline tables; advanced date/time and array-of-table syntax may be rejected."] },
  { id: "yaml-toml", label: "YAML → TOML", source: "yaml", target: "toml", sourceExtension: [".yaml", ".yml"], outputExtension: ".toml", engine: "YAML parser + TOML serializer", limitations: ["TOML has no null value; unsupported values are omitted."] },
  { id: "toml-yaml", label: "TOML → YAML", source: "toml", target: "yaml", sourceExtension: [".toml"], outputExtension: ".yaml", engine: "TOML subset parser + YAML serializer", limitations: ["Advanced TOML date/time and array-of-table syntax may be rejected."] },
  { id: "csv-json", label: "CSV → JSON", source: "csv", target: "json", sourceExtension: [".csv"], outputExtension: ".json", engine: "Quoted CSV parser + JSON serializer", limitations: ["The first row is treated as column headers; all cell values remain strings."] },
  { id: "json-csv", label: "JSON → CSV", source: "json", target: "csv", sourceExtension: [".json"], outputExtension: ".csv", engine: "JSON parser + CSV serializer", limitations: ["Input must be an array of objects with compatible columns. Nested values are JSON-encoded."] },
  { id: "properties-json", label: "Properties → JSON", source: "properties", target: "json", sourceExtension: [".properties"], outputExtension: ".json", engine: "Java properties parser + JSON serializer", limitations: ["Continuation lines and Unicode escape sequences are not currently interpreted."] },
  { id: "json-properties", label: "JSON → Properties", source: "json", target: "properties", sourceExtension: [".json"], outputExtension: ".properties", engine: "JSON parser + properties serializer", limitations: ["Nested objects and arrays are flattened to dotted keys; null values are omitted."] },
  ...(["typescript", "tsx", "javascript", "jsx", "json", "jsonc", "yaml", "toml", "csv", "properties", "html", "css", "markdown", "graphql"] as LanguageId[]).map(formatOnly)
];

export function getConversion(source: LanguageId, target: LanguageId) {
  return conversions.find((item) => item.source === source && item.target === target);
}
