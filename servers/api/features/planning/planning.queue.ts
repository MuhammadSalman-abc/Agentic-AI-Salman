type Job = Readonly<{ id: string; execute: () => Promise<void> }>;

/** One runtime owns this bounded FIFO; run records remain durable in MongoDB. */
export const createGenerationQueue = ({ concurrency, maxQueued, onError, onBackgroundTask }: Readonly<{
  concurrency: number; maxQueued: number; onError: (error: unknown) => void;
  onBackgroundTask?: ((task: Promise<void>) => void) | undefined;
}>) => {
  if (!Number.isInteger(concurrency) || concurrency < 1 || !Number.isInteger(maxQueued) || maxQueued < 0) throw new Error("Invalid generation queue limits");
  const waiting: Job[] = [];
  const scheduled = new Set<string>();
  const capacityListeners = new Set<() => void>();
  let active = 0;
  let reserved = 0;
  let closed = false;
  const notify = (): void => { for (const listener of capacityListeners) listener(); capacityListeners.clear(); };
  const drain = (): void => {
    while (!closed && active < concurrency && waiting.length > 0) {
      const job = waiting.shift();
      if (!job) break;
      active++;
      const task = Promise.resolve().then(job.execute).catch(onError).finally(() => {
        active--; scheduled.delete(job.id); reserved--; drain(); notify();
      });
      onBackgroundTask?.(task);
    }
  };
  const reserve = () => {
    if (closed || reserved >= concurrency + maxQueued) return null;
    reserved++;
    let used = false;
    const release = (): void => { if (!used) { used = true; reserved--; notify(); } };
    return {
      release,
      submit: (job: Job): void => {
        if (used) throw new Error("Queue reservation already consumed");
        if (closed || scheduled.has(job.id)) { release(); return; }
        used = true; scheduled.add(job.id); waiting.push(job); drain();
      }
    };
  };
  return Object.freeze({
    reserve,
    remove: (id: string): void => {
      const index = waiting.findIndex((job) => job.id === id);
      if (index >= 0) { waiting.splice(index, 1); scheduled.delete(id); reserved--; notify(); }
    },
    // Recovery waits for space instead of discarding durable queued runs.
    waitForCapacity: async (): Promise<void> => {
      while (!closed && reserved >= concurrency + maxQueued) await new Promise<void>((resolve) => { capacityListeners.add(resolve); });
    },
    close: async (): Promise<void> => {
      closed = true;
      for (const job of waiting.splice(0)) { scheduled.delete(job.id); reserved--; }
      notify();
      while (active > 0) await new Promise<void>((resolve) => { capacityListeners.add(resolve); });
    },
    snapshot: () => ({ active, queued: waiting.length, reserved, closed })
  });
};
