# Project Charter — ARBG

| Field | Value |
|---|---|
| Document ID | ARBG-CHARTER-001 |
| Revision / status | 0.3 · Proposed for review |
| Product owner / technical owner | TBD |
| Security/privacy reviewer | TBD |
| Approval authority | TBD |
| Review date | 2026-10-12 |

## Executive summary

ARBG is a proposed human-supervised AI product that converts source requirements into structured, traceable backlog drafts. The proposed hierarchy is Initiative → Feature → Story → Task, with acceptance criteria. The system should expose uncertainty and evidence, allow human edits, and require approval before external publication. It is a concept, not current repository behavior.

## Business outcome

Reduce repetitive drafting while preserving human decision authority. The problem hypothesis is that teams lose time and intent when manually decomposing incomplete requests. Quantitative claims in the supplied draft have no research evidence and are not treated as facts.

## Product principles

1. Link generated content to source evidence; label assumptions and inference.
2. A model proposes; deterministic application policy and authorized humans decide.
3. Bound tool access, retries, execution time, and spend.
4. Version source and output; approval is tied to one exact version.
5. Start modular and local; distribute only when concrete load or isolation needs require it.
6. Minimize sensitive data sent to providers and telemetry.

## Proposed initial outcome

A user creates/selects a project, submits text, answers clarification questions, receives a source-linked draft hierarchy, edits and reviews it, approves an exact version, then exports it to one selected destination. Defer file parsing, historical retrieval, autonomous execution, and multiple destinations unless discovery establishes them as launch needs.

## Measurement plan

Potential measures: time spent per requirement, reviewer acceptance without major rewrite, source-supported statement rate, clarification usefulness, export success, cost per accepted draft, and user trust. Define baseline, denominator, sample, rubric, observation window, and owner before setting targets. The source draft's 90% acceptance, under 10 minutes, 99.5% uptime, and under 5% hallucination are unverified hypotheses.

## Governance

Product owner approves problem/scope; technical lead approves architecture/contracts; security/privacy owner approves data/provider/access/retention; operations owner approves deployment/recovery/on-call; QA/evaluation owner approves evaluation method. Assign names before calling this charter approved.
