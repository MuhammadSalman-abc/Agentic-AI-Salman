# Repository and Feature Folder Structure

## Current workspace map

```text
repository-root/
├── apps/web/                         # Next.js app
│   ├── app/                          # App Router
│   ├── features/workspace-foundation/
│   ├── config/ types/ validation/ tests/
├── servers/api/                      # Express API
│   ├── bootstrap/ middleware/
│   ├── features/health/
│   ├── integrations/mongodb/
│   ├── validation/ tests/
├── packages/{types,ui,logging}/       # Shared capabilities
├── packages/{tsconfig,eslint-config}/ # Shared config
├── prebuilt/                         # Assembled reusable solutions
├── enablers/                         # Operational support
├── codebase/                         # Repository control plane / CLI
├── .agent/                           # Instructions and standards
└── docs/                             # Product dossier
```

## Proposed ARBG additions (only when implementation is authorized)

```text
apps/web/features/backlog-workbench/
├── index.ts
├── components/
│   ├── requirement-intake.tsx
│   ├── clarification-panel.tsx
│   ├── generation-progress.tsx
│   ├── backlog-tree.tsx
│   ├── source-evidence-panel.tsx
│   ├── review-diff.tsx
│   └── approval-controls.tsx
├── hooks/
├── validation/
└── tests/

servers/api/features/
├── requirements/                     # Requirement/source lifecycle
├── generation/                       # Workflow and model adapter boundary
├── review/                            # Version/review/approval
├── exports/                           # Destination mapping and status
└── audit/                             # Audit query/write behavior

packages/types/src/api/backlog/        # Cross-workspace contracts only
```

Start flat inside each feature with only needed files; categorize when responsibilities become independently meaningful. Server feature composition is public through `index.ts`. Feature-specific contracts stay local; do not create empty role folders. This is a proposal, not an instruction to create all directories now.

## Documentation tree

```text
docs/
├── 00-INDEX.md  01-PROJECT-CHARTER.md  02-PROBLEM-STATEMENT.md
├── 03-SCOPE-AND-FEATURES.md  04-STAKEHOLDERS.md
├── 05-REQUIREMENTS/{functional,non-functional,constraints}.md
├── 06-ARCHITECTURE/{high-level,component-diagram,data-flow,agent-design,deployment,folder-structure}.md
├── 07-DATA-MODEL.md  08-API-SPEC.md  09-AGENT-SPEC.md  10-SECURITY.md
├── 11-OBSERVABILITY.md  12-TESTING-STRATEGY.md  13-DEPLOYMENT-RUNBOOK.md
├── 14-RISK-REGISTER.md  15-ADR/  16-GLOSSARY.md  17-APPENDIX.md
```
