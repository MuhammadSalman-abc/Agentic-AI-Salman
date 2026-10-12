# Glossary

| Term | Definition |
|---|---|
| Agent step | Bounded model-backed operation; output is validated by application. |
| Approval | Human authorization for one immutable draft version to export. |
| Assumption | Proposition not established by source, visibly labeled for review. |
| Audit event | Actor/system, action, target, time, and outcome under defined integrity/retention policy. |
| Backlog item | Initiative, feature, story, or task within a draft. |
| Clarification | Question because an unresolved decision blocks useful/safe drafting. |
| Draft version | Immutable snapshot of generated or human-edited items. |
| Export | Side-effecting transfer of approved version to external destination. |
| Unsupported claim | Output presented as source-grounded without adequate evidence; evaluator definition required. |
| Idempotency key | Key to recognize repeated requests and prevent duplicate side effects. |
| Initiative | High-level outcome grouping features; semantics to validate. |
| Requirement | User-provided source statement/revision. |
| Source reference | Stable pointer into exact source revision. |
| Workspace/tenant | Authorization and data-isolation boundary; exact account semantics TBD. |
| Traceability | Ability to follow generated items/decisions back to source evidence. |
| Unknown export | Destination may have accepted request but response is absent; reconcile before retry. |
