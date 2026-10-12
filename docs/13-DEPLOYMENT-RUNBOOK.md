# Deployment Runbook Template

**Status:** Not executable. Provider, database, CI/CD, domains, secrets, and production environment are unselected. Populate and rehearse before deployment.

## Release record

| Field | Value |
|---|---|
| Release and artifact digest | TBD |
| Change/commit | TBD |
| Environment/window | TBD |
| Release owner/approver | TBD |
| Migration/backup check | TBD |
| Rollback trigger/owner | TBD |
| On-call/incident channel | TBD |

## Pre-deploy gates

- [ ] Product, technical, security/privacy, operations approvals recorded.
- [ ] CI, dependency/security scans, and model evaluation regression pass.
- [ ] Artifact digest and config revision verified.
- [ ] Secrets validated without printing values.
- [ ] Backup age and restore path verified before data changes.
- [ ] Migration compatibility/restore plan tested.
- [ ] Provider/destination credentials least-privilege and environment-correct.
- [ ] Export reconciliation owner available.

## Release procedure (platform steps TBD)

1. Confirm approved change window and communications owner.
2. Verify immutable artifact and configuration.
3. Apply backward-compatible migration if needed; record result.
4. Deploy staged/canary where supported.
5. Run health/readiness and synthetic non-sensitive generation.
6. Check workflow errors, provider use, export status, data writes, and telemetry redaction.
7. Expand traffic after agreed observation and approvals.
8. Record operator, artifact, migration, and outcome.

## Rollback/recovery

Triggers are TBD. Prefer app rollback with compatible schema. Do not run destructive migration downgrade reflexively; assess forward-fix versus restore. Reconcile uncertain export before retry. Preserve source revisions and audit evidence. Define customer impact communication.

## Post-deployment checks

Health, authorization, creation, bounded generation, review/approval invariants, export state, cost limits, alerts, job recovery (if used), and backup status. Do not use this as a live runbook while fields remain TBD.
