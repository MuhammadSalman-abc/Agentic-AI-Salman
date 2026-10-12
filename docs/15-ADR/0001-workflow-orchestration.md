# ADR-0001: Bounded Application Workflow

- **Status:** Proposed · **Date:** 2026-10-12 · **Owner:** Technical lead TBD

## Context

Stages include clarification, planning, drafting, validation, review, and export. The source proposed LangGraph and seven agents, but this repository is TypeScript/Express and has no agent framework. Unbounded autonomy increases tool and failure risk.

## Proposal

Use an explicit typed workflow in the API feature. Model calls are isolated steps returning candidates; application code owns state, policy, retries, approval, and side effects. Evaluate an orchestration library only if durable branching/replay cannot be handled simply.

## Alternatives

| Option | Benefit | Cost |
|---|---|---|
| Single call | Lowest complexity/latency. | May not handle clarification/quality. |
| Explicit TypeScript workflow | Fits runtime and keeps decisions deterministic. | Durable long jobs need design. |
| Agent graph library | State graph and resumability. | Runtime compatibility/coupling/evaluation. |
| Separate workflow engine | Durable at scale. | Operations unjustified before workload evidence. |

Prototype simple and graph-based workflows on same corpus; compare quality, latency, spend, retry safety, recovery, observability, maintenance. No framework accepted yet.
