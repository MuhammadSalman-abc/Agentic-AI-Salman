# Risk Register

Likelihood/impact scores are provisional qualitative prioritization aids, not measured probabilities. Reassess with named owners at discovery, design, and release gates.

| ID | Risk | L | I | Score | Mitigation | Owner/status |
|---|---|---:|---:|---:|---|---|
| R-01 | User need/adoption is unvalidated. | 4 | 4 | 16 | Interview, observe, measure; trigger: low repeat use. | Product TBD / Open |
| R-02 | Output fabricates or omits critical requirements. | 4 | 5 | 20 | Provenance, uncertainty, deterministic checks, human review, eval corpus. | QA/Product TBD / Open |
| R-03 | Prompt injection affects tools or disclosure. | 4 | 5 | 20 | No arbitrary tools, untrusted-data boundary, adversarial tests. | Security TBD / Open |
| R-04 | Data sent to unapproved provider/retained unexpectedly. | 3 | 5 | 15 | Data inventory, minimization, provider/privacy review. | Privacy TBD / Open |
| R-05 | Cross-workspace exposure. | 3 | 5 | 15 | Scoped repositories and access tests at each boundary. | Tech TBD / Open |
| R-06 | Stale/unreviewed draft exported. | 3 | 5 | 15 | Server exact-version approval and export-time recheck. | Tech TBD / Open |
| R-07 | Retry creates duplicate external items. | 3 | 4 | 12 | Idempotency and unknown-state reconciliation. | Integration TBD / Open |
| R-08 | Spend/retry loop exceeds budget. | 3 | 4 | 12 | Request/token/deadline ceilings, quotas, breaker. | Product/Ops TBD / Open |
| R-09 | Target architecture diverges from repository. | 4 | 3 | 12 | Start with current Next.js/Express; justify new runtime. | Tech TBD / Open |
| R-10 | Data loss/corruption cannot be recovered. | 2 | 5 | 10 | Backups, restore drill, recovery objective. | Ops TBD / Open |
| R-11 | Compliance claims exceed controls. | 3 | 5 | 15 | Legal/security applicability review; evidence-based claims. | Security TBD / Open |
| R-12 | Quality metrics mislead. | 3 | 4 | 12 | Defined denominator, held-out set, reviewer agreement. | QA TBD / Open |
| R-13 | Accessibility excludes reviewers. | 3 | 3 | 9 | Select target and run manual assistive review. | Product TBD / Open |
| R-14 | Runbook mismatches deployed platform. | 3 | 5 | 15 | Platform-specific rehearsal and recovery drills. | Ops TBD / Open |

```mermaid
quadrantChart
  title Provisional risk prioritization
  x-axis Low likelihood --> High likelihood
  y-axis Low impact --> High impact
  quadrant-1 Reduce likelihood and impact
  quadrant-2 Reduce likelihood
  quadrant-3 Monitor
  quadrant-4 Reduce impact
  R-01: [0.75, 0.75]
  R-02: [0.75, 1.0]
  R-03: [0.75, 1.0]
  R-04: [0.5, 1.0]
  R-05: [0.5, 1.0]
  R-06: [0.5, 1.0]
  R-07: [0.5, 0.75]
  R-08: [0.5, 0.75]
```
