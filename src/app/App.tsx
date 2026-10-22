import { useEffect, useMemo, useRef, useState } from "react";
import { Link, RouterProvider, useLocation, useNavigate } from "./router";
import { ArrowDownUp, ArrowRight, Check, ChevronDown, CircleAlert, Clipboard, Code2, Download, FileCode2, FileUp, LockKeyhole, Menu, Play, RotateCcw, Settings2, ShieldCheck, Sparkles, X } from "lucide-react";
import Editor from "../components/CodeEditor";
import { conversions, languages } from "../lib/languageRegistry";
import { formatSource, minifySource } from "../converter/convert";
import { convertInWorker } from "../converter/workerBridge";
import type { ConversionResult, ConversionSettings, LanguageId } from "../types/conversion";
import { configureMonaco } from "./monaco";
import "../styles/app.css";

type Page = "converter" | "languages" | "how" | "docs" | "privacy";
const sample = `type UserCardProps = {
  name: string;
  role?: string;
};

export function UserCard({ name, role = "Developer" }: UserCardProps) {
  const greeting = \`Hello, \${name}\`;

  return (
    <article className="user-card">
      <h2>{greeting}</h2>
      <p>{role}</p>
    </article>
  );
}`;
const emptySettings: ConversionSettings = { formatOutput: true, preserveComments: true, strictValidation: true };

