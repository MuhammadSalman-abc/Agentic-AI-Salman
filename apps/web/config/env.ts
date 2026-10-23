import {
  validateWebEnvironment
} from "@/validation/env.validation";
import type { ValidatedWebEnvironment, WebEnvironmentSource } from "@/types";

export const readWebEnvironment = (
  source?: WebEnvironmentSource
): ValidatedWebEnvironment => validateWebEnvironment({
  NEXT_PUBLIC_API_BASE_URL: source
    ? source.NEXT_PUBLIC_API_BASE_URL
    : process.env.NEXT_PUBLIC_API_BASE_URL
});
