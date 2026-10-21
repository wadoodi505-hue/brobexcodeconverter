import { lazy, Suspense } from "react";
import type { editor } from "monaco-editor";
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  label: string;
  readOnly?: boolean;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
}
export default function CodeEditor({ value, onChange, language, label, readOnly = false, onMount }: CodeEditorProps) {
  return <div className="editor-frame" aria-label={label}>
    <Suspense fallback={<div className="editor-loading">Loading editor…</div>}>
      <MonacoEditor height="100%" language={language} value={value} onChange={(next) => onChange(next ?? "")} onMount={onMount}
        theme="brobex-dark" options={{
          readOnly, minimap: { enabled: false }, fontSize: 13, lineHeight: 21, fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
          automaticLayout: true, scrollBeyondLastLine: false, wordWrap: "on", tabSize: 2, insertSpaces: true,
          padding: { top: 16, bottom: 18 }, renderLineHighlight: "gutter", roundedSelection: true,
          guides: { indentation: true }, overviewRulerBorder: false, scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
        }} />
    </Suspense>
  </div>;
}