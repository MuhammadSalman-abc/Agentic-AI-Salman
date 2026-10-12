# Observability and Service Management

## Correlation and telemetry

Create an operation correlation ID and propagate through API, workflow, provider, storage, and export. Use structured logs and low-cardinality dimensions. Do not use user IDs, source text, prompt text, titles, or external IDs as metric labels.

## Candidate metrics

| Metric | Dimensions | Purpose / guardrail |
|---|---|---|
| Request outcome/count | environment, feature, outcome | Adoption/reliability; no high-cardinality workspace label. |
| Workflow duration | step, outcome, size bucket | Bottlenecks; coarse buckets only. |
| Provider calls/tokens/cost estimate | provider, model family, step | Spend/health; estimates labeled as estimates. |
| Validation findings | rule code/severity | Quality trends; no generated text label. |
| Human outcomes | approve/reject/change, revision count | Product signal; not itself a hallucination rate. |
| Export outcomes | destination type/status | Integration reliability; redact external IDs. |
| Queue age/depth | queue/priority | Only if async queue exists. |

## Alerts

Candidate: sustained API/workflow failure, provider quota exhaustion, spend near approved budget, queue age above target, unresolved export outcomes, backup/restore failure. Thresholds/channels are TBD until baselines and on-call owner exist. Do not alert on “hallucination” absent a validated label pipeline.

## SLO worksheet

Define boundary and user-visible success first. Candidate indicators: draft retrievability, generation completion within input-size class, export success or safely reconciled state, and API availability. Choose window, target, exclusions, dependency treatment, and error budget with operations owner. Source draft uptime/latency values are not approved SLOs.

## Incident investigation

Trace by run/request ID; inspect normalized error/config version; access source/draft only through authorized UI; preserve relevant events; redact before sharing; record impact and recovery. Define production-debug access and audit controls.
