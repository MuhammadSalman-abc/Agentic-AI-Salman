# Stakeholders, Roles, and RACI Proposal

Names and approval authority are not assigned. Role descriptions do not imply that people currently hold these roles.

| Role | Accountability | Decision right |
|---|---|---|
| Product owner | Validated user problem, scope, outcomes. | Product acceptance and priority. |
| Domain expert / analyst | Business rules and semantics. | Domain correctness review. |
| Technical lead | Runtime boundaries, contracts, maintainability. | Technical design proposal. |
| Security/privacy reviewer | Threat model, data/provider/access/retention. | Security approval before real data. |
| Operations owner | Deploy, monitor, backup, incident response. | Production readiness. |
| QA/evaluation owner | Test design, labeled examples, quality reporting. | Evaluation methodology. |
| Workspace admin | Membership, policy, integrations. | Workspace configuration. |
| Human reviewer | Review and approve output. | Exact-version approval. |

RACI: R responsible, A accountable, C consulted, I informed.

| Activity | Product | Tech | Security | Ops | QA/Eval | Reviewer |
|---|---|---|---|---|---|---|
| Discovery and MVP scope | A/R | C | C | I | C | C |
| Architecture and API | C | A/R | C | C | C | I |
| Provider and data approval | C | R | A | C | I | I |
| Quality rubric and evaluation | A | C | C | I | R | C |
| Approve generated output | I | I | I | I | C | A/R |
| Production readiness | A | R | C | A/R | C | I |
| Incident response | I | R | C | A/R | C | I |
