import type { ConversionDefinition, ConversionResult, ConversionSettings, LanguageId } from "../../types/conversion";

/** A conversion engine owns one or more explicit source/target pairs. */
export interface ConversionEngine {
  readonly id: string;
  supports(source: LanguageId, target: LanguageId): boolean;
  convert(input: string, filename: string, source: LanguageId, target: LanguageId, settings: ConversionSettings): ConversionResult | Promise<ConversionResult>;
}

export interface RegisteredEngine {
  definition: ConversionDefinition;
  engine: ConversionEngine;
}

/** Keep pair support explicit: never claim support based only on syntax highlighting. */
export function findEngine(engines: readonly ConversionEngine[], source: LanguageId, target: LanguageId): ConversionEngine | undefined {
  return engines.find(engine => engine.supports(source, target));
}
