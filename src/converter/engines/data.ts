import YAML from "yaml";
import type { ConversionResult, ConversionSettings, LanguageId } from "../../types/conversion";

type DataValue = null | boolean | number | string | DataValue[] | { [key: string]: DataValue };

export function convertData(input: string, filename: string, source: LanguageId, target: LanguageId, settings: ConversionSettings): ConversionResult {
  const engine = "BROBEX data-format conversion engine";
  try {
    const value = parseInput(input, source);
    const warnings: string[] = [];
    const output = serializeOutput(value, target, settings.formatOutput, warnings);
    // Round-trip parse generated structured formats where possible.
    if (["json", "yaml", "toml", "properties", "csv"].includes(target)) parseInput(output, target);
    return {
      status: warnings.length ? "warning" : "success",
      output,
      outputFilename: replaceExtension(filename, target),
      diagnostics: warnings.map(message => ({ severity: "warning", message })),
      validation: { parsed: true, parser: `${source.toUpperCase()} parser / ${target.toUpperCase()} serializer`, message: "Input parsed and output generated. Review conversion notes for format-specific limitations." },
      engine,
      notes: limitations(source, target)
    };
  } catch (error) {
    return {
      status: "error", output: "", outputFilename: replaceExtension(filename, target),
      diagnostics: [{ severity: "error", message: error instanceof Error ? error.message : "Invalid input." }],
      validation: { parsed: false, parser: `${source.toUpperCase()} parser`, message: "Input could not be parsed or converted." },
      engine, notes: limitations(source, target)
    };
  }
}

function parseInput(input: string, source: LanguageId): DataValue {
  if (source === "json") return JSON.parse(input) as DataValue;
  if (source === "yaml") return YAML.parse(input) as DataValue;
  if (source === "toml") return parseToml(input);
  if (source === "csv") return parseCsv(input) as DataValue;
  if (source === "properties") return parseProperties(input);
  throw new Error(`No data parser is registered for ${source}.`);
}

function serializeOutput(value: DataValue, target: LanguageId, pretty: boolean, warnings: string[]): string {
  if (target === "json") return JSON.stringify(value, null, pretty ? 2 : 0);
  if (target === "yaml") return YAML.stringify(value, { indent: 2 });
  if (target === "toml") return serializeToml(value, warnings);
  if (target === "csv") return serializeCsv(value);
  if (target === "properties") return serializeProperties(value, warnings);
  throw new Error(`No data serializer is registered for ${target}.`);
}

function replaceExtension(filename: string, target: LanguageId): string {
  const ext: Record<string, string> = { json: ".json", yaml: ".yaml", toml: ".toml", csv: ".csv", properties: ".properties" };
  return filename.replace(/\.[^.\\/]+$/, "") + (ext[target] ?? ".txt");
}
function limitations(source: LanguageId, target: LanguageId): string[] {
  const notes: string[] = [];
  if (source === "yaml") notes.push("YAML tags, anchors, and aliases may be normalized during serialization.");
  if (source === "csv" || target === "csv") notes.push("CSV conversion treats the first row as headers and preserves cell values as strings.");
  if (source === "properties" || target === "properties") notes.push("Java Properties continuation lines and common escape sequences are interpreted; comments and original formatting are not preserved by conversion.");
  if (source === "toml" || target === "toml") notes.push("TOML engine supports common scalar values, arrays, and tables; advanced TOML constructs may require a dedicated TOML library.");
  return notes;
}

