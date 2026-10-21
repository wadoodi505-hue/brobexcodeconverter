import type { ConversionDefinition, LanguageId } from "../types/conversion";

export const languages: Record<LanguageId, { label: string; monaco: string; extension: string }> = {
  typescript: { label: "TypeScript", monaco: "typescript", extension: ".ts" },
  tsx: { label: "TypeScript React (TSX)", monaco: "typescript", extension: ".tsx" },
  javascript: { label: "JavaScript", monaco: "javascript", extension: ".js" },
  jsx: { label: "JavaScript React (JSX)", monaco: "javascript", extension: ".jsx" },
  json: { label: "JSON", monaco: "json", extension: ".json" },
  yaml: { label: "YAML", monaco: "yaml", extension: ".yaml" }
};

export const conversions: ConversionDefinition[] = [
  { id: "tsx-jsx", label: "TSX → JSX", source: "tsx", target: "jsx", sourceExtension: [".tsx"], outputExtension: ".jsx", engine: "Babel parser + TypeScript transform", limitations: ["TypeScript syntax is erased; runtime semantics still depend on the source program and build setup."] },
  { id: "ts-js", label: "TS → JS", source: "typescript", target: "javascript", sourceExtension: [".ts"], outputExtension: ".js", engine: "TypeScript Compiler API", limitations: ["TypeScript diagnostics are not a proof of runtime equivalence.", "Some compiler options and project-level behavior are not available for a single pasted file."] },
  { id: "jsx-tsx", label: "JSX → TSX", source: "jsx", target: "tsx", sourceExtension: [".jsx", ".js"], outputExtension: ".tsx", engine: "Babel parser + conservative migration", limitations: ["Types are not inferred automatically; review and annotate component props and external APIs."] },
  { id: "js-ts", label: "JS → TS", source: "javascript", target: "typescript", sourceExtension: [".js"], outputExtension: ".ts", engine: "Babel parser + conservative migration", limitations: ["This preserves syntax and adds no speculative type declarations; manual typing is usually required."] },
  { id: "json-yaml", label: "JSON → YAML", source: "json", target: "yaml", sourceExtension: [".json"], outputExtension: ".yaml", engine: "JSON.parse + YAML serializer", limitations: ["Comments cannot be preserved from standard JSON input."] },
  { id: "yaml-json", label: "YAML → JSON", source: "yaml", target: "json", sourceExtension: [".yaml", ".yml"], outputExtension: ".json", engine: "YAML parser + JSON serializer", limitations: ["YAML features without a direct JSON equivalent may be normalized or rejected."] }
];

export function getConversion(source: LanguageId, target: LanguageId) {
  return conversions.find((item) => item.source === source && item.target === target);
}
