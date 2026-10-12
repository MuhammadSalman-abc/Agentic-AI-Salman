# Appendix — Evidence, Open Questions, and Traceability

## Repository evidence checked

Project inventory was read using `node codebase/cli/repo.mjs projects --json`. Current units include `apps/web` (Next.js), `servers/api` (Express), `packages/types`, `packages/ui`, `packages/logging`. API source has a health feature and optional MongoDB integration; `MONGODB_URI` is optional. Policy is in root `AGENTS.md`, `architecture.yaml`, and `.agent/instructions/architecture.md`. No ARBG generation, auth, export adapter, agent framework, or production deployment was found in inspected units.

## Unverified source-draft claims

40–60% time savings; 2–5 days or 38 hours per requirement; 40% missing criteria; 90% approval; under 10-minute generation; 99.5% uptime; under 5% hallucination; 1,000 concurrent users; 80% coverage; $0.50/request. No sample, denominator, corpus, workload, or measurement rule was provided. These are not targets here.

## Open questions

| ID | Question | Owner |
|---|---|---|
| Q-01 | Is ARBG the product to implement here? Who owns product approval? | Product TBD |
| Q-02 | First user persona and workflow? | Product TBD |
| Q-03 | First export destination? | Product/engineering TBD |
| Q-04 | Identity and workspace model? | Technical/security TBD |
| Q-05 | Which data may go to which provider/region? | Security/privacy TBD |
| Q-06 | Is text-only intake sufficient? | Product TBD |
| Q-07 | Which store fits version/audit/access needs? | Technical TBD |
| Q-08 | Is durable async execution needed? | Tech/ops TBD |
| Q-09 | Evaluation corpus, rubric, acceptable errors? | QA/product TBD |
| Q-10 | Budget, schedule, SLO, RTO/RPO, on-call? | Product/ops TBD |
| Q-11 | Retention, deletion, backup, legal hold? | Security/legal TBD |
| Q-12 | Accessibility standard and localization? | Product TBD |

## Goal-to-feature traceability

| Goal | Features | Requirements |
|---|---|---|
| Preserve source intent | F-02–F-08 | FR-02–FR-07 |
| Reduce drafting effort | F-04–F-09 | FR-03–FR-08 |
| Preserve human authority | F-09–F-12 | FR-09–FR-11 |
| Accountability | F-10, F-13 | FR-09, FR-12 |
| Control side effects | F-11–F-14 | FR-10, FR-11, FR-15 |

Numeric targets must state formula, denominator, population, time window, source, owner, and limitations. Quality rates also need evaluator rubric, reviewer agreement, sample selection, and confidence/limitations.
