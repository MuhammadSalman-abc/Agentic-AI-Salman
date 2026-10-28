# Security dependency update — 2026-10-28

The high-severity audit failures were resolved through dependency updates, with no new
audit exclusions. Existing unrelated changes and the existing braces backport remain.

| Package | Resolved version | Reason |
|---|---|---|
| zod | 4.6.7 | Fix [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) across application and tooling dependencies |
| body-parser | 2.4.0 | Fix [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) in Express's dependency graph |
| undici | 7.30.1 | Fix [content encoding](https://github.com/advisories/GHSA-xjj6-f33q-929c), [redirect caching](https://github.com/advisories/GHSA-4w7w-5xrc-9h26), [TLS options](https://github.com/advisories/GHSA-2m5v-pch6-74hx), and [TLS renegotiation](https://github.com/advisories/GHSA-qrxm-fqhp-jwvm) advisories within major 7 |
| express | 5.3.0 | Compatible update within the application's declared major |
| shadcn | 4.23.0 | Uses Zod v4, replacing the CLI's previous Zod v3 dependency |

The architecture policy's CLI pin matches `packages/ui/package.json`. The MCP SDK
declares support for Zod v4; a workspace override keeps its resolution on the patched
version. Replacing the old shadcn CLI avoids forcing its v3 schemas onto an incompatible
v4 root API. The body-parser and undici overrides establish patched minimum resolutions
within their current majors; review them when upstream parent dependencies change.

pnpm recorded an exact-version release-age allowance for the explicitly selected
`shadcn@4.23.0`. Registry integrity checks and vulnerability scanning remain enabled.

The post-update `pnpm audit --json` reported **zero high and critical vulnerabilities**.
Three low and four moderate findings remain in audit metadata; these are below the
repository's configured high-severity gate. Raw audit evidence is saved locally in
`.repo-cache/dependency-audit-fixed.json`.

Run the full release gate with `pnpm run validate`. No live LLM request is required.

Verification: repository policy/security checks, workspace lint, typecheck and tests
passed. The first full validation reached the web build, which failed in Webpack's
`WasmHash` with a cached build artifact. Moving only `apps/web/.next/cache` into the
ignored repository cache and rerunning the production build succeeded. All build
targets passed or were valid cache hits. Logs: `.repo-cache/security-validate.log`
and `.repo-cache/security-build-retry.log`. The full validation command was not
repeated after the successful build retry.
