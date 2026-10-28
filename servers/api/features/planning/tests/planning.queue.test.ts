import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { createGenerationQueue } from "../planning.queue.js";

const deferred = () => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

void test("queue bounds concurrency, preserves FIFO, deduplicates scheduled IDs and rejects overflow", async () => {
  const started: string[] = [];
  const blockers = [deferred(), deferred(), deferred()];
  const queue = createGenerationQueue({ concurrency: 1, maxQueued: 2, onError: () => assert.fail("Unexpected job failure") });
  for (const [index, blocker] of blockers.entries()) {
    const reservation = queue.reserve();
    assert.ok(reservation);
    reservation.submit({ id: String(index), execute: async () => { started.push(String(index)); await blocker.promise; } });
    reservation.release(); // Releasing a consumed reservation cannot free an active slot.
  }
  assert.equal(queue.reserve(), null);
  await setImmediate();
  assert.deepEqual(started, ["0"]);
  assert.deepEqual(queue.snapshot(), { active: 1, queued: 2, reserved: 3, closed: false });
  blockers[0]?.resolve(); await setImmediate();
  assert.deepEqual(started, ["0", "1"]);
  const duplicate = queue.reserve(); assert.ok(duplicate);
  duplicate.submit({ id: "1", execute: () => { assert.fail("Duplicate must not execute"); } });
  blockers[1]?.resolve(); await setImmediate();
  assert.deepEqual(started, ["0", "1", "2"]);
  blockers[2]?.resolve(); await setImmediate();
  await queue.close();
  assert.equal(queue.snapshot().reserved, 0);
});

void test("failed jobs release capacity; cancelled waiting jobs never execute", async () => {
  const errors: unknown[] = [];
  const blocker = deferred();
  const queue = createGenerationQueue({ concurrency: 1, maxQueued: 1, onError: (error) => { errors.push(error); } });
  const first = queue.reserve(); assert.ok(first);
  first.submit({ id: "fails", execute: async () => { await blocker.promise; throw new Error("expected failure"); } });
  const second = queue.reserve(); assert.ok(second);
  second.submit({ id: "cancelled", execute: () => { assert.fail("Cancelled job executed"); } });
  queue.remove("cancelled");
  assert.equal(queue.snapshot().queued, 0);
  blocker.resolve(); await setImmediate();
  assert.equal(errors.length, 1);
  assert.equal(queue.snapshot().reserved, 0);
  await queue.close();
});

void test("shutdown drains the active call and leaves waiting jobs unexecuted for durable recovery", async () => {
  const blocker = deferred();
  const queue = createGenerationQueue({ concurrency: 1, maxQueued: 1, onError: () => assert.fail("Unexpected failure") });
  const active = queue.reserve(); assert.ok(active);
  active.submit({ id: "active", execute: () => blocker.promise });
  const waiting = queue.reserve(); assert.ok(waiting);
  waiting.submit({ id: "queued", execute: () => { assert.fail("Waiting job must stay durable"); } });
  await setImmediate();
  let stopped = false;
  const stop = queue.close().then(() => { stopped = true; });
  await setImmediate(); assert.equal(stopped, false);
  assert.equal(queue.reserve(), null);
  blocker.resolve(); await stop;
  assert.equal(stopped, true);
});
