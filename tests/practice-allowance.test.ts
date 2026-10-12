import { describe, it, expect } from "vitest";
import {
  computePracticeAllowance,
  defaultPracticeMode,
} from "../src/console-crane/modules/practice-config/allowance";

describe("computePracticeAllowance", () => {
  it("returns null without a subscription payload", () => {
    expect(computePracticeAllowance(null)).toBeNull();
  });

  it("Reader: no voice, capped text", () => {
    const a = computePracticeAllowance({
      voice_minutes_total: 0,
      allowed_text_chats: 20,
      allowed_text_chats_used: 20,
    })!;
    expect(a).toMatchObject({ canVoice: false, canText: false, textChatsLeft: 0 });
    expect(defaultPracticeMode(a)).toBe("text");
  });

  it("prefers the entitlement snapshot over the stored total", () => {
    const a = computePracticeAllowance({
      entitlements: { voiceMinutesGranted: 90 },
      voice_minutes_total: 0,
      voice_minutes_used: 100,
      active_top_ups: [{ minutes_remaining: 15 }],
    })!;
    expect(a.voiceMinutesLeft).toBe(15);
    expect(a.canVoice).toBe(true);
  });

  it("paid without a text cap is unlimited", () => {
    const a = computePracticeAllowance({ allowed_text_chats: null })!;
    expect(a.textChatsLeft).toBeNull();
    expect(a.canText).toBe(true);
  });

  it("free legacy allocation falls back to server defaults", () => {
    const a = computePracticeAllowance({ is_freemium: true })!;
    expect(a.voiceMinutesLeft).toBe(5);
    expect(a.textChatsLeft).toBe(5);
  });

  it("free users are also capped by live-session count", () => {
    const a = computePracticeAllowance({
      is_freemium: true,
      voice_minutes_total: 5,
      allowed_lived_sessions: 2,
      allowed_lived_sessions_used: 2,
    })!;
    expect(a.canVoice).toBe(false);
    expect(defaultPracticeMode(a)).toBe("text");
  });

  it("defaults to text when the allowance is unknown", () => {
    expect(defaultPracticeMode(null)).toBe("text");
  });
});
