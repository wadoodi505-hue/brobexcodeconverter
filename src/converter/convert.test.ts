import { describe, expect, it } from "vitest";
import { convertCode, formatSource, minifySource } from "./convert";
import type { ConversionSettings } from "../types/conversion";

const settings: ConversionSettings = { formatOutput: false, preserveComments: true, strictValidation: true };

describe("BROBEX conversion engines", () => {
  it("transforms TypeScript annotations to JavaScript", async () => {
    const result = await convertCode("const add = (a: number, b: number): number => a + b;", "typescript", "javascript", "math.ts", settings);
    expect(result.status).not.toBe("error");
    expect(result.output).toContain("const add");
    expect(result.output).not.toContain(": number");
  });
  it("transforms TSX component syntax and removes types", async () => {
    const input = "type Props = { name: string }; export function Hello({ name }: Props) { return <h1>{name}</h1>; }";
    const result = await convertCode(input, "tsx", "jsx", "Hello.tsx", settings);
    expect(result.status).not.toBe("error");
    expect(result.output).toContain("Hello");
    expect(result.output).toContain("<h1>");
    expect(result.output).not.toContain("_jsx(");
    expect(result.output).not.toContain("type Props");
    expect(result.validation.parsed).toBe(true);
  });
  it("rejects malformed TypeScript input", async () => {
    const result = await convertCode("const value: = 2", "typescript", "javascript", "broken.ts", settings);
    expect(result.status).toBe("error");
    expect(result.output).toBe("");
  });
  it("does not transform empty input", async () => {
    const result = await convertCode("  ", "typescript", "javascript", "empty.ts", settings);
    expect(result.status).toBe("error");
  });
  it("converts JSON to YAML", async () => {
    const result = await convertCode('{"name":"Brobex","enabled":true}', "json", "yaml", "settings.json", settings);
    expect(result.status).toBe("success");
    expect(result.output).toContain("name: Brobex");
    expect(result.validation.parsed).toBe(true);
  });
  it("converts YAML to JSON", async () => {
    const result = await convertCode("name: Brobex\nenabled: true\n", "yaml", "json", "settings.yaml", settings);
    expect(result.status).toBe("success");
    expect(JSON.parse(result.output).name).toBe("Brobex");
  });
  it("rejects unsupported conversion pairs", async () => {
    const result = await convertCode("print('hi')", "javascript", "yaml", "file.js", settings);
    expect(result.status).toBe("error");
    expect(result.output).toBe("");
  });
  it("preserves strings that resemble type syntax", async () => {
    const result = await convertCode('const text: string = "value: number";', "typescript", "javascript", "text.ts", settings);
    expect(result.output).toContain('"value: number"');
  });
  it("warns instead of inventing types for JSX migration", async () => {
    const result = await convertCode("export const Greeting = ({ name }) => <p>{name}</p>;", "jsx", "tsx", "Greeting.jsx", settings);
    expect(result.status).toBe("warning");
    expect(result.output).toContain("<p>");
    expect(result.diagnostics.some((d) => d.severity === "warning")).toBe(true);
  });
});


describe("formatting and safe optimization", () => {
  it("minifies JavaScript using a syntax-aware Babel transform", async () => {
    const result = await minifySource("const total = (left, right) => { return left + right; };", "javascript");
    expect(result.status).toBe("success");
    expect(result.output).toContain("left+right");
    expect(result.notes.some((note) => note.includes("Bytes saved"))).toBe(true);
  });
  it("preserves string contents during minification", async () => {
    const result = await minifySource('const text = "keep  these spaces";', "javascript");
    expect(result.status).toBe("success");
    expect(result.output).toContain("keep  these spaces");
  });
  it("formats CSS with a real Prettier parser", async () => {
    const result = await formatSource("a{color:red}", "css");
    expect(result).toContain("color: red");
  });
  it("rejects unsafe minification for unsupported formats", async () => {
    const result = await minifySource("a { color: red; }", "css");
    expect(result.status).toBe("error");
    expect(result.output).toBe("");
  });
});


describe("expanded data-format conversions", () => {
  it("converts JSON to TOML and back", async () => {
    const source = JSON.stringify({ app: { name: "Brobex", enabled: true }, retries: 3 });
    const toml = await convertCode(source, "json", "toml", "config.json", settings);
    expect(toml.status).toBe("success");
    expect(toml.output).toContain('[app]');
    const json = await convertCode(toml.output, "toml", "json", "config.toml", settings);
    expect(json.status).toBe("success");
    expect(JSON.parse(json.output)).toEqual(JSON.parse(source));
  });
  it("converts CSV with quoted commas to JSON", async () => {
    const result = await convertCode('name,description\nBrobex,"code, convert"', "csv", "json", "data.csv", settings);
    expect(result.status).toBe("success");
    expect(JSON.parse(result.output)[0]).toEqual({ name: "Brobex", description: "code, convert" });
  });
  it("rejects CSV rows with mismatched columns", async () => {
    const result = await convertCode("a,b\n1", "csv", "json", "bad.csv", settings);
    expect(result.status).toBe("error");
  });
  it("converts nested JSON objects to dotted Java Properties keys", async () => {
    const result = await convertCode('{"app":{"name":"Brobex"},"enabled":true}', "json", "properties", "app.json", settings);
    expect(result.status).toBe("success");
    expect(result.output).toContain("app.name=Brobex");
    expect(result.output).toContain("enabled=true");
  });
  it("rejects JSON null when serializing to TOML with a warning", async () => {
    const result = await convertCode('{"name":"Brobex","unused":null}', "json", "toml", "app.json", settings);
    expect(result.status).toBe("warning");
    expect(result.output).toContain('name = "Brobex"');
  });
});


describe("honest format-only capability reporting", () => {
  it("does not report unchanged TOML as successfully formatted", async () => {
    const result = await convertCode("name = \"Brobex\"", "toml", "toml", "app.toml", { ...settings, formatOutput: true });
    expect(result.status).toBe("error");
    expect(result.output).toBe("");
    expect(result.diagnostics[0]?.message).toContain("formatting is not implemented");
  });
  it("rejects malformed CSV quote placement", async () => {
    const result = await convertCode('name,description\nBrobex,co\"de', "csv", "json", "bad.csv", settings);
    expect(result.status).toBe("error");
    expect(result.output).toBe("");
  });
  it("supports Java Properties continuation and Unicode escapes", async () => {
    const result = await convertCode("message=hello\\\n  world\nunicode=\\u0042robex", "properties", "json", "app.properties", settings);
    expect(result.status).toBe("success");
    expect(JSON.parse(result.output)).toEqual({ message: "helloworld", unicode: "Brobex" });
  });
});
