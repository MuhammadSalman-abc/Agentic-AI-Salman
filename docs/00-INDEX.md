# ARBG Product and Engineering Dossier

**Product:** Agentic Requirement-to-Backlog Generator (ARBG)  
**Dossier:** Detailed proposal for product and engineering review · **Revision:** 0.3 · **Reviewed:** 2026-10-12  
**Status:** No product scope, provider, production architecture, or SLO has been approved.

This dossier makes the supplied concept concrete enough to plan and estimate. It separates checked repository facts from target design. All product behavior, target architecture, data model, and thresholds remain proposals until owners approve them.

## Reading order

- [Charter](01-PROJECT-CHARTER.md) · [Problem and discovery](02-PROBLEM-STATEMENT.md) · [Scope and feature catalogue](03-SCOPE-AND-FEATURES.md) · [Stakeholders](04-STAKEHOLDERS.md)
- [Functional requirements](05-REQUIREMENTS/functional.md) · [Quality requirements](05-REQUIREMENTS/non-functional.md) · [Constraints and unknowns](05-REQUIREMENTS/constraints.md)
- [High-level architecture](06-ARCHITECTURE/high-level.md) · [Components](06-ARCHITECTURE/component-diagram.md) · [Data flows](06-ARCHITECTURE/data-flow.md) · [Agent design](06-ARCHITECTURE/agent-design.md) · [Deployment](06-ARCHITECTURE/deployment.md) · [Folder structure](06-ARCHITECTURE/folder-structure.md)
- [Data model](07-DATA-MODEL.md) · [API proposal](08-API-SPEC.md) · [Agent contract](09-AGENT-SPEC.md) · [Security](10-SECURITY.md) · [Observability](11-OBSERVABILITY.md) · [Testing](12-TESTING-STRATEGY.md)
- [Deployment runbook template](13-DEPLOYMENT-RUNBOOK.md) · [Risk register](14-RISK-REGISTER.md) · [ADRs](15-ADR/README.md) · [Glossary](16-GLOSSARY.md) · [Appendix](17-APPENDIX.md)

## Repository baseline

Verified current workspaces: `apps/web` is Next.js; `servers/api` is Express/TypeScript with a health feature and optional MongoDB integration; `packages/types`, `packages/ui`, and `packages/logging` provide shared capabilities; `codebase/` owns repository discovery and task orchestration. The repository does **not** currently implement ARBG generation, agents, authentication, backlog export, or production deployment.

**Recommended starting point:** implement ARBG as feature-owned modules in existing web/API workspaces; evaluate the existing MongoDB adapter as the initial persistence candidate; use bounded TypeScript workflow steps rather than unrestricted autonomous agents. Add queues, retrieval, providers, integrations, or services only when a validated requirement justifies them.

## Status vocabulary

**Current/verified** means observed in repository source or manifests. **Recommended proposal** is a concrete baseline for review, not an accepted decision. **TBD** requires an owner decision. A **target** becomes an SLO only after its formula, population, window, and owner are approved.
