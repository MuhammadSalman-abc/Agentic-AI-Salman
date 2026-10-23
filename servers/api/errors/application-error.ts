import { ApplicationError } from "./types.js";

type ApplicationErrorInput = Readonly<{
  code: ApplicationError["code"];
  message: string;
  status: ApplicationError["status"];
  details?: ApplicationError["details"];
}>;

export const createApplicationError = (input: ApplicationErrorInput): ApplicationError =>
  Object.freeze(new ApplicationError(input));

export const isApplicationError = (error: unknown): error is ApplicationError =>
  typeof error === "object" && error !== null && "kind" in error && error.kind === "application-error";
