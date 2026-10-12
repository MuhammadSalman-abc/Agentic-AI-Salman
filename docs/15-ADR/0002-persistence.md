# ADR-0002: Persistence Strategy

- **Status:** Proposed · **Date:** 2026-10-12 · **Owner:** Technical lead TBD

## Context

ARBG requires projects, source revisions, drafts, approvals, audit events, and exports. The repo declares optional MongoDB/Mongoose integration but no ARBG schema. PostgreSQL + pgvector was previously suggested without a validated retrieval need.

## Proposal

Evaluate the existing MongoDB boundary against versioned aggregates, tenant queries, audit, idempotency, transaction needs, backup/restore, and reporting. Prefer one store for MVP. Do not add vector storage until retrieval is in scope and evaluation proves value.

## Alternatives and consequences

MongoDB reuses a current adapter; relational storage may better support relational constraints/reporting; vector storage may be added later if justified. Compare migration safety, query patterns, access isolation, deletion, operations, and cost. The logical model is not a physical schema decision.
