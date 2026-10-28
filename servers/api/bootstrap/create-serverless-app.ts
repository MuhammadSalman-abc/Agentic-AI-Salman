import express, { type Express } from "express";

/** Share one in-flight initialization per warm instance, retrying a failed connection. */
export const createServerlessApp = (initialize: () => Promise<Express>): Express => {
  let initialized: Promise<Express> | undefined;
  const app = express();
  app.disable("x-powered-by");
  app.use((request, response) => {
    initialized ??= initialize().catch((error: unknown) => { initialized = undefined; throw error; });
    void initialized.then((ready) => { ready(request, response); }).catch(() => {
      response.status(503).json({ error: { code: "runtime_unavailable", message: "API runtime is temporarily unavailable." } });
    });
  });
  return app;
};
