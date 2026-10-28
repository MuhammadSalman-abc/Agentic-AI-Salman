export type ApiErrorCode =
  | "api_rate_limit_exceeded"
  | "generation_active"
  | "generation_queue_full"
  | "internal_error"
  | "route_not_found"
  | "validation_error"
  | "project_not_found"
  | "run_not_found"
  | "run_not_cancellable"
  | "project_name_conflict"
  | "version_not_found"
  | "provider_unavailable"
  | "persistence_unavailable"
  | "idempotency_conflict"
  | "version_conflict"
  | "run_cancelled";

export type ApiErrorDetails = Readonly<Record<string, unknown>> | readonly unknown[];

export type ApiErrorResponse = Readonly<{
  error: Readonly<{
    code: ApiErrorCode;
    message: string;
    requestId?: string;
    details?: ApiErrorDetails;
  }>;
}>;
