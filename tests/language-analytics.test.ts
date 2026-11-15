import { describe, it, expect, beforeEach } from "vitest";
import mixpanel from "mixpanel-browser";
import {
  registerLanguageAnalytics,
  registerSettingsAnalytics,
} from "../src/plugins/mixpanel";

/**
 * E-13: the learning language next to target_language, and target_language
 * from the server profile (643 of 802 users had none from the local guess).
 * Runs first-to-last in one module: the "server named it" flag is module state.
 */
describe("language analytics (E-13)", () => {
  const register = mixpanel.register as unknown as ReturnType<typeof import("vitest").vi.fn>;

  beforeEach(() => register.mockClear());

  it("before the server names the own language, the local value is sent", () => {
    registerSettingsAnalytics({ target_language: "fa", theme: "dark" });
    expect(register).toHaveBeenCalledWith({ target_language: "fa", theme: "dark" });
  });

  it("registers the learning language and the server's own language", () => {
    registerLanguageAnalytics({ learningLanguage: "de", translationLanguage: "fa" });
    expect(register).toHaveBeenCalledWith({ learning_language: "de", target_language: "fa" });
  });

  it("after that, the local value no longer overwrites target_language", () => {
    registerSettingsAnalytics({ target_language: "ar", theme: "light" });
    expect(register).toHaveBeenCalledWith({ theme: "light" });
  });

  it("sends nothing when the state has no languages", () => {
    registerLanguageAnalytics({ learningLanguage: null, translationLanguage: null });
    expect(register).not.toHaveBeenCalled();
  });
});
