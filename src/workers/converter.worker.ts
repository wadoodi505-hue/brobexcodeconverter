import { convertCode, formatSource, minifySource } from "../converter/convert";
import type { ConversionSettings, LanguageId } from "../types/conversion";

type Request =
  | { id: number; type: "convert"; input: string; source: LanguageId; target: LanguageId; filename: string; settings: ConversionSettings }
  | { id: number; type: "format"; input: string; language: LanguageId }
  | { id: number; type: "minify"; input: string; language: LanguageId; preserveComments?: boolean };

self.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data;
  try {
    let result: unknown;
    if (request.type === "convert") result = await convertCode(request.input, request.source, request.target, request.filename, request.settings);
    else if (request.type === "format") result = await formatSource(request.input, request.language);
    else result = await minifySource(request.input, request.language, request.preserveComments);
    self.postMessage({ id: request.id, ok: true, result });
  } catch (error) {
    self.postMessage({ id: request.id, ok: false, error: error instanceof Error ? error.message : "Worker conversion failed." });
  }
};
