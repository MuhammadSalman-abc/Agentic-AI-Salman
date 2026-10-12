# Data Flows and State Transitions

## Generation sequence

```mermaid
sequenceDiagram
  actor User
  participant UI as Web UI
  participant API as Express API
  participant Policy as Validation and policy
  participant Store as Persistence boundary
  participant Flow as Workflow service
  participant LLM as Model adapter
  User->>UI: Submit requirement
  UI->>API: Create draft request
  API->>Policy: Authenticate, authorize, validate limits
  Policy-->>API: Accept or reject
  API->>Store: Persist source revision and queued status
  API->>Flow: Start bounded workflow
  Flow->>LLM: Request clarification assessment or draft
  LLM-->>Flow: Structured candidate
  Flow->>Policy: Validate schema, references, policy
  alt Clarification needed
    Flow->>Store: Save questions and waiting state
    API-->>UI: Return questions and source refs
  else Draft valid
    Flow->>Store: Save draft version and audit event
    API-->>UI: Return review-ready version
  else Error or budget exhausted
    Flow->>Store: Save safe failure status
    API-->>UI: Return actionable failure
  end
```

## State machine

```mermaid
stateDiagram-v2
  [*] --> Submitted
  Submitted --> Clarifying: Blocking decision missing
  Clarifying --> Submitted: Answer creates new source revision
  Submitted --> Generating: Start bounded run
  Generating --> Validating: Candidate returned
  Validating --> Repairing: Correctable and budget remains
  Repairing --> Validating
  Validating --> Failed: Unresolved or exhausted
  Validating --> InReview: Gates pass
  InReview --> Generating: Revision requested
  InReview --> Rejected: Reviewer rejects
  InReview --> Approved: Exact version approved
  Approved --> Exporting: Export requested
  Exporting --> Exported: Destination confirms
  Exporting --> ExportUnknown: Timeout after possible side effect
  ExportUnknown --> Exported: Reconciliation confirms
  ExportUnknown --> ExportFailed: Reconciliation finds no creation
  ExportFailed --> Exporting: Safe retry approved
  Exported --> [*]
  Rejected --> [*]
  Failed --> [*]
```

## System invariants

1. Every item belongs to one draft version and one source requirement.
2. Answers create a new source revision; original text is not overwritten.
3. Approval records reviewer, time, immutable version, and integrity key.
4. Edits create a new version and clear prior approval.
5. Export rechecks authorization and exact-version approval immediately before sending.
6. Unknown destination outcome is reconciled before retry.
7. State transitions record identity, cause, time, and result without secrets/prompt content.

## Error classes and retries

Classify user input, denial, provider transient/permanent, schema/policy, persistence, destination transient/permanent, and unknown side effect. Retry only transient failures with bounded backoff/jitter. Do not retry denial/invalid input or an ambiguous export without reconciliation.
