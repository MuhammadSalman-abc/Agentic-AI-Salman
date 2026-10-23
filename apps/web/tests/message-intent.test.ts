import assert from "node:assert/strict";
import test from "node:test";
import { isSmallTalk } from "../features/planning-chat/message-intent.js";

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
