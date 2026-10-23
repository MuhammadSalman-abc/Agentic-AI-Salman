import test from "node:test";
import assert from "node:assert/strict";
import type { Logger } from "@workspace/logging";
import type { Request, Response } from "express";
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from "../constants/index.js";
import { createErrorHandler, createNotFoundHandler } from "../middleware/index.js";

const logger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

void test("unknown routes enter the API error boundary with stable details and request ID", () => {
  const request = { method: "GET", path: "/missing" } as Request;
  let capturedError: unknown;
  createNotFoundHandler()(request, {} as Response, (error) => { capturedError = error; });

  let statusCode = 0;
  let body: unknown;
  const response = {
    getHeader: (name: string) => name.toLowerCase() === "x-request-id" ? "request-404" : undefined,
    status: (status: number) => { statusCode = status; return response; },
    json: (value: unknown) => { body = value; return response; }
  } as unknown as Response;
  createErrorHandler({ logger })(capturedError, request, response, () => undefined);

  assert.equal(statusCode, HTTP_STATUS.notFound);
  assert.deepEqual(body, {
    error: {
      code: ERROR_CODES.routeNotFound,
      message: ERROR_MESSAGES.routeNotFound,
      requestId: "request-404",
      details: { method: "GET", path: "/missing" }
    }
  });
});
