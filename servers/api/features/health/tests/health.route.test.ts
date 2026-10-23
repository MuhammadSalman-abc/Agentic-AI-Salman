import test from "node:test";
import assert from "node:assert/strict";
import type { Request, RequestHandler, Response } from "express";
import { HTTP_STATUS } from "../../../constants/index.js";
import { createHealthRoutes } from "../index.js";

void test("GET /health is registered and invokes the composed feature behavior", async () => {
  const router = createHealthRoutes({ environment: "test", serviceName: "api" }) as unknown as Readonly<{
    stack: readonly Readonly<{
      route?: Readonly<{
        path: string;
        methods: Readonly<Record<string, boolean>>;
        stack: readonly Readonly<{ handle: RequestHandler }>[];
      }>;
    }>[];
  }>;
  const route = router.stack.find(({ route: candidate }) => candidate?.path === "/health")?.route;
  assert.ok(route);
  assert.equal(route.methods.get, true);
  const handler = route.stack[0]?.handle;
  assert.ok(handler);

  let statusCode = 0;
  let body: unknown;
  const request = { method: "GET", path: "/health" } as Request;
  const response = {
    status: (status: number) => { statusCode = status; return response; },
    json: (value: unknown) => { body = value; return response; }
  } as unknown as Response;
  await handler(request, response, () => undefined);

  assert.equal(statusCode, HTTP_STATUS.ok);
  assert.deepEqual(body, {
    status: "ok",
    service: "api",
    environment: "test"
  });
});
