import { vi } from "vitest";

/**
 * An in-memory chrome.storage.local for tests that need real reads and
 * writes. Supports the callback form (as tests/setup.ts does) and the promise
 * form MV3 code uses, plus `remove`, and calls chrome.storage.onChanged
 * listeners like Chrome does. Returns the backing object.
 */
export function installMemoryChromeStorage(): Record<string, any> {
  const mem: Record<string, any> = {};
  const listeners: Array<(changes: any, area: string) => void> = [];

  const notify = (changes: Record<string, any>) => {
    for (const l of [...listeners]) l(changes, "local");
  };

  const local = chrome.storage.local as any;
  local.get = vi.fn((keys: any, cb?: (d: any) => void) => {
    const list = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(mem);
    const out: Record<string, any> = {};
    for (const k of list) if (k in mem) out[k] = structuredClone(mem[k]);
    if (cb) return cb(out);
    return Promise.resolve(out);
  });
  local.set = vi.fn((obj: Record<string, any>, cb?: () => void) => {
    const changes: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      changes[k] = { oldValue: mem[k], newValue: structuredClone(v) };
      mem[k] = structuredClone(v);
    }
    notify(changes);
    if (cb) return cb();
    return Promise.resolve();
  });
  local.remove = vi.fn((key: string, cb?: () => void) => {
    const changes = { [key]: { oldValue: mem[key], newValue: undefined } };
    delete mem[key];
    notify(changes);
    if (cb) return cb();
    return Promise.resolve();
  });

  const onChanged = chrome.storage.onChanged as any;
  onChanged.addListener = vi.fn((l: any) => listeners.push(l));
  onChanged.removeListener = vi.fn((l: any) => {
    const i = listeners.indexOf(l);
    if (i >= 0) listeners.splice(i, 1);
  });

  return mem;
}
