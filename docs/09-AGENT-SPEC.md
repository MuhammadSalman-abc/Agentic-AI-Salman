# Agent and Workflow Specification

## Principle

Model steps propose structured output; deterministic application code validates it. Models cannot authorize, approve, or publish. No unrestricted tools.

## Step contracts

| Step | Input → output | Guardrail |
|---|---|---|
| Clarifier | Source/policy → `{ready, questions[]}` with reason and source refs. | No invented facts; cap questions; validate anchors. |
| Planner | Source/answers → outline, proposed levels, dependencies, open questions. | Preserve given hierarchy; mark inference. |
| Item generator | Valid plan → candidate items/criteria/provenance. | Strict schema; factual claims need source or assumption label. |
| Critic | Candidate/source/findings → issue list/scorecard. | Advisory only; cannot self-certify or approve. |
| Repair | Candidate + allowlisted issue codes → revised candidate. | Bounded; revalidate all fields. |

## Candidate response schema

```json
{
  "schemaVersion": "1",
  "items": [{
    "localId": "item-1",
    "kind": "story",
    "parentLocalId": "item-0",
    "title": "Require a second factor during sign-in",
    "description": "As an account holder, I want a second verification step so access is protected beyond a password.",
    "acceptanceCriteria": [{
      "text": "Given a second factor is required, when a valid password is entered, then the user is prompted for the configured factor.",
      "sourceRefs": ["src-4"],
      "verification": "behavior"
    }],
    "sourceRefs": ["src-4"],
    "assumptions": [],
    "openQuestions": ["Which second-factor methods are supported?"]
  }]
}
```

Illustrative only; unresolved product choices are surfaced as questions rather than made up.

## Source references

Use app-generated stable block IDs with `{sourceRevisionId, blockId, startOffset, endOffset}`. Validate offsets against exact revision. Document parsers later need page/paragraph anchors and normalized checksums. Never trust model-generated offsets without verification.

## Deterministic gates

1. Strict schema parse; validate allowed kinds and required fields.
2. Check unique IDs, valid parent-child relations, no cycles, depth and size bounds.
3. Validate every source link and required criterion.
4. Label unsupported claims as assumptions; block unresolved critical traceability gaps.
5. Detect duplicates and return findings; do not silently merge.
6. Apply project policy, rate/cost budget, and execution deadline.
7. Set review-ready only with no blocking findings.

## Evaluation rubric

Score source fidelity, coverage, ambiguity handling, criterion testability, hierarchy coherence, duplication, unsupported-claim rate, and safety. The critic model is not the sole evaluator. Use deterministic checks, human-labeled held-out examples, reviewer outcomes, and uncertainty reporting.

## Safe fallback

Malformed output gets bounded repair only. Invalid source refs are never guessed. Persist safe failure status and allow explicit user resume. Never export from a generation step.