export default function App() { return <RouterProvider><AppContent /></RouterProvider>; }

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = routePage(location.pathname);
  const [mobileNav, setMobileNav] = useState(false);
  const [source, setSource] = useState<LanguageId>("tsx");
  const [target, setTarget] = useState<LanguageId>("jsx");
  const [input, setInput] = useState(sample);
  const [filename, setFilename] = useState("UserCard.tsx");
  const [output, setOutput] = useState("");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [settings, setSettings] = useState(emptySettings);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const inputFile = useRef<HTMLInputElement>(null);
  useEffect(() => { configureMonaco(); }, []);
  useEffect(() => { if (toast) { const t = window.setTimeout(() => setToast(""), 2600); return () => window.clearTimeout(t); } }, [toast]);

  const definition = useMemo(() => conversions.find((c) => c.source === source && c.target === target), [source, target]);
  const navItems: [Page, string][] = [["converter", "Converter"], ["languages", "Supported formats"], ["how", "How it works"], ["docs", "Documentation"], ["privacy", "Privacy"]];
  const changeSource = (next: LanguageId) => {
    setSource(next);
    const reverse = conversions.find((c) => c.source === next && c.target === target);
    if (!reverse) {
      const first = conversions.find((c) => c.source === next);
      if (first) setTarget(first.target);
    }
    setResult(null); setOutput("");
  };
  const changeTarget = (next: LanguageId) => { setTarget(next); setResult(null); setOutput(""); };
  const swap = () => {
    const reverse = conversions.find((c) => c.source === target && c.target === source);
    if (!reverse) { setToast("No supported reverse conversion for this pair."); return; }
    setSource(target); setTarget(source); setInput(output); setOutput(input); setFilename(result?.outputFilename ?? filename); setResult(null);
  };
  const convert = async () => {
    setBusy(true); setResult(null);
    try {
      const res = await convertInWorker(input, source, target, filename, settings);
      setResult(res); setOutput(res.output);
      if (res.status !== "error") setToast(res.status === "warning" ? "Converted with review notes" : "Conversion complete");
    } catch {
      setResult({ status: "error", output: "", outputFilename: "converted", diagnostics: [{ severity: "error", message: "Unexpected conversion failure. Your source remains unchanged; try a smaller file." }], validation: { parsed: false, parser: "Conversion pipeline", message: "Conversion failed unexpectedly." }, engine: "Not completed", notes: [] });
      setOutput("");
    } finally { setBusy(false); }
  };
  const formatCurrent = async () => {
    const candidate = output || input;
    if (!candidate.trim()) { setToast("Paste code before formatting."); return; }
    setBusy(true);
    try {
      const formatted = await formatSource(candidate, output ? target : source);
      setOutput(formatted);
      setResult({ status: "success", output: formatted, outputFilename: result?.outputFilename ?? filename, diagnostics: [], validation: { parsed: true, parser: "Prettier language parser", message: "Formatting completed. Formatting is not a full semantic validation." }, engine: "Prettier", notes: ["Formatting changes presentation, not intended program logic. Review the result before using it."] });
      setToast("Formatting complete");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to format this source.");
    } finally { setBusy(false); }
  };
  const minifyCurrent = async () => {
    setBusy(true);
    try {
      const res = await minifySource(input, source, settings.preserveComments);
      setResult(res); setOutput(res.output);
      setToast(res.status === "error" ? "Safe minification could not be completed" : "Minification complete");
    } finally { setBusy(false); }
  };
  const analyzeCurrent = async () => {
    if (!input.trim()) { setToast("Paste code before analyzing."); return; }
    setBusy(true);
    try {
      await formatSource(input, source);
      setResult({ status: "success", output, outputFilename: result?.outputFilename ?? filename, diagnostics: [], validation: { parsed: true, parser: languages[source].parser, message: "The selected parser accepted the source. This is syntax-level checking, not a full type-check, lint audit, or proof of runtime behavior." }, engine: "BROBEX Code Analysis", notes: ["No automatic code deletion was performed.", "Unused-code and performance findings require language-specific static analysis; this check does not claim to detect them."] });
      setToast("Syntax analysis completed");
    } catch (error) {
      setResult({ status: "error", output: "", outputFilename: filename, diagnostics: [{ severity: "error", message: error instanceof Error ? error.message : "Syntax analysis failed." }], validation: { parsed: false, parser: languages[source].parser, message: "The source could not be parsed by the selected formatter/parser." }, engine: "BROBEX Code Analysis", notes: [] });
      setToast("Analysis found a parser error");
    } finally { setBusy(false); }
  };
  const copy = async () => {
    if (!output) { setToast("Convert code before copying output."); return; }
    try { await navigator.clipboard.writeText(output); setToast("Output copied to clipboard"); }
    catch { setToast("Clipboard permission was denied. Select the output and copy it manually."); }
  };
  const download = () => {
    if (!output) { setToast("Convert code before downloading."); return; }
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = result?.outputFilename ?? "converted.txt"; anchor.click(); URL.revokeObjectURL(url);
    setToast("Download started");
  };
  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setToast("File exceeds the 5 MB upload limit."); return; }
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    const sourceMatch = (Object.entries(languages) as [LanguageId, typeof languages[LanguageId]][]).find(([id, lang]) => lang.extension === ext || (id === "yaml" && ext === ".yml"));
    if (!sourceMatch) { setToast("This file extension is not supported by the current single-file workflow."); return; }
    const text = await file.text();
    setInput(text); setFilename(file.name); changeSource(sourceMatch[0]); setToast("File loaded locally in your browser");
  };
  const clear = () => {
    if (input && !window.confirm("Clear the source code and conversion result?")) return;
    setInput(""); setOutput(""); setResult(null); setToast("Workspace cleared");
  };

  return <div className="app-shell">
    <header className="topbar">
      <a href="https://brobexportfolio.vercel.app/" target="_blank" rel="noopener noreferrer" aria-label="Visit BROBEX portfolio in a new tab" className="brand" onClick={() => setMobileNav(false)}><span className="brand-mark"><img src="/brobex-logo.webp" alt="" width="34" height="34" /></span><span className="brand-word">BROBEX</span><span className="brand-divider" /><span className="product-name">CODE CONVERTER</span></a>
      <button className="mobile-menu icon-button" aria-label="Toggle navigation" onClick={() => setMobileNav(!mobileNav)}>{mobileNav ? <X size={19}/> : <Menu size={19}/>}</button>
      <nav className={mobileNav ? "main-nav open" : "main-nav"} aria-label="Main navigation">
        {navItems.map(([key, label]) => <Link key={key} to={key === "converter" ? "/" : `/${key}`} className={page === key ? "nav-link active" : "nav-link"} onClick={() => setMobileNav(false)}>{label}</Link>)}
      </nav>
      <div className="privacy-chip"><LockKeyhole size={13}/><span>Browser-only processing</span></div>
    </header>

    {page === "converter" ? <main className="main-content">
      <section className="hero hero-centered">
        <div className="hero-brand-art"><img src="/brobex-logo.webp" alt="BROBEX Code Converter logo" width="76" height="76" fetchPriority="high" /></div>
        <div className="eyebrow"><span className="eyebrow-line"/><span>THE DEVELOPER'S CONVERSION WORKSPACE</span><span className="eyebrow-line"/></div>
        <div className="hero-row"><div className="hero-copy-wrap"><h1>BROBEX <em>Code Converter</em></h1><p className="hero-copy">Convert, format, and validate code with precision.</p><p className="hero-supporting">A professional browser-based code converter for JavaScript, TypeScript, React, JSON, YAML, TOML, CSV, and other compatible formats — with clear diagnostics and privacy-first processing.</p><div className="hero-trust"><span><ShieldCheck size={15}/> Browser-first processing</span><span><Code2 size={15}/> Compiler-aware tools</span><span><LockKeyhole size={15}/> No code upload in core workflow</span></div></div></div>
      </section>
      <section className="workspace" aria-label="Code conversion workspace">
        <div className="workspace-toolbar">
          <div className="conversion-selectors">
            <label className="select-wrap"><span>FROM</span><select value={source} onChange={(e) => changeSource(e.target.value as LanguageId)}>{Object.entries(languages).map(([id, lang]) => <option key={id} value={id}>{lang.label}</option>)}</select><ChevronDown size={14}/></label>
            <button className="swap-button" aria-label="Swap source and target" onClick={swap} disabled={!conversions.some((c) => c.source === target && c.target === source)}><ArrowDownUp size={16}/></button>
            <label className="select-wrap"><span>TO</span><select value={target} onChange={(e) => changeTarget(e.target.value as LanguageId)}>{conversions.filter((c) => c.source === source).map((c) => <option key={`${c.id}-${c.target}`} value={c.target}>{languages[c.target].label}{c.source === c.target ? " · Format" : ""}</option>)}</select><ChevronDown size={14}/></label>
          </div>
          <div className="toolbar-actions"><button className="subtle-button" onClick={() => setShowSettings(!showSettings)}><Settings2 size={15}/> Settings</button><button className="subtle-button" onClick={() => inputFile.current?.click()}><FileUp size={15}/> Upload file</button><input ref={inputFile} type="file" hidden onChange={(e) => { void upload(e.target.files?.[0]); e.currentTarget.value = ""; }}/></div>
        </div>
        {showSettings && <div className="settings-panel">
          <div className="settings-heading"><div><Settings2 size={16}/><b>Conversion settings</b></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={16}/></button></div>
          <label className="setting-row"><span><b>Format output</b><small>Use Prettier when a parser is available.</small></span><input type="checkbox" checked={settings.formatOutput} onChange={(e) => setSettings({...settings, formatOutput: e.target.checked})}/></label>
          <label className="setting-row"><span><b>Preserve comments</b><small>Keep comments where the transformation engine supports it.</small></span><input type="checkbox" checked={settings.preserveComments} onChange={(e) => setSettings({...settings, preserveComments: e.target.checked})}/></label>
          <label className="setting-row"><span><b>Strict validation</b><small>Reserved for conversion-specific validation checks.</small></span><input type="checkbox" checked={settings.strictValidation} onChange={(e) => setSettings({...settings, strictValidation: e.target.checked})}/></label>
        </div>}
        <div className="editor-grid">
          <section className="editor-panel">
            <div className="panel-heading"><div className="panel-title"><span className="file-icon"><FileCode2 size={15}/></span><input className="filename-input" aria-label="Source filename" value={filename} onChange={(e) => setFilename(e.target.value)}/><span className="panel-tag">SOURCE</span></div><button className="icon-button" title="Clear workspace" aria-label="Clear workspace" onClick={clear}><RotateCcw size={15}/></button></div>
            <div className="editor-body"><Editor value={input} onChange={setInput} language={languages[source].monaco} label="Source code editor"/></div>
            <div className="panel-footer"><span>{input.split("\n").length} lines</span><span>{input.length.toLocaleString()} chars</span><span className="footer-action">Wrap on</span></div>
          </section>
          <section className="editor-panel output-panel">
            <div className="panel-heading"><div className="panel-title"><span className="file-icon gold"><FileCode2 size={15}/></span><span className="output-filename">{result?.outputFilename ?? filename.replace(/\.(tsx?|jsx?)$/i, "") + (target === "tsx" ? ".tsx" : target === "jsx" ? ".jsx" : target === "javascript" ? ".js" : target === "typescript" ? ".ts" : target === "yaml" ? ".yaml" : ".json")}</span><span className="panel-tag output-tag">OUTPUT</span></div><div className="output-actions"><button className="icon-button" title="Copy output" aria-label="Copy output" onClick={() => void copy()}><Clipboard size={15}/></button><button className="icon-button" title="Download output" aria-label="Download output" onClick={download}><Download size={15}/></button></div></div>
            <div className="editor-body output-editor">{output ? <Editor value={output} onChange={setOutput} language={languages[target].monaco} label="Converted output editor"/> : <div className="output-empty"><div className="empty-glyph"><Code2 size={24}/></div><b>Your output will appear here</b><span>Choose a supported conversion and run the compiler.</span><span className="empty-lock"><LockKeyhole size={12}/> Processed locally</span></div>}</div>
            <div className="panel-footer"><span>{output ? `${output.split("\n").length} lines` : "Waiting for conversion"}</span><span>{output.length.toLocaleString()} chars</span><span className="footer-state"><span className={result?.status === "error" ? "status-dot error" : result ? "status-dot" : "status-dot idle"}/>{result?.status ?? "idle"}</span></div>
          </section>
        </div>
        <div className="convert-bar">
          <div className="convert-meta"><span className="engine-indicator"><span/> ENGINE READY</span><span className="conversion-label">{definition ? definition.engine : "Unsupported conversion pair"}</span></div>
          <div className="convert-actions"><button className="clear-button" onClick={() => void analyzeCurrent()} disabled={busy}><ShieldCheck size={14}/> Analyze</button><button className="clear-button" onClick={() => void formatCurrent()} disabled={busy}><Settings2 size={14}/> Format</button><button className="clear-button" onClick={() => void minifyCurrent()} disabled={busy}><Sparkles size={14}/> Minify</button><button className="clear-button" onClick={clear}><RotateCcw size={14}/> Reset</button><button className="convert-button" onClick={() => void convert()} disabled={busy || !definition}><span>{busy ? "Working…" : "Convert code"}</span>{busy ? <Sparkles size={16} className="spin"/> : <Play size={15} fill="currentColor"/>}</button></div>
        </div>
        {result && <section className={`result-card ${result.status}`} aria-live="polite">
          <div className="result-head"><div className="result-status">{result.status === "error" ? <CircleAlert size={17}/> : result.status === "warning" ? <CircleAlert size={17}/> : <Check size={17}/>}<b>{result.status === "success" ? "Conversion complete" : result.status === "warning" ? "Converted — review notes" : "Conversion failed"}</b></div><span className="result-engine">{result.engine}</span></div>
          <p className="validation-message">{result.validation.message}</p>
          {result.diagnostics.map((d, i) => <div className={`diagnostic ${d.severity}`} key={`${d.message}-${i}`}><span>{d.severity.toUpperCase()}</span><p>{d.message}{d.line ? ` (line ${d.line}${d.column ? `, column ${d.column}` : ""})` : ""}</p></div>)}
          {result.notes.map((note) => <div className="note-row" key={note}><span>NOTE</span><p>{note}</p></div>)}
          <div className="result-foot"><span><Check size={13}/> Output parser: {result.validation.parsed ? "passed" : "not passed"}</span><span><CircleAlert size={13}/> Behavioral equivalence is not automatically verified</span></div>
        </section>}
      </section>
      <section className="below-workspace"><div className="section-kicker">BUILT FOR REAL WORK</div><div className="feature-grid"><article><span className="feature-icon"><Code2 size={18}/></span><h3>Compiler-backed</h3><p>Uses language-aware parsers and compiler transforms, not fragile text replacement.</p></article><article><span className="feature-icon"><LockKeyhole size={18}/></span><h3>Private by design</h3><p>Core conversion runs locally. Your source is not uploaded to a conversion server.</p></article><article><span className="feature-icon"><ShieldCheck size={18}/></span><h3>Honest validation</h3><p>See parsing results, warnings, and limitations instead of unsupported guarantees.</p></article><article><span className="feature-icon"><FileUp size={18}/></span><h3>Simple file workflow</h3><p>Load supported source files, inspect the result, and download your transformed output.</p></article><article><span className="feature-icon"><Sparkles size={18}/></span><h3>Focused developer tools</h3><p>Format, minify, analyze syntax, and convert only where an implementation is available.</p></article></div></section>
    </main> : <InfoPage page={page} navigate={navigate}/>}
    <footer className="site-footer"><a className="footer-brand developer-logo" href="https://brobexportfolio.vercel.app/" target="_blank" rel="noopener noreferrer" aria-label="Meet the developer — visit the BROBEX portfolio" title="Meet the developer"><span className="developer-logo-ring"><img src="/brobex-logo.webp" alt="BROBEX logo" width="34" height="34" loading="lazy"/></span><span className="developer-tooltip">Meet the developer</span></a><p><strong>BROBEX Code Converter</strong><span>Convert smarter. Keep control of your code.</span></p><div className="footer-links"><Link to="/privacy">Privacy</Link><Link to="/docs">Documentation</Link><span>v1.0 · Browser-first</span></div></footer>
    {toast && <div className="toast" role="status"><Check size={15}/>{toast}</div>}
  </div>;
}

