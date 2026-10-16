import { describe, it, expect, beforeEach, vi } from "vitest";

// save-first E-04: after sign-in, local phrases go to the account with
// createPhrase, one run at a time, and leave the list only when accepted.

const auth = vi.hoisted(() => ({
  isLogin: true,
  user: { id: "u1", type: "user" } as { id: string; type: string } | null,
}));
const { run, findOne, insertOne } = vi.hoisted(() => ({
  run: vi.fn(),
  findOne: vi.fn(),
  insertOne: vi.fn(),
}));
vi.mock("@modular-rest/client", () => ({
  authentication: auth,
  functionProvider: { run },
  dataProvider: { findOne, insertOne },
}));
vi.mock("../src/common/helper/install-id", () => ({
  getInstallId: vi.fn(async () => "install-1"),
}));

import { installMemoryChromeStorage } from "./memory-chrome-storage";
import {
  FALLBACK_BUNDLE_TITLE,
  isSaveLimitError,
  SYNC_LOCK_KEY,
  syncPendingSaves,
} from "../src/common/services/pending-saves-sync";
import {
  addPendingSave,
  listPendingSaves,
} from "../src/common/services/pending-saves";
import { analytic } from "../src/plugins/mixpanel";
import { createPinia, setActivePinia } from "pinia";
import { useLanguageStore } from "../src/stores/language";
import type { LanguageState, LanguageSummary } from "../src/common/language/types";

const track = vi.mocked(analytic.track);

const LIMIT_ERROR = {
  status: "error",
  error: 'TIER_LIMIT_REACHED: "save_words" limit reached (200)',
};

async function seed(...phrases: string[]) {
  let t = 1;
  for (const phrase of phrases) {
    await addPendingSave({
      phrase,
      translation: `fa:${phrase}`,
      translation_language: "fa",
      sourceUrl: "https://example.com/show/1",
      pageTitle: "My Show - Episode 1",
      savedAt: t++,
    });
  }
}

/** createPhrase calls, in order. */
const createCalls = () =>
  run.mock.calls.map(([c]) => c).filter((c) => c.name === "createPhrase");

describe("syncPendingSaves", () => {
  let mem: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    mem = installMemoryChromeStorage();
    auth.isLogin = true;
    auth.user = { id: "u1", type: "user" };
    findOne.mockResolvedValue(null);
    insertOne.mockResolvedValue({ _id: "b-new" });
    run.mockImplementation(async ({ name }: any) =>
      name === "getBundleSuggestionForPage"
        ? { matchedBundle: null, suggestedName: "My Show" }
        : { _id: "p" }
    );
  });

  it("sends each phrase, oldest first, with deviceId, and empties the list", async () => {
    await seed("first", "second");
    const result = await syncPendingSaves();

    expect(result).toMatchObject({ sent: 2, failed: 0, left: 0, limitReached: false });
    expect(createCalls().map((c) => c.args.phrase)).toEqual(["first", "second"]);
    expect(createCalls()[0].args).toMatchObject({
      translation: "fa:first",
      translation_language: "fa",
      deviceId: "install-1",
      bundleIds: ["b-new"],
      refId: "u1",
      type: "linguistic",
      sourceUrl: "https://example.com/show/1",
    });
    expect(await listPendingSaves()).toEqual([]);
    expect(track).toHaveBeenCalledWith("pending-saves_synced", {
      sent: 2,
      failed: 0,
      left: 0,
    });
    expect(mem[SYNC_LOCK_KEY]).toBeUndefined();
  });

  it("creates the suggested bundle once per page", async () => {
    await seed("a", "b");
    await syncPendingSaves();

    expect(insertOne).toHaveBeenCalledTimes(1);
    expect(insertOne.mock.calls[0][0].doc).toEqual({ title: "My Show", refId: "u1" });
  });

  it("uses a bundle the user already has for that page", async () => {
    run.mockImplementation(async ({ name }: any) =>
      name === "getBundleSuggestionForPage"
        ? { matchedBundle: { _id: "b-page", title: "My Show" }, suggestedName: null }
        : { _id: "p" }
    );
    await seed("a");
    await syncPendingSaves();

    expect(insertOne).not.toHaveBeenCalled();
    expect(createCalls()[0].args.bundleIds).toEqual(["b-page"]);
  });

  it("reuses a bundle with the suggested name", async () => {
    findOne.mockResolvedValue({ _id: "b-same-name" });
    await seed("a");
    await syncPendingSaves();

    expect(insertOne).not.toHaveBeenCalled();
    expect(createCalls()[0].args.bundleIds).toEqual(["b-same-name"]);
  });

  it(`falls back to "${FALLBACK_BUNDLE_TITLE}" when there is no suggestion`, async () => {
    run.mockImplementation(async ({ name }: any) => {
      if (name === "getBundleSuggestionForPage") throw new Error("down");
      return { _id: "p" };
    });
    await seed("a");
    await syncPendingSaves();

    expect(insertOne.mock.calls[0][0].doc.title).toBe(FALLBACK_BUNDLE_TITLE);
    expect(await listPendingSaves()).toEqual([]);
  });

  it("keeps a phrase the server did not accept, and sends the rest", async () => {
    run.mockImplementation(async ({ name, args }: any) => {
      if (name === "getBundleSuggestionForPage") return { suggestedName: "My Show" };
      if (args.phrase === "bad") throw new Error("server error");
      return { _id: "p" };
    });
    await seed("bad", "good");
    const result = await syncPendingSaves();

    expect(result).toMatchObject({ sent: 1, failed: 1, left: 1 });
    expect((await listPendingSaves()).map((p) => p.phrase)).toEqual(["bad"]);
  });

  it("stops at the save limit and keeps the rest", async () => {
    run.mockImplementation(async ({ name, args }: any) => {
      if (name === "getBundleSuggestionForPage") return { suggestedName: "My Show" };
      if (args.phrase !== "a") throw LIMIT_ERROR;
      return { _id: "p" };
    });
    await seed("a", "b", "c");
    const result = await syncPendingSaves();

    expect(result).toMatchObject({ sent: 1, failed: 0, left: 2, limitReached: true });
    // It stopped at "b" and did not try "c".
    expect(createCalls().map((c) => c.args.phrase)).toEqual(["a", "b"]);
    expect(track).toHaveBeenCalledWith("pending-saves_synced", {
      sent: 1,
      failed: 0,
      left: 2,
      limit_reached: true,
    });
  });

  it("does nothing when logged out or on the anonymous account", async () => {
    await seed("a");
    auth.user = { id: "anon", type: "anonymous" };
    expect((await syncPendingSaves()).skipped).toBe(true);
    auth.isLogin = false;
    auth.user = null;
    expect((await syncPendingSaves()).skipped).toBe(true);
    expect(run).not.toHaveBeenCalled();
    expect(await listPendingSaves()).toHaveLength(1);
  });

  it("does nothing with an empty list (no event)", async () => {
    expect((await syncPendingSaves()).skipped).toBe(true);
    expect(track).not.toHaveBeenCalledWith("pending-saves_synced", expect.anything());
  });

  it("runs once at a time in a page", async () => {
    await seed("a");
    const [r1, r2] = await Promise.all([syncPendingSaves(), syncPendingSaves()]);
    expect(r1).toBe(r2);
    expect(createCalls()).toHaveLength(1);
  });

  it("waits while another tab holds the lock, and takes over a stale one", async () => {
    await seed("a");
    mem[SYNC_LOCK_KEY] = { owner: "other-tab", until: Date.now() + 60_000 };
    expect((await syncPendingSaves()).skipped).toBe(true);
    expect(createCalls()).toHaveLength(0);

    mem[SYNC_LOCK_KEY] = { owner: "dead-tab", until: Date.now() - 1 };
    expect((await syncPendingSaves()).sent).toBe(1);
  });

  it("stops if the user signs out during the run", async () => {
    run.mockImplementation(async ({ name }: any) => {
      if (name === "createPhrase") auth.user = null;
      return name === "getBundleSuggestionForPage" ? { suggestedName: "My Show" } : { _id: "p" };
    });
    await seed("a", "b");
    const result = await syncPendingSaves();

    expect(result).toMatchObject({ sent: 1, left: 1 });
  });

  it("spots the limit error in the shapes the client sees", () => {
    expect(isSaveLimitError(LIMIT_ERROR)).toBe(true);
    expect(isSaveLimitError(new Error('TIER_LIMIT_REACHED: "save_words"'))).toBe(true);
    expect(isSaveLimitError(new Error("network"))).toBe(false);
  });
});