function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, quoteClosed = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { quoted = false; quoteClosed = true; }
      else cell += ch;
      continue;
    }
    if (quoteClosed && ch !== "," && ch !== "\r" && ch !== "\n" && ch !== " " && ch !== "\t") {
      throw new Error(`Unexpected character after a closing CSV quote at character ${i + 1}.`);
    }
    if (ch === '"') {
      if (cell.length !== 0 || quoteClosed) throw new Error(`Unexpected quote in an unquoted CSV field at character ${i + 1}.`);
      quoted = true;
    } else if (ch === ",") {
      row.push(cell); cell = ""; quoteClosed = false;
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = ""; quoteClosed = false;
    } else {
      if (quoteClosed && /\s/.test(ch)) continue;
      cell += ch;
    }
  }
  if (quoted) throw new Error("CSV has an unterminated quoted field.");
  if (cell.length || row.length || quoteClosed) { row.push(cell); rows.push(row); }
  const clean = rows.filter(r => !(r.length === 1 && r[0] === ""));
  if (!clean.length) return [];
  const headers = clean[0].map(h => h.trim());
  if (headers.some(h => !h)) throw new Error("CSV headers must not be empty.");
  if (new Set(headers).size !== headers.length) throw new Error("CSV contains duplicate column headers.");
  return clean.slice(1).map((r, idx) => {
    if (r.length !== headers.length) throw new Error(`CSV row ${idx + 2} has ${r.length} cells; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((h, j) => [h, r[j]]));
  });
}
function quoteCsv(value: unknown): string {
  const s = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function serializeCsv(value: DataValue): string {
  if (!Array.isArray(value) || value.some(v => !v || typeof v !== "object" || Array.isArray(v))) throw new Error("JSON → CSV requires an array of objects.");
  const rows = value as Record<string, DataValue>[];
  if (!rows.length) return "";
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
  return [headers.map(quoteCsv).join(","), ...rows.map(r => headers.map(h => quoteCsv(r[h] ?? "")).join(","))].join("\r\n");
}
function parseProperties(input: string): Record<string, DataValue> {
  const result: Record<string, DataValue> = {};
  const physicalLines = input.split(/\r?\n/);
  const logicalLines: { text: string; line: number }[] = [];
  for (let i = 0; i < physicalLines.length; i++) {
    let text = physicalLines[i];
    const line = i + 1;
    while (hasOddTrailingBackslashes(text) && i + 1 < physicalLines.length) {
      text = text.slice(0, -1) + physicalLines[++i].replace(/^\s+/, "");
    }
    logicalLines.push({ text, line });
  }
  for (const { text: raw, line } of logicalLines) {
    const trimmed = raw.trimStart();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) continue;
    let split = -1, escaped = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === "=" || ch === ":" || /\s/.test(ch)) { split = i; break; }
    }
    const keyRaw = split < 0 ? raw.trim() : raw.slice(0, split).trimEnd();
    let valueRaw = split < 0 ? "" : raw.slice(split);
    valueRaw = valueRaw.replace(/^\s*(?:[=:])?\s*/, "");
    const key = decodePropertiesEscapes(keyRaw, line);
    const value = decodePropertiesEscapes(valueRaw, line);
    if (!key) throw new Error(`Empty property key on line ${line}.`);
    result[key] = value;
  }
  return result;
}
function hasOddTrailingBackslashes(value: string): boolean {
  const match = value.match(/\\+$/);
  return Boolean(match && match[0].length % 2 === 1);
}
function decodePropertiesEscapes(value: string, line: number): string {
  return value.replace(/\\(u[\da-fA-F]{4}|.)/g, (_match, escaped: string) => {
    if (escaped[0] === "u") return String.fromCharCode(parseInt(escaped.slice(1), 16));
    const escapes: Record<string, string> = { t: "\t", n: "\n", r: "\r", f: "\f" };
    if (Object.prototype.hasOwnProperty.call(escapes, escaped)) return escapes[escaped];
    return escaped;
  }).replace(/\\u([^\s]{0,3})(?:$)/, (match, partial: string) => {
    if (match.length && partial.length !== 4) throw new Error(`Invalid Unicode escape on line ${line}.`);
    return match;
  });
}
function flatten(value: DataValue, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (value !== null && value !== undefined) out[prefix] = typeof value === "string" ? value : JSON.stringify(value);
  return out;
}
function serializeProperties(value: DataValue, warnings: string[]): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("JSON → Properties requires a JSON object.");
  const entries = flatten(value);
  if (Object.keys(entries).length === 0) warnings.push("No scalar properties were emitted.");
  return Object.entries(entries).map(([k, v]) => {
    if (/[\\\r\n=:#!]/.test(k)) warnings.push(`Property key "${k}" contains characters that may need escaping.`);
    return `${k}=${v.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n")}`;
  }).join("\n");
}
function parseToml(input: string): Record<string, DataValue> {
  const root: Record<string, DataValue> = {};
  let current = root;
  for (const [index, raw] of input.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const section = line.match(/^\[([A-Za-z0-9_.-]+)\]$/);
    if (section) {
      current = root;
      for (const part of section[1].split(".")) {
        if (!current[part] || typeof current[part] !== "object" || Array.isArray(current[part])) current[part] = {};
        current = current[part] as Record<string, DataValue>;
      }
      continue;
    }
    const pair = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+?)\s*$/);
    if (!pair) throw new Error(`Unsupported or invalid TOML syntax on line ${index + 1}.`);
    current[pair[1]] = parseTomlValue(pair[2], index + 1);
  }
  return root;
}
function parseTomlValue(raw: string, line: number): DataValue {
  const s = raw.trim();
  if (s.startsWith('"') && s.endsWith('"')) return JSON.parse(s) as string;
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null") throw new Error(`TOML has no null value (line ${line}).`);
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) {
    const n = Number(s); if (!Number.isFinite(n)) throw new Error(`Invalid number on line ${line}.`); return n;
  }
  if (s.startsWith("[") && s.endsWith("]")) {
    const body = s.slice(1, -1).trim(); if (!body) return [];
    const parts = splitTomlList(body);
    return parts.map(part => parseTomlValue(part, line));
  }
  if (s.startsWith("{") && s.endsWith("}")) {
    const obj: Record<string, DataValue> = {};
    for (const part of splitTomlList(s.slice(1, -1))) {
      const idx = part.indexOf("="); if (idx < 1) throw new Error(`Invalid inline table on line ${line}.`);
      obj[part.slice(0, idx).trim()] = parseTomlValue(part.slice(idx + 1), line);
    }
    return obj;
  }
  throw new Error(`Unsupported TOML value on line ${line}: ${s}`);
}
function splitTomlList(s: string): string[] {
  const out: string[] = []; let start = 0, depth = 0, quote = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === quote && s[i - 1] !== "\\") quote = ""; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) { out.push(s.slice(start, i).trim()); start = i + 1; }
  }
  out.push(s.slice(start).trim()); return out.filter(Boolean);
}
function serializeToml(value: DataValue, warnings: string[]): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("TOML requires a root object.");
  const lines: string[] = [];
  const scalar = (v: DataValue, key: string): string | null => {
    if (v === null) { warnings.push(`Omitted "${key}" because TOML has no null value.`); return null; }
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (Array.isArray(v)) {
      const parts = v.map(item => item === null || (item && typeof item === "object" && !Array.isArray(item)) ? null : scalar(item, key));
      if (parts.some(p => p === null)) { warnings.push(`Omitted "${key}" because its array contains unsupported values.`); return null; }
      return `[${parts.join(", ")}]`;
    }
    if (typeof v === "object") {
      const parts = Object.entries(v).map(([k, item]) => { const sv = scalar(item, `${key}.${k}`); return sv === null ? null : `${k} = ${sv}`; }).filter((x): x is string => x !== null);
      return `{ ${parts.join(", ")} }`;
    }
    return null;
  };
  const visit = (obj: Record<string, DataValue>, section = "") => {
    const scalars = Object.entries(obj).filter(([, v]) => !(v && typeof v === "object" && !Array.isArray(v)));
    const tables = Object.entries(obj).filter(([, v]) => v && typeof v === "object" && !Array.isArray(v));
    if (section) lines.push(`[${section}]`);
    for (const [key, v] of scalars) { const s = scalar(v, section ? `${section}.${key}` : key); if (s !== null) lines.push(`${key} = ${s}`); }
    if (section && (scalars.length || tables.length)) lines.push("");
    for (const [key, v] of tables) visit(v as Record<string, DataValue>, section ? `${section}.${key}` : key);
  };
  visit(value);
  return lines.join("\n").trim() + (lines.length ? "\n" : "");
}
