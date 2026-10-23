# 4. Domain and Persistence Contracts

## 4.1 Plan shape

```text
Plan
├── brief
│   ├── goals[]
│   ├── requirements[] { id, text, acceptanceCriteria[], coverage, coverageExplanation? }
│   ├── constraints[]
│   ├── assumptions[]
│   └── openQuestions[]
├── features[] { id, title, description, priority, requirementIds[] }
├── stories[] { id, featureId, requirementIds[], title, description, acceptanceCriteria[], priority }
└── tasks[] { id, storyId, title, description, taskType, completionCriteria[], priority, dependsOn[], order }
```

Coverage values are `addressed`, `open`, or `out_of_scope`. Non-addressed outcomes need an
explanation. Task types are `technical_development` and `testing`. IDs are stable within one
version only; comparisons use IDs and field diffs. Do not use array positions as identities.

## 4.2 Cardinality and invariants

- Requirements: one or more, up to 30 in the current stage schema. Apply the same limit to
  analyst output and final plan parsing.
- Features: three to ten for newly generated plans. Older saved plans remain readable up to
  the technical output-safety ceiling of 30. The UI displays up to ten without altering the
  stored version.
- Stories: one or more per Feature; every Story points to exactly one existing Feature and at
  least one existing requirement.
- Tasks: one or more per Story; each Task points to exactly one existing Story.
- Current aggregate stage ceilings are 100 Stories and 300 Tasks per plan.
  Keep technical safety ceilings in one named planning-limits policy and apply them at
  planner/decomposer and final-plan boundaries. Do not add per-parent ceilings without
  product evidence.
- Every Feature and Story must have children; no accidental orphan planning records.
- IDs are unique per entity type within a plan.
- `addressed` requirements link to at least one Feature or Story. `open` and `out_of_scope`
  requirements include an explanation.
- Dependencies reference existing Tasks; no self edges, duplicate edges, or cycles.
- Calculate a deterministic topological order after validation. AI-provided `order` is
  provisional and never authoritative.
- Current text limits are 12,000 characters for a generation requirement, 2,000 for
  generation instructions, and 8,000 for project context. Enforce those at the HTTP boundary.
  Enforce a serialized plan-size ceiling before database commit; choose and document its byte
  value before implementation rather than relying only on item-count caps.

## 4.3 Stored records

### Project

`_id`, `name`, `normalizedName`, `context`, `currentVersion`, `acceptedVersion`, timestamps.
Unique index on `normalizedName`. `currentVersion` and `acceptedVersion` point to versions
owned by that project.

### GenerationRun

`_id`, `projectId`, `status`, `stage`, requirement/instructions/context snapshot,
`baseVersion`, provider/model/prompt version, total and per-stage attempts, idempotency key,
request fingerprint, result version, safe error record, timestamps.

Indexes: unique `(projectId, idempotencyKey)`; `(status, createdAt)` for recovery/claim
queries; `(projectId, createdAt desc)` for run history. Validate that run's project and
result version belong together.

### ArchitectureVersion

`_id`, `projectId`, monotonically increasing `version`, `basedOnVersion`, source (`generation`
or `user-edit`), schema version, nullable `runId`, immutable input snapshot, complete plan,
validation checks/warnings, timestamp.

Unique index `(projectId, version)`; history index `(projectId, createdAt desc)`. Existing
versions are never updated or deleted by edit/regenerate/accept operations. Acceptance
changes only the project pointer.

## 4.4 Atomicity and concurrency

MongoDB transaction is required for generation commit and user-edit commit. The transaction
must check the run/project state and `baseVersion`, insert one new version, update the run
terminal state if generated, and advance the project's current version. Any failed condition
aborts all writes. Use a replica set or sharded cluster. A standalone Mongo server is not a
supported production/test acceptance configuration for version commits.

Only one current pointer exists per project. Concurrent runs may generate simultaneously, but
only one based on a given version can commit; the other receives a version conflict and
creates no partial record. User acceptance may select any existing version; it does not
rewrite current version or mutate historical plan data.

## 4.5 Feature and plan retention lifecycle

Features are retained as part of a complete immutable `ArchitectureVersion`, together with
their Stories, Tasks, Requirement Brief, coverage, and dependency links. They are not kept
only in chat messages and are not written to a separate mutable Feature collection in V1.
This keeps the hierarchy consistent: a version is the durable snapshot the user reviews.

- **Successful generation:** validate the complete hierarchy, then transactionally insert a
  new version and move `currentVersion` to it. Record the run's `resultVersion` and mark the
  run succeeded in the same transaction.
- **Edit:** validate the full edited hierarchy and append a new version with
  `basedOnVersion`; never overwrite the source version.
- **Regeneration:** use the latest current version as the base and append a new version. Keep
  every prior version available for history and comparison.
- **Accept:** set `acceptedVersion` to an existing project version. Acceptance does not copy,
  rewrite, or delete Feature data.
- **Failure or cancellation:** retain the GenerationRun and its safe status/error metadata,
  but do not create a successful ArchitectureVersion or move either project pointer.
- **Read/display:** load the version referenced by `currentVersion` (or a selected history
  version) and expand Feature → Story → Task through stored parent IDs.

V1 does not automatically prune versions. For this single-user planning product, preserving
history is required for recovery, comparison, and trust. Define explicit retention/export and
deletion policy before multi-user or sensitive-data deployment.

## 4.6 Contract ownership

The API feature owns runtime Zod schemas and graph/coverage validators. Shared TypeScript
contracts belong in `packages/types` only where both web and API consume them. Mongo records
and Mongoose types stay server-owned and are not exposed to the browser.
