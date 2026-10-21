# BROBEX Code Converter

A browser-first React + TypeScript developer tool with a restrained black-and-gold interface.

## Implemented conversion paths

- **TSX → JSX** — Babel parser and TypeScript transform.
- **TS → JS** — TypeScript Compiler API single-file transpilation.
- **JSX → TSX** — Babel syntax transformation with an explicit warning; does not invent types.
- **JS → TS** — conservative syntax migration; does not invent types.
- **JSON → YAML** and **YAML → JSON** — dedicated parsers and serializers.

The conversion registry is the source of truth for supported pairs. Unsupported pairs return an error instead of a fake result.

## Requirements

- Node.js 20.19+ or 22.12+ recommended for Vite 7.
- npm.

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Static deployment

Build with `npm run build`. The static site is generated in `dist/`. Deploy that folder to a static host. Vite uses relative asset paths (`base: "./"`) to support subpath hosting, including GitHub Pages project sites. For a root-domain deployment, relative paths also work.

For Cloudflare Pages, configure build command `npm run build` and output directory `dist`. For Vercel, the included `vercel.json` configures the static build output. Review current provider terms before deploying commercially. No paid API or server is needed.

## Privacy model

Core conversions execute in the browser. Selected files are read using the browser File API, and downloads are created locally. The app does not intentionally transmit source code to a conversion service. Google Fonts are currently imported from Google Fonts, which means font requests go to that third party; remove the import and use system fonts if you want to avoid that external font request. Your hosting provider will also process normal web requests.

## Important limitations

- Single-file transformations only. This is not a project-aware compiler or bundler.
- Parsing/transpilation success is not proof of semantic equivalence or runtime correctness.
- TS → JS uses `transpileModule`; it does not perform a project-aware type check.
- Babel TS transforms may not reproduce every `tsconfig` option or compiler-specific behavior.
- Reverse migrations do not infer complex types. Review generated code and add types yourself.
- The settings toggle for strict validation is reserved and currently does not change engine behavior; it is exposed for API extensibility but should not be treated as an active validation mode.
- Monaco Editor is a sizeable dependency. It is lazy-loaded by the React component, though the browser downloads editor assets when the workspace mounts.
- Offline/PWA support is not claimed or implemented.

## Tests

Vitest tests cover representative successful and failing conversions. Run them in your environment and inspect results before treating a deployment as production verified.
