import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "../../app/(public)/page";

test("keeps the foundation and API health UI while linking to Agentic AI", () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
  const markup = renderToStaticMarkup(<HomePage />);
  assert.match(markup, /href="\/agentic-ai"/);
  assert.match(markup, /Open your AI workspace/);
  assert.match(markup, /Everything working together/);
  assert.match(markup, /href="https:\/\/api\.example\.test\/health"/);
  assert.doesNotMatch(markup, /Project brief|Generate plan/);
});
