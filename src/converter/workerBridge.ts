import { convertCode } from "./convert";
import type { ConversionResult, ConversionSettings, LanguageId } from "../types/conversion";

type WorkerReply = { id: number; ok: boolean; result?: ConversionResult; error?: string };
let worker: Worker | undefined;
let nextId = 1;
const pending = new Map<number, { resolve: (value: ConversionResult) => void; reject: (reason: Error) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../workers/converter.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const task = pending.get(event.data.id);
      if (!task) return;
      pending.delete(event.data.id);
      if (event.data.ok && event.data.result) task.resolve(event.data.result);
      else task.reject(new Error(event.data.error || "Conversion worker failed."));
    };
    worker.onerror = () => {
      for (const task of pending.values()) task.reject(new Error("Conversion worker crashed."));
      pending.clear();
      worker?.terminate();
      worker = undefined;
    };
  }
  return worker;
}

export async function convertInWorker(input: string, source: LanguageId, target: LanguageId, filename: string, settings: ConversionSettings): Promise<ConversionResult> {
  if (typeof Worker === "undefined") return convertCode(input, source, target, filename, settings);
  const id = nextId++;
  return new Promise<ConversionResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try { getWorker().postMessage({ id, type: "convert", input, source, target, filename, settings }); }
    catch (error) { pending.delete(id); reject(error instanceof Error ? error : new Error("Could not start conversion worker.")); }
  });
}