// Multilingual round 1 (dev): logged out there is no language state, so the
// sync gives each phrase its language with the save window's rule.

function summary(code: string): LanguageSummary {
  return {
    code,
    status: "active",
    startLevel: "A1",
    startLevelSource: "default",
    dueCount: 0,
    phraseCount: 0,
    explanationLanguage: "fa",
    starterPack: { state: "none", heard: 0, total: 0 },
  };
}

const SARA: LanguageState = {
  translationLanguage: "fa",
  learningLanguage: "de",
  languages: [summary("en"), summary("de")],
  onboardingState: "done",
  plan: "learner",
  maxLanguages: 10,
  pending: [],
};

describe("syncPendingSaves with language profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installMemoryChromeStorage();
    auth.isLogin = true;
    auth.user = { id: "u1", type: "user" };
    findOne.mockResolvedValue(null);
    insertOne.mockResolvedValue({ _id: "b-new" });
    run.mockImplementation(async ({ name }: any) =>
      name === "getBundleSuggestionForPage"
        ? { matchedBundle: null, suggestedName: "My Show" }
        : { _id: "p" }
    );
    setActivePinia(createPinia());
    useLanguageStore().setState(SARA);
  });

  async function seedDetected(phrase: string, detected: string | null) {
    await addPendingSave({
      phrase,
      translation: "x",
      translation_language: "fa",
      detected_language: detected,
      sourceUrl: "https://example.com/show/1",
      pageTitle: "My Show",
    });
  }

  it("saves to the detected language when the learner has it, else to the active one", async () => {
    await seedDetected("the house", "en");
    await seedDetected("bonjour", "fr"); // not added: the active language
    await seedDetected("Haus", null); // unknown: the active language
    await syncPendingSaves();

    const langs = Object.fromEntries(
      createCalls().map((c) => [c.args.phrase, c.args.language])
    );
    expect(langs).toEqual({ "the house": "en", bonjour: "de", Haus: "de" });
  });

  it("asks for the bundle and creates it in that language", async () => {
    await seedDetected("the house", "en");
    await syncPendingSaves();

    const suggestion = run.mock.calls
      .map(([c]) => c)
      .find((c) => c.name === "getBundleSuggestionForPage");
    expect(suggestion.args.language).toBe("en");
    expect(insertOne.mock.calls[0][0].doc).toEqual({
      title: "My Show",
      refId: "u1",
      language: "en",
    });
    expect(findOne.mock.calls[0][0].query.language).toEqual({ $in: ["en", null] });
  });

  it("one page saved in two languages gets a bundle per language", async () => {
    await seedDetected("the house", "en");
    await seedDetected("Haus", "de");
    await syncPendingSaves();

    expect(insertOne.mock.calls.map(([a]) => a.doc.language)).toEqual(["en", "de"]);
  });
});
