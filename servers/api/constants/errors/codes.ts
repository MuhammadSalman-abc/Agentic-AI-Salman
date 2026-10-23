import type { ApiErrorCode } from "@workspace/types";

export const ERROR_CODES = Object.freeze({
  internal: "internal_error",
  routeNotFound: "route_not_found",
  validation: "validation_error",
  projectNotFound: "project_not_found",
  runNotFound: "run_not_found",
  runNotCancellable: "run_not_cancellable",
  projectNameConflict: "project_name_conflict",
  versionNotFound: "version_not_found",
  providerUnavailable: "provider_unavailable",
  persistenceUnavailable: "persistence_unavailable",
  idempotencyConflict: "idempotency_conflict",
  versionConflict: "version_conflict",
  runCancelled: "run_cancelled"
} as const satisfies Readonly<Record<string, ApiErrorCode>>);
