import type { ApiErrorCode, ApiErrorDetails } from "@workspace/types";
import type { ERROR_CODES, HTTP_STATUS } from "../constants/index.js";

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];
type ServerErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class ApplicationError extends Error {
  readonly kind = "application-error" as const;
  readonly code: ServerErrorCode & ApiErrorCode;
  readonly status: HttpStatus;
  readonly details: ApiErrorDetails | undefined;

  constructor(input: Readonly<{
    code: ServerErrorCode & ApiErrorCode;
    message: string;
    status: HttpStatus;
    details?: ApiErrorDetails | undefined;
  }>) {
    super(input.message);
    this.name = "ApplicationError";
    this.code = input.code;
    this.status = input.status;
    this.details = input.details;
  }
}
