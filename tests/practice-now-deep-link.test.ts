import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildPracticeNowPath,
  PRACTICE_NOW_VOICES,
  DEFAULT_PRACTICE_VOICE,
} from "../src/console-crane/modules/practice-config/deep-link";

function decodeSession(path: string) {
  const params = new URLSearchParams(path.split("?")[1]);
  return JSON.parse(atob(params.get("session") as string));
}

// Practice now hands a single-phrase voice session to the unified live-session
// gate as a base64 LiveSessionRequest (phrases source).
describe("buildPracticeNowPath", () => {
  it("targets the unified /practice/live-session gate", () => {
    const path = buildPracticeNowPath({ phraseId: "abc123", voiceName: "Puck" });
    expect(path.startsWith("/practice/live-session?session=")).toBe(true);
  });

  it("encodes a single-phrase source with the chosen voice", () => {
    const req = decodeSession(
      buildPracticeNowPath({ phraseId: "abc123", voiceName: "Puck" })
    );
    expect(req.aiCharacter).toBe("Puck");
    expect(req.source).toEqual({ kind: "phrases", phraseIds: ["abc123"] });
    expect(req.returnTo).toBe("/board");
  });

  it("defaults the voice to Kore when none is chosen", () => {
    const req = decodeSession(buildPracticeNowPath({ phraseId: "x" }));
    expect(req.aiCharacter).toBe("Kore");
  });

  it("ships the eight Gemini voices with Kore as default", () => {
    expect(PRACTICE_NOW_VOICES).toHaveLength(8);
    expect(PRACTICE_NOW_VOICES).toContain("Kore");
    expect(DEFAULT_PRACTICE_VOICE).toBe("Kore");
  });
});

describe("getSubturtleDashboardUrlWithToken redirect handoff", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SUBTURTLE_DASHBOARD_URL = "https://dash.example";
  });

  it("appends an encoded redirect when a path is given", async () => {
    vi.doMock("@modular-rest/client", () => ({
      authentication: { getToken: "TEST_TOKEN" },
    }));
    const { getSubturtleDashboardUrlWithToken } = await import(
      "../src/common/static/global"
    );
    const path = "/practice/live-session?session=eyJhYmMiOjF9";
    const url = getSubturtleDashboardUrlWithToken(path);

    expect(url).toContain("token=TEST_TOKEN");
    expect(url.endsWith("&redirect=" + encodeURIComponent(path))).toBe(true);
  });

  it("omits redirect when no path is given", async () => {
    vi.doMock("@modular-rest/client", () => ({
      authentication: { getToken: "TEST_TOKEN" },
    }));
    const { getSubturtleDashboardUrlWithToken } = await import(
      "../src/common/static/global"
    );
    expect(getSubturtleDashboardUrlWithToken()).not.toContain("redirect=");
  });
});
