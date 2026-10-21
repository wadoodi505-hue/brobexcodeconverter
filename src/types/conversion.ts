export type LanguageId = "typescript" | "tsx" | "javascript" | "jsx" | "json" | "yaml";
export type ConversionStatus = "success" | "warning" | "error";
export interface Diagnostic {
  severity: "error" | "warning" | "info";
  message: string;
  line?: number;
  column?: number;
}
export interface ValidationResult {
  parsed: boolean;
  parser: string;
  message: string;
}
export interface ConversionSettings {
  formatOutput: boolean;
  preserveComments: boolean;
  strictValidation: boolean;
}
export interface ConversionResult {
  status: ConversionStatus;
  output: string;
  outputFilename: string;
  diagnostics: Diagnostic[];
  validation: ValidationResult;
  engine: string;
  notes: string[];
}
export interface ConversionDefinition {
  id: string;
  label: string;
  source: LanguageId;
  target: LanguageId;
  sourceExtension: string[];
  outputExtension: string;
  engine: string;
  limitations: string[];
}
