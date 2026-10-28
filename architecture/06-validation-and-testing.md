# 6. Validation and Testing Plan

## 6.1 Validation gates

### Request gate

- Parse project, generation, edit, version, and comparison inputs with feature-owned Zod
  schemas.
- Validate identifiers, required idempotency header, request limits, and enum values.
- Do not create a run when required persistence/provider configuration is absent.

### Provider and plan gate

- Parse the single complete-plan provider response from `unknown` against the strict plan schema.
- Reject extra fields, invalid enum values, duplicate/missing requirement coverage, and
  technical safety-limit violations. Generated planner output must contain three to ten
  Features; output outside that range is rejected without another provider call.
- Make exactly one provider call per new generation run. Provider, output-schema, and
  deterministic validation failures end the run; a user must start a new run to try again.
- When the provider omits the entire Tasks array or leaves a Story without an implementation
  or testing Task, create the missing Task type locally before whole-plan validation. Generated
  testing Tasks cover positive, negative, and edge cases. Malformed non-array `tasks` values
  remain invalid.
- Normalize recognized priority labels and default unknown or missing priorities to `medium`
  before schema validation.

### Whole-plan gate

Run the same deterministic function on groomed model output and user-edited plans. It must
check schema, technical size ceilings, unique IDs, coverage, parent references, child completeness,
orphan rules, Task dependencies, cycles, deterministic ordering, and size limits. A passing
result means structurally valid and traceable; it does not prove business correctness.

### Persistence gate

- Only validated plans enter a Mongo transaction.
- Generation/edit commits check the base version and project/run status in the transaction.
- Version insert, successful run state, and project current-version pointer update are atomic.
- Failed/cancelled/stale plans create no successful version.

## 6.2 Test matrix

| Level | Required coverage | Boundary strategy |
|---|---|---|
| Unit | plan schema, Feature prompt guidance, one-call behavior, technical size ceilings, coverage, relationships, topological sort, comparison diff, provider response parsing | deterministic inputs; no network |
| Service | single-call input/prompt, terminal provider/schema failures, cancellation checks, missing provider, safe error mapping, idempotency outcomes | fake repository/provider with assertions |
| Controller/contract | request validation, status/envelope, required idempotency header, stable error code/request ID, no sensitive-value echo | invoke controller with service fake |
| Route integration | actual Express routing, middleware order, unknown route and JSON boundary | local test app; no external network |
| Mongo integration | indexes, duplicate keys, claim concurrency, cancellation race, transaction rollback, version conflict, restart recovery | isolated replica-set MongoDB |
| Provider contract | Groq/Gemini request shape, timeout, HTTP errors, malformed JSON, rate limit/auth classification | mocked fetch for deterministic suite |
| Live provider smoke | one bounded JSON-generation call per configured provider/model | explicit opt-in; never require credentials in ordinary CI |
| End-to-end | requirement submit → run progress → saved version → expand Feature/Story hierarchy → edit/accept/compare/regenerate | real API and replica-set DB; provider fake or controlled test provider |

Do not label mocked controller tests as database/provider integration tests. Record test
environment and whether the boundary was live or faked.

## 6.3 Backend release gates

Backend is ready for the UI phase when all are true:

1. API typecheck, lint, and the repository-owned API test suite pass.
2. Complete-plan schema and whole-plan rule tests cover valid and invalid edge cases, including six
   and seven Features saved intact, the UI projection showing five without mutating the saved
   plan, technical safety-ceiling overflow, missing child entities, duplicate IDs, missing
   coverage, dependency cycles, and deterministic ordering.
3. Provider adapter contract tests cover both vendors and timeout/error classification.
4. Mongo replica-set integration tests prove transaction atomicity, rollback, stale version
   rejection, cancellation race safety, idempotency race safety, and restart behavior.
5. API contract tests match the documented endpoint/status/error behavior.
6. At least one end-to-end generation journey passes using an isolated test database and
   controlled provider response.
7. Secrets are server-only and test logs contain no requirement body, key, raw prompt, or
   raw provider response.

If credentials or replica-set infrastructure are unavailable, report those gates as
unverified and keep UI work from being described as backend-stable.

## 6.4 Repository validation commands

Bounded API rate-limit handling, concurrency and stress evidence is recorded in
[the load-testing assessment](qa-load-testing.md). Run it explicitly with
`pnpm --dir servers/api run test:load`; it uses a fake provider and an isolated real
MongoDB database. Passing it does not establish provider quota capacity or horizontal
scalability. The assessment lists admission-control and worker-ownership gaps.

Use the repository control plane and package scripts, not ad hoc test runners as the only
evidence. The exact API tasks are discoverable with `pnpm run tasks` and
`node codebase/cli/repo.mjs run <task> --dry-run`. Run the narrow API test during development,
then the API suite and repository check/typecheck before declaring the backend stable.
