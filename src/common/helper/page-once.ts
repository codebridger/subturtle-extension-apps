/**
 * Run a piece of async work once per page across ALL of our content-script
 * bundles.
 *
 * main.js, nibble.js and console-crane.js are separate webpack bundles, so
 * each has its own copy of every module (its own modular-rest `authentication`,
 * profile store, mixpanel instance) and module-level single-flight guards
 * don't see each other. They DO share one thing: Chrome runs all content
 * scripts of one extension in a frame inside the same isolated world, so they
 * share `globalThis`. The registry lives there.
 *
 * The first caller for a key is the leader and runs `work`; later callers get
 * the leader's promise and should adopt its result instead of repeating the
 * network calls. A rejected run is evicted so the next caller can retry.
 *
 * Never put anything here the host page shouldn't see — it can't: the
 * isolated world's globals are invisible to page scripts.
 */
const REGISTRY_KEY = "__subturtlePageOnce";

function registry(): Map<string, Promise<unknown>> {
  const g = globalThis as any;
  if (!(g[REGISTRY_KEY] instanceof Map)) g[REGISTRY_KEY] = new Map();
  return g[REGISTRY_KEY];
}

export function pageOnce<T>(
  key: string,
  work: () => Promise<T>
): { leader: boolean; promise: Promise<T> } {
  const map = registry();
  const existing = map.get(key) as Promise<T> | undefined;
  if (existing) return { leader: false, promise: existing };

  const promise = work();
  map.set(key, promise);
  promise.catch(() => {
    if (map.get(key) === promise) map.delete(key);
  });
  return { leader: true, promise };
}

/** Test helper: forget every page-level run. */
export function resetPageOnce() {
  registry().clear();
}
