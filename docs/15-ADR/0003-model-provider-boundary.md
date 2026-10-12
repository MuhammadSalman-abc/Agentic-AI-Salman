# ADR-0003: Model Provider Boundary

- **Status:** Proposed · **Date:** 2026-10-12 · **Owner:** Technical lead TBD

## Context

Provider behavior, output format, retention, regions, pricing, and quality vary. Previously named models were not validated against current provider terms or evaluation results.

## Proposal

Define a narrow application-owned interface for typed inputs/outputs, cancellation/deadline, normalized errors, usage, and config version. Select provider only after current technical/privacy review and evaluation on approved data. Do not claim provider neutrality until a second adapter is contract-tested.

## Consequences

Record provider/model and prompt/schema versions for run investigation. Exclude credentials and sensitive payloads from logs. Fallback requires quality parity and data-policy approval, not merely API compatibility.
