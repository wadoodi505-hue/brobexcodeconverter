# BROBEX Code Converter — upgrade audit report

## Findings addressed

- Conversion dispatch already rejected unregistered source/target pairs, but the same-format fallback could report success while returning source unchanged for formats without a formatter. Unsupported same-format TOML/CSV/Java Properties formatting now returns an explicit error.
- Worker failures were caught by silently rerunning the conversion on the main thread. That fallback could hide worker failures and cause expensive work on the UI thread; worker errors now propagate to the existing visible error state.
- CSV parsing accepted malformed quote placement and could silently normalize invalid input. It now rejects quote characters inside unquoted fields and unexpected non-whitespace characters after a closing quote.
- Java Properties parsing now joins continuation lines and interprets common escapes, including four-digit Unicode escapes.
- Removed the Google Fonts CSS import so initial rendering does not require an external font request; system-font fallbacks are used.
- Added regression tests and documented implemented capabilities, limitations, and an incremental language-support roadmap.

## Existing capabilities (not a claim of exhaustive language support)

- Source transforms: TypeScript → JavaScript, TSX → JSX, JavaScript → TypeScript (conservative), JSX → TSX (conservative).
- Data conversions: JSON ↔ YAML, JSON ↔ TOML, YAML ↔ TOML, CSV → JSON, JSON → CSV, Java Properties → JSON, JSON → Java Properties.
- Formatting: JavaScript, TypeScript, JSX, TSX, JSON, JSONC, YAML, HTML, CSS, Markdown, GraphQL, subject to the installed Prettier parser support.
- TOML uses a restricted custom parser rather than a full TOML implementation; review its documented limitations before relying on advanced TOML features.

## Verification status

The source was not fully verifiable in this environment. `npm ci --no-audit --no-fund` could not complete because npm registry requests failed with `EAI_AGAIN` (DNS/network unavailable). The partially populated `node_modules` directory lacks executable project tooling and several required type definition packages. Therefore typecheck, lint, unit tests, and production build cannot honestly be reported as passing. Run all four commands in a network-enabled environment after a clean dependency install.


## Visual identity and SEO refresh (2026-10-22)

- Replaced header/footer brand marks with `public/brobex-logo.webp` and used the same artwork in the centered home hero and favicon metadata.
- Reworked the homepage H1 to `BROBEX Code Converter`, with centered responsive hierarchy and accurate capability copy.
- Added polished feature cards and responsive layout refinements for mobile, tablet, desktop, and ultrawide displays.
- Expanded title, description, keyword, Open Graph, Twitter, and WebApplication structured metadata. A canonical URL is intentionally omitted until the confirmed production URL is known.
- Dependency installation did not complete in this environment, so build/typecheck/test results remain unverified.


## Typography and premium UI refinement (2026-10-23)

- Increased default reading size to 15px and raised most descriptive text, controls, labels, result diagnostics, and supported-format descriptions to more comfortable professional sizes.
- Refined spacing, panel borders, gold accent restraint, workspace depth, button sizing, card treatment, and hover/focus feedback.
- Improved desktop and ultrawide editor sizing while retaining compact responsive layouts for tablets and phones.
- Kept the existing React/TypeScript stack, dependencies, conversion engines, navigation, and current product claims unchanged. No unsupported conversion capability or SaaS/backend feature is advertised.
- Build, lint, tests, and live-browser checks still require running in a network-enabled environment after dependencies are installed.
