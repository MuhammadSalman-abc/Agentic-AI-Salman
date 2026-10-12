# Non-Functional Requirements — ARBG

Numeric targets remain TBD until workload, baseline, formula, and owner are agreed.

| ID | Quality | Proposed requirement | Evidence needed |
|---|---|---|---|
| NFR-01 | Correctness | Invalid/untraceable output cannot become review-ready. | False-pass evaluation and schema/policy tests. |
| NFR-02 | Performance | Long runs show progress and terminal status. | p50/p95 by input-size class. |
| NFR-03 | Availability | Review remains usable when model/export is down. | Service boundary, SLO window, dependency policy. |
| NFR-04 | Capacity | Support agreed user/request profile. | Concurrent users, size, arrival rate, load tests. |
| NFR-05 | Security | Authorize every project, draft, version, and export. | Threat model and negative access tests. |
| NFR-06 | Privacy | Minimize provider and telemetry data; enforce retention/deletion. | Data inventory, provider review, deletion tests. |
| NFR-07 | Reliability | Retries bounded and safe. | Error taxonomy, idempotency, failure/recovery tests. |
| NFR-08 | Auditability | Reconstruct change, approval, and export history. | Event coverage/integrity/retention policy. |
| NFR-09 | Accessibility | Review flow works with keyboard/assistive technology. | Select WCAG target and manual checks. |
| NFR-10 | Maintainability | Preserve feature ownership and explicit boundaries. | Architecture policy and focused tests. |
| NFR-11 | Cost | Bound per-request/workspace usage. | Budget, provider price source, alerts/hard caps. |
| NFR-12 | Portability | Keep narrow adapters without promising neutrality. | Second adapter test only if needed. |

## Launch gates

Authz/tenant tests pass; approval cannot be bypassed; provider/data terms approved; deletion and backup behavior documented; quality evaluation representative; cost limits enforced; and operational owner/on-call assigned.
