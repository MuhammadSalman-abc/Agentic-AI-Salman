# ADR-0004: Human Approval Before Export

- **Status:** Proposed product invariant · **Date:** 2026-10-12 · **Owner:** Product owner TBD

## Context

Generated content can be incomplete or misaligned; external publishing has consequences.

## Proposal

Require authorized human approval of exact immutable version. Edits create a new version and clear approval. Server rechecks authority and approval immediately before export. Record result and reconcile unknown outcomes.

## Consequences

Adds review time but creates accountability. Approval roles and UI need design. Automatic publishing is excluded from MVP; any future bypass needs separate policy and risk review.
