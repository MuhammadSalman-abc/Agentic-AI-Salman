# 1. Product Scope and Behavior

## 1.1 Product statement

Agentic AI is a chat-based planning assistant. A user describes a software requirement in
natural language. The service turns it into a traceable, reviewable hierarchy:

```text
Requirement Brief
└── Feature (AI generation limit 3–10; UI displays at most 10)
    └── User Story (exactly one parent Feature)
        └── Task (exactly one parent Story)
```

Tasks may depend on other Tasks. Dependencies, not model-provided ordering, determine the
final deterministic execution order. This product creates a plan; it does not perform the
plan.

## 1.2 User journey

1. Open the application from the health page's single “Open Agentic AI” button.
2. Open or create a project and provide project context once.
3. Enter a requirement in the chat composer and submit it.
4. See a persisted run move through its named stages and receive safe progress/error data.
5. Review the generated plan. The UI shows at most the first ten Features in stored order;
   selecting a visible Feature opens its Stories, and selecting a Story opens its Tasks.
   If an older saved plan has more than ten, show a small “Showing 10 of N Features” note; keep all
   generated data in the saved version.
6. Inspect assumptions, open questions, requirement coverage, validation warnings, and task
   dependencies.
7. Edit the plan, compare versions, accept a version, or send a follow-up requirement to
   generate a new immutable version.

The chat transcript is the interaction surface, not the data model. Generated content must
also be stored as typed plan entities; do not persist the only copy as free-form chat text.
Persist each successful plan as one immutable version containing the complete hierarchy.
Regeneration and editing append versions; they must never erase previously saved Features,
Stories, or Tasks.

## 1.3 Scope

### Included in V1

- Single-user projects and saved project context.
- Text requirements and optional generation instructions.
- One-call requirement analysis and complete Feature/Story/Task generation, followed by
  deterministic whole-plan validation.
- Instruct the AI to create three to ten Features and reject output outside that range.
  The UI displays up to ten and keeps older saved plans readable.
- One parent Feature per Story and one parent Story per Task.
- Development and testing Task types, acceptance/completion criteria, priorities, and Task
  dependencies.
- Persisted run status, cancellation, one-provider-call generation, immutable plan versions, edit, accept,
  compare, and regeneration.
- User-controlled review; no automatic acceptance or Task execution.

### Explicitly excluded

- Code generation or repository modification.
- Running generated Tasks, creating branches/PRs, or deploying software.
- Autonomous peer-agent swarm, distributed queue/worker, vector database, or Redis.
- Multi-user accounts, tenant isolation, team collaboration, and public unauthenticated use.
- File ingestion or external project integrations in this phase.

## 1.4 Quality goals

- **Traceability:** Every analyzed requirement has one explicit coverage outcome; addressed
  requirements link to planning entities.
- **Bounded output:** Enforce technical payload/entity-size safety limits and a maximum of
  ten Features for newly generated plans.
- **Recoverability:** Persist a run before starting model calls; retain failed/cancelled run
  records without creating a successful version.
- **Reviewability:** Show assumptions and uncertainty instead of presenting guesses as facts.
- **Lightweight operation:** Keep one API process, one MongoDB integration, and one configured
  model provider at a time. Add infrastructure only when measured needs require it.

## 1.5 Product terms

| Term | Meaning |
|---|---|
| Requirement Brief | Goals, normalized requirements, constraints, assumptions, and open questions extracted from user input. |
| Feature | A meaningful product capability that addresses one or more requirements. |
| Story | A user-centered outcome owned by exactly one Feature. |
| Task | A reviewable implementation or testing unit owned by exactly one Story. |
| Generation Run | Durable record of one submitted generation request and its lifecycle. |
| Plan Version | Immutable, validated snapshot of one complete Feature/Story/Task hierarchy. |
| Accepted Version | Project pointer identifying the version the user approves as the current plan. |
