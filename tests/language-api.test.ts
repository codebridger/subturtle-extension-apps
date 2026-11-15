import { describe, it, expect, vi, beforeEach } from "vitest";

// The server's `user_access` functions read the account from args.userId and answer
// "User ID is required" without it, so every call that acts on the learner must send it.
const run = vi.fn();
const auth = { user: { id: "u1", type: "user" } as { id: string; type: string } | null };

vi.mock("@modular-rest/client", () => ({
  functionProvider: { run: (...a: unknown[]) => run(...a) },
  authentication: {
    get user() {
      return auth.user;
    },
  },
}));

import { fetchLanguageCapabilities, fetchLanguageState, keepPhrasePending, setActiveLanguage } from "../src/common/language/api";

const STATE = { translationLanguage: "fa", learningLanguage: "de", languages: [], onboardingState: "done", plan: "learner", maxLanguages: 10, pending: [] };

describe("language API client", () => {
  beforeEach(() => {
    run.mockReset();
    auth.user = { id: "u1", type: "user" };
  });

  it("get-language-state sends the signed-in user's id", async () => {
    run.mockResolvedValue(STATE);
    await expect(fetchLanguageState()).resolves.toEqual(STATE);
    expect(run).toHaveBeenCalledWith({ name: "get-language-state", args: { userId: "u1" } });
  });

  it("set-active-language and keep-phrase-pending send the user's id", async () => {
    run.mockResolvedValueOnce({ state: STATE });
    await setActiveLanguage("de");
    expect(run).toHaveBeenLastCalledWith({ name: "set-active-language", args: { userId: "u1", language: "de" } });

    run.mockResolvedValueOnce({ phraseId: "p1", expiresAt: "2026-11-15" });
    await keepPhrasePending({ phrase: "Hallo" }, "de");
    expect(run).toHaveBeenLastCalledWith({ name: "keep-phrase-pending", args: { userId: "u1", phrase: { phrase: "Hallo" }, language: "de" } });
  });

  it("get-language-capabilities stays anonymous", async () => {
    run.mockResolvedValue({ learning: [], own: [] });
    await fetchLanguageCapabilities();
    expect(run).toHaveBeenCalledWith({ name: "get-language-capabilities", args: {} });
  });

  it("sends no userId while nobody is signed in (the server then refuses, and the reader answers null)", async () => {
    auth.user = null;
    run.mockRejectedValue(new Error("User ID is required"));
    await expect(fetchLanguageState()).resolves.toBeNull();
    expect(run).toHaveBeenCalledWith({ name: "get-language-state", args: {} });
  });
});
