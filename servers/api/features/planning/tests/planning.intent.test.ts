import assert from "node:assert/strict";
import test from "node:test";
import { findSavedRequirementInputSchema, generatePlanInputSchema } from "../planning.validation.js";
import { requirementClarification } from "../planning-intent.js";

void test("non-requirements receive clarification before lookup or generation", () => {
  for (const requirement of ["han bhai kia hall he kese he", "What can you do for me today?", "Tell me a joke about cats", "What is a software application?", "I need an app", "asdf qwer zxcv random nonsense", "What is the weather in Karachi?"]) {
    for (const schema of [findSavedRequirementInputSchema, generatePlanInputSchema]) {
      const result = schema.safeParse({ requirement });
      assert.equal(result.success, false, requirement);
      assert.ok(result.error.issues.some((issue) => issue.path[0] === "requirement" && issue.message === requirementClarification), requirement);
    }
  }
});

void test("short English and Roman Urdu capabilities remain valid requirements", () => {
  for (const requirement of ["Add to cart", "Reset password", "As a user, I want to save my favorite items.", "Build a simple task manager with editing and filtering.", "mjh login app bana do", "Persist a generated plan and allow the saved version to be retrieved."]) {
    assert.equal(generatePlanInputSchema.safeParse({ requirement }).success, true, requirement);
    assert.equal(findSavedRequirementInputSchema.safeParse({ requirement }).success, true, requirement);
  }
});
