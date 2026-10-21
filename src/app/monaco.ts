import type { editor } from "monaco-editor";
let configured = false;
export function configureMonaco() {
  if (configured) return;
  configured = true;
  void import("monaco-editor").then((monaco) => {
    monaco.editor.defineTheme("brobex-dark", {
      base: "vs-dark", inherit: true, rules: [
        { token: "comment", foreground: "777777", fontStyle: "italic" },
        { token: "keyword", foreground: "D4AF37" },
        { token: "string", foreground: "B8C98A" },
        { token: "number", foreground: "D7A66B" },
        { token: "type", foreground: "E8D58A" }
      ],
      colors: { "editor.background": "#0C0C0C", "editor.foreground": "#E8E8E8", "editorLineNumber.foreground": "#555555", "editorLineNumber.activeForeground": "#D4AF37", "editorCursor.foreground": "#F0D98A", "editor.selectionBackground": "#6B542B55", "editor.lineHighlightBackground": "#FFFFFF05", "editorIndentGuide.background1": "#242424", "editorIndentGuide.activeBackground1": "#5D4A22" }
    });
  });
}
export type MonacoEditorInstance = editor.IStandaloneCodeEditor;