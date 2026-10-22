# BROBEX Code Converter

A browser-first React + TypeScript workspace for a deliberately limited set of code transformations. It validates inputs and outputs where the selected engine supports parsing, surfaces limitations, and never executes submitted code.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```bash
npm install
npm run dev
```

## Verification commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Run these commands in the project directory after dependencies install. Do not treat a successful build as proof of semantic equivalence for converted code.

## Implemented conversion pairs

| Source | Target | Engine | Important limitation |
| --- | --- | --- | --- |
| TypeScript | JavaScript | TypeScript Compiler API | Single-file transpilation; no project type-check or module resolution. |
| TSX | JSX | Babel TypeScript transform | Removes type-only syntax; inspect decorators, namespaces, and build-specific behavior. |
| JSX | TSX | Babel parser | Does not invent types; manually annotate props and external APIs. |
| JavaScript | TypeScript | Babel parser | Conservative migration; does not infer or invent types. |
| JSON | YAML | JSON parser + YAML serializer | JSON comments are not part of standard JSON. |
| YAML | JSON | YAML parser + JSON serializer | YAML-specific tags and features may not map directly to JSON. |

Only these pairs are advertised as implemented. HTML/React markup migration, CSS/Tailwind conversion, SCSS/Less, XML/JSON, Markdown/HTML, and SQL transformations are not yet implemented and are intentionally not shown as supported.

## Design and runtime notes

- Code conversion runs locally in the browser; no conversion API is used.
- Input is limited to 1,000,000 characters by the conversion pipeline and uploads are limited to 5 MB by the UI.
- The Vite config uses a compile-time `process.env.NODE_ENV` definition rather than injecting a broad Node.js process polyfill into the browser bundle.
- Monaco is split into its own build chunk where possible.
- Syntax parsing is not a guarantee of behavioral equivalence. Review diagnostics and run the converted code in its intended project.


## BROBEX upgrade notes

- The header and footer BROBEX brand links open https://brobexportfolio.vercel.app/ in a new tab.
- Supported conversion pairs remain explicitly registered: TypeScript to JavaScript, TSX to JSX, conservative JavaScript to TypeScript / JSX to TSX migrations, and JSON ↔ YAML.
- Added same-format formatting for TypeScript, TSX, JavaScript, JSX, JSON, JSONC, YAML, HTML, CSS, Markdown, and GraphQL using the corresponding Prettier parser.
- Added syntax-aware Babel minification for JavaScript-family source, JSON serialization minification, and an analysis action that reports parser-level findings honestly.
- Unsupported conversion pairs and unsafe minification modes return diagnostics instead of silently rewriting source. Formatting/parser acceptance is not a proof of type correctness or runtime equivalence.
- The app remains browser-first; it does not execute user code or send source to a conversion API.


## Expanded data conversion support

This build adds real parser/serializer paths for JSON ↔ YAML, JSON ↔ TOML, YAML ↔ TOML, CSV ↔ JSON, and Java Properties ↔ JSON, plus a worker bridge for conversion tasks. The TOML implementation intentionally supports a documented common subset (scalar values, arrays, inline tables, and regular tables); it rejects unsupported syntax rather than silently rewriting it. CSV assumes the first row contains headers and preserves cell values as strings. Java Properties continuation lines and Unicode escape processing are not fully implemented.

## Adding more language pairs safely

- Add the language metadata and explicit conversion pair to `src/lib/languageRegistry.ts`.
- Implement the transformer in a focused file under `src/converter/engines/`.
- Route the exact source/target pair through `src/converter/convert.ts`.
- Add positive, invalid-input, and edge-case tests in `src/converter/convert.test.ts`.
- Use `src/converter/workerBridge.ts` for UI-triggered conversions that should run away from the main thread.

**Important:** This is an expanded frontend conversion foundation, not yet a complete paid SaaS backend. Stripe Checkout, authenticated API keys, server-enforced subscriptions/rate limits, bulk ZIP processing, and ad-provider configuration still require server-side implementation and provider credentials. Do not expose Stripe secret keys or API key signing secrets in browser code.

## Verified capability boundaries

The registry exposes only operations with an implementation. A same-format entry means **formatting** only when a formatter is available; it is not a cross-language conversion. TypeScript → JavaScript is single-file transpilation, not a project build or full type-check. JavaScript → TypeScript and JSX → TSX are conservative migrations and do not infer types. JSON/YAML/TOML/CSV/Java Properties operations are data-format transformations and may normalize comments, ordering, scalar types, or format-specific features.

### Current implementation inventory

- **Source transformation:** TypeScript → JavaScript; TSX → JSX; JavaScript → TypeScript (conservative); JSX → TSX (conservative).
- **Data conversion:** JSON ↔ YAML; JSON ↔ TOML; YAML ↔ TOML; CSV → JSON; JSON → CSV; Java Properties → JSON; JSON → Java Properties.
- **Formatting:** JavaScript, TypeScript, JSX, TSX, JSON, JSONC, YAML, HTML, CSS, Markdown, and GraphQL through the configured Prettier standalone parsers.
- **Not implemented as converters:** arbitrary programming-language-to-programming-language conversion, full project migration, full TOML conformance, CSV dialect autodetection, complete Java Properties source-preserving round trips, and semantic-equivalence verification. TOML, CSV, and Java Properties do not have a dedicated format-only operation in this browser UI.

### Language expansion roadmap

1. **Data formats first:** add and test dedicated parsers/serializers for TOML, CSV dialect options, INI, XML, JSON5, and JSONC comment-preserving operations.
2. **Web formats:** add Sass/SCSS/Less, Vue SFC, Svelte, Astro, Angular templates, MDX, SVG/XML, and OpenAPI using format-specific parsers; advertise formatting and validation separately.
3. **Compiler-backed conversions:** add only pairs backed by a compatible compiler API or AST transform, with versioned engine metadata and positive/negative tests.
4. **Server/WASM engines:** evaluate Python, Java, C/C++, Go, Rust, C#, and other compiled/runtime languages individually. Do not claim support until browser/server execution constraints, licensing, size, security, and test coverage are resolved.
5. **Specialized formats:** SQL dialects, Terraform/HCL, Kubernetes, Docker Compose, GraphQL, Protocol Buffers, Solidity, HDL, and legacy languages require dedicated grammar/version choices and should be registered only after tests and documented limitations exist.

A syntax highlighter, filename extension, or formatter alone is not evidence of a language conversion capability.


## Brand, homepage, and SEO

The homepage uses `public/brobex-logo.webp` for the primary BROBEX brand mark, hero artwork, footer mark, and browser favicon. Metadata includes the product name, concise description, Open Graph/Twitter preview fields, and WebApplication structured data. No canonical URL is set until the live production URL is confirmed. Keep SEO copy aligned with the actual implemented conversion registry; formatting and conversion are distinct capabilities.
