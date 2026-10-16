import { describe, it, expect, beforeEach } from "vitest";
import { installMemoryChromeStorage } from "./memory-chrome-storage";
import {
  addPendingSave,
  countPendingSaves,
  findPendingSave,
  listPendingSaves,
  MAX_PENDING_SAVES,
  onPendingSavesChange,
  PENDING_SAVES_KEY,
  removePendingSave,
} from "../src/common/services/pending-saves";

// save-first E-02: the local list of phrases saved before sign-in.

const item = (phrase: string, extra: Record<string, any> = {}) => ({
  phrase,
  translation: `fa:${phrase}`,
  translation_language: "fa",
  ...extra,
});

describe("pending saves (local list)", () => {
  let mem: Record<string, any>;

  beforeEach(() => {
    mem = installMemoryChromeStorage();
  });

  it("stores everything createPhrase needs under one key", async () => {
    const r = await addPendingSave(
      item("  give up ", {
        context: "never give up",
        direction: { source: "ltr", target: "rtl" },
        language_info: { source: "en", target: "fa" },
        linguistic_data: { definition: "stop trying" },
        chunks: [{ text: "give" }],
        sourceUrl: "https://example.com/a",
        pageTitle: "A page",
        savedAt: 123,
      })
    );

    expect(r).toEqual({ status: "added", count: 1 });
    expect(mem[PENDING_SAVES_KEY]).toEqual([
      {
        phrase: "give up",
        translation: "fa:  give up",
        translation_language: "fa",
        context: "never give up",
        direction: { source: "ltr", target: "rtl" },
        language_info: { source: "en", target: "fa" },
        linguistic_data: { definition: "stop trying" },
        chunks: [{ text: "give" }],
        sourceUrl: "https://example.com/a",
        pageTitle: "A page",
        savedAt: 123,
      },
    ]);
  });

  it("keeps one copy when the same phrase is saved twice", async () => {
    await addPendingSave(item("give up", { context: "old" }));
    const r = await addPendingSave(item(" give up", { context: "new" }));

    expect(r).toEqual({ status: "exists", count: 1 });
    expect((await listPendingSaves())[0].context).toBe("new");
  });

  it("finds a saved phrase by its trimmed text", async () => {
    await addPendingSave(item("give up"));
    expect(await findPendingSave(" give up ")).not.toBeNull();
    expect(await findPendingSave("give")).toBeNull();
    expect(await findPendingSave("")).toBeNull();
  });

  it(`refuses a new phrase at ${MAX_PENDING_SAVES}, but still updates a saved one`, async () => {
    mem[PENDING_SAVES_KEY] = Array.from({ length: MAX_PENDING_SAVES }, (_, i) => ({
      ...item(`p${i}`),
      savedAt: i,
    }));

    expect(await addPendingSave(item("one more"))).toEqual({
      status: "full",
      count: MAX_PENDING_SAVES,
    });
    expect(await addPendingSave(item("p3"))).toEqual({
      status: "exists",
      count: MAX_PENDING_SAVES,
    });
    expect(await countPendingSaves()).toBe(MAX_PENDING_SAVES);
  });

  it("removes one phrase and reports how many are left", async () => {
    await addPendingSave(item("a"));
    await addPendingSave(item("b"));
    expect(await removePendingSave(" a")).toBe(1);
    expect((await listPendingSaves()).map((p) => p.phrase)).toEqual(["b"]);
  });

  it("tells listeners the new count", async () => {
    const counts: number[] = [];
    const stop = onPendingSavesChange((n) => counts.push(n));
    await addPendingSave(item("a"));
    await addPendingSave(item("b"));
    stop();
    await addPendingSave(item("c"));
    expect(counts).toEqual([1, 2]);
  });

  it("an empty or broken value reads as an empty list", async () => {
    mem[PENDING_SAVES_KEY] = "broken";
    expect(await listPendingSaves()).toEqual([]);
  });
});
