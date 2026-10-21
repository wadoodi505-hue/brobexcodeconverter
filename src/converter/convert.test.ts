import { describe, expect, it } from "vitest";
import { convertCode } from "./convert";
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
    const result = await convertCode("name: Brobex\\nenabled: true\\n", "yaml", "json", "settings.yaml", settings);
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
