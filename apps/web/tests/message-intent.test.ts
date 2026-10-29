import assert from "node:assert/strict";
import test from "node:test";
import { isSmallTalk } from "../features/planning-chat/message-intent.js";
import { requestJson, requirementClarification, RequirementClarificationError } from "../features/planning-chat/planning-request.js";

test("recognizes common Roman Urdu ways of asking how someone is", () => {
  for (const message of ["tum kese ho?", "tm kese ho", "yrr tm kese ho", "tum kaisay ho", "aap kaise hain", "ap ksy ho?", "kese ho tum", "han bhai kia hall he kese he"]) {
    assert.equal(isSmallTalk(message), true, message);
  }
});

test("keeps actual product requirements on the planning path", () => {
  for (const message of [
    "As a user, I want to reset my password using email.",
    "Create a task management app where users can add and complete tasks.",
    "Users need to update their profile picture.",
    "Han bhai, build an app where users can track their daily tasks and deadlines."
  ]) {
    assert.equal(isSmallTalk(message), false, message);
  }
});

test("only requirement clarification responses become conversational guidance", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () => Promise.resolve(Response.json({ error: { code: "validation_error", message: "Invalid input", details: [{ code: "custom", path: ["requirement"], message: requirementClarification }] } }, { status: 400 }));
    await assert.rejects(requestJson("https://example.test/api/planning/versions/lookup"), RequirementClarificationError);
    for (const status of [400, 429, 500]) {
      globalThis.fetch = () => Promise.resolve(Response.json({ error: { code: "internal_error", message: "An actual failure" } }, { status }));
      await assert.rejects(requestJson("https://example.test/api"), (error: unknown) => error instanceof Error && !(error instanceof RequirementClarificationError) && error.message === "An actual failure");
    }
    globalThis.fetch = () => Promise.resolve(Response.json({ match: null }));
    assert.deepEqual(await requestJson("https://example.test/api"), { match: null });
  } finally { globalThis.fetch = originalFetch; }
});
