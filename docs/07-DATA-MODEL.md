# Data Model Proposal

**Status:** Logical model only. MongoDB is currently an optional API integration; ARBG schemas/collections are not implemented. This is not a physical database decision.

## Entity relationship

```mermaid
erDiagram
  WORKSPACE ||--o{ MEMBERSHIP : grants
  USER ||--o{ MEMBERSHIP : holds
  WORKSPACE ||--o{ PROJECT : owns
  PROJECT ||--o{ REQUIREMENT : receives
  REQUIREMENT ||--o{ SOURCE_REVISION : versions
  SOURCE_REVISION ||--o{ GENERATION_RUN : input
  GENERATION_RUN ||--o{ DRAFT_VERSION : creates
  DRAFT_VERSION ||--o{ BACKLOG_ITEM : contains
  BACKLOG_ITEM ||--o{ ACCEPTANCE_CRITERION : has
  BACKLOG_ITEM ||--o{ SOURCE_LINK : cites
  DRAFT_VERSION ||--o{ REVIEW_DECISION : reviewed_by
  USER ||--o{ REVIEW_DECISION : makes
  DRAFT_VERSION ||--o{ EXPORT_ATTEMPT : exported_as
  WORKSPACE ||--o{ AUDIT_EVENT : records
  WORKSPACE { string id string name string status }
  USER { string id string identity_subject string status }
  MEMBERSHIP { string id string workspace_id string user_id string role }
  PROJECT { string id string workspace_id string name string settings_version }
  REQUIREMENT { string id string project_id string created_by string current_revision_id }
  SOURCE_REVISION { string id string requirement_id int revision text content_ref string checksum }
  GENERATION_RUN { string id string source_revision_id string workflow_status string config_version }
  DRAFT_VERSION { string id string generation_run_id int version string review_status }
  BACKLOG_ITEM { string id string draft_version_id string parent_id string kind string title }
  ACCEPTANCE_CRITERION { string id string backlog_item_id string text string verification_type }
  SOURCE_LINK { string id string backlog_item_id string source_revision_id string span_ref string relation }
  REVIEW_DECISION { string id string draft_version_id string reviewer_id string outcome }
  EXPORT_ATTEMPT { string id string draft_version_id string destination string status string external_id }
  AUDIT_EVENT { string id string workspace_id string actor_id string action string target_id }
```

## Entity rules

- Workspace is the proposed authorization boundary; define account semantics with the product owner.
- Membership binds user to workspace and role; user-supplied workspace ID is never authorization evidence.
- Source revisions are append-only. Attachments, if approved, use protected object storage plus metadata/checksum.
- Generation run records source revision and workflow/template/schema/model-config versions, not secrets.
- Draft version is immutable. Human edits produce a new version and auditable diff/change set.
- Source link points into an exact source revision and must be validated server-side.
- Review decision records actor, outcome, time, version, and reason where provided. Approval is invalid for newer version.
- Export attempt records idempotency key, destination, external ID, normalized status/error, and timestamps; never credentials.
- Audit event policy must define integrity, access, retention, redaction, and deletion exceptions before calling it immutable.

## Data classification and lifecycle

Treat user input and attachments as confidential until assessed. Decide retention by record type, user deletion, legal hold, provider retention, backup expiry, and derived-index cleanup. Encrypt transport/storage using selected platform controls. Define restore and deletion behavior before production.

## Candidate indexes

Potential access patterns: `(workspaceId, projectId, createdAt)`; unique `(requirementId, revision)`; unique `(generationRunId, version)`; `(draftVersionId, parentId)`; `(workspaceId, occurredAt)`; unique `(destinationId, idempotencyKey)`. Validate database-specific support and real query plans before migration.

## Backlog hierarchy

```mermaid
flowchart TD
  Requirement --> Initiative
  Initiative --> Feature
  Feature --> Story
  Story --> Task
  Story --> AcceptanceCriterion
  Initiative -. source references .-> Requirement
  Feature -. source references .-> Requirement
  Story -. source references .-> Requirement
  Task -. source references .-> Requirement
```

Not every input needs every level. Preserve parent meaning and source links when a level is omitted.