function routePage(path: string): Page {
  if (path.startsWith("/languages")) return "languages";
  if (path.startsWith("/how")) return "how";
  if (path.startsWith("/docs")) return "docs";
  if (path.startsWith("/privacy")) return "privacy";
  return "converter";
}
function InfoPage({ page, navigate }: { page: Page; navigate: (path: string) => void }) {
  const [query, setQuery] = useState("");
  const title = page === "languages" ? "Supported formats" : page === "how" ? "How it works" : page === "docs" ? "Documentation" : "Privacy, by design";
  const intro = page === "languages" ? "Only conversion pairs backed by an implemented engine are available in the converter." : page === "how" ? "A transparent conversion pipeline, from parsing to output validation." : page === "docs" ? "Practical guidance for getting reliable results from BROBEX Code Converter." : "Your source code stays in the browser during the core conversion workflow.";
  return <main className="info-page"><div className="eyebrow"><span className="eyebrow-line"/><span>BROBEX / {page.toUpperCase()}</span></div><h1>{title}</h1><p className="info-intro">{intro}</p>
    {page === "languages" && <><div className="language-search"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter operations…" aria-label="Filter supported conversions"/></div><div className="conversion-list">{conversions.filter((c) => `${c.label} ${c.engine}`.toLowerCase().includes(query.toLowerCase())).map((c) => <article className="conversion-row" key={c.id}><div><b>{c.label}</b><p>{c.engine}</p><small>{c.limitations.join(" ")}</small></div><span className="supported-badge"><Check size={13}/> Implemented</span></article>)}</div><p className="disclaimer">Supported operations include true conversions and same-format formatting. Language formatting is not a conversion to another language, and no operation guarantees runtime equivalence for every project.</p></>}
    {page === "how" && <div className="steps-list">{[["01","Choose formats","Select a source language and a supported target format. Unsupported pairs are disabled."],["02","Parse the source","A real parser checks syntax before a compiler or serializer transforms the input."],["03","Transform and format","The selected engine performs a deterministic transformation. Prettier can format supported output."],["04","Inspect diagnostics","Review parser status, warnings, and known limitations before using the result in a project."]].map(([n,t,d]) => <article className="step-row" key={n}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div></article>)}</div>}
    {page === "docs" && <div className="docs-content"><h2>Quick start</h2><ol><li>Paste code or upload a supported single file (maximum 5 MB).</li><li>Select a conversion pair marked as supported.</li><li>Choose whether to format output and preserve comments.</li><li>Run conversion, review diagnostics, then copy or download the result.</li></ol><h2>Supported transformations</h2><p>TypeScript → JavaScript uses the TypeScript Compiler API. TSX/JSX syntax transformations use Babel. JSON/YAML conversion uses dedicated parsers and serializers. JavaScript → TypeScript and JSX → TSX deliberately avoid inventing types.</p><h2>Limitations</h2><p>This is a single-file tool, not a project-aware build system. It does not resolve imports, run your program, run a type-check against project dependencies, or prove behavior equivalence. Review generated code and run your own project test suite.</p><h2>Keyboard and editor</h2><p>Monaco Editor provides familiar editing shortcuts. Use your browser's normal keyboard and focus navigation. The app respects reduced-motion preferences.</p><button className="convert-button" onClick={() => navigate("/")}><span>Open converter</span><ArrowRight size={15}/></button></div>}
    {page === "privacy" && <div className="docs-content"><h2>Local processing</h2><p>The conversion workflow runs in your browser using the code shipped with this website. Source text is not intentionally sent to a conversion API or uploaded by the core conversion features.</p><h2>File handling</h2><p>When you select a file, the browser reads it locally. The app does not upload it. Output downloads are generated locally through a browser Blob URL.</p><h2>Local storage</h2><p>This version does not persist source code or drafts in local storage. Code remains in the active page memory until you clear it or close/reload the page.</p><h2>Third-party code</h2><p>The application bundles open-source dependencies including React, Monaco Editor, TypeScript, Babel, Prettier, YAML, and Lucide React. Hosting providers may process standard network request metadata when you visit the website; consult the selected host's policy.</p><h2>Limits</h2><p>This description covers the application's core behavior, not every network or hosting layer. Review the deployed build and hosting configuration before making broader privacy claims.</p></div>}
  </main>;
}