import { functionProvider } from "@modular-rest/client";

/**
 * AI-coach voice as returned by the server's `get-live-session-voices`
 * function. Kept structurally in sync with the dashboard's `CoachVoice`
 * (server: live_session/voices.ts) — the two repos build separately so the
 * shape is mirrored, not imported.
 */
export interface CoachVoice {
  name: string;
  label: string;
  description?: string;
  gender?: "female" | "male";
  avatarColor?: string;
  avatarUrl?: string | null;
}

/**
 * Cached fetch of the coach voices. Singleton so every Practice now mount
 * shares one network call (mirrors BundleSuggestionService / TranslateService).
 *
 * No offline fallback: if the server can't return voices, the dashboard live
 * session can't run anyway, so an empty list is the honest result.
 */
export class LiveVoicesService {
  private static _instance: LiveVoicesService | null = null;

  static get instance(): LiveVoicesService {
    if (!this._instance) this._instance = new LiveVoicesService();
    return this._instance;
  }

  private cache: CoachVoice[] | null = null;
  private inflight: Promise<CoachVoice[]> | null = null;

  async getVoices(): Promise<CoachVoice[]> {
    if (this.cache) return this.cache;
    if (this.inflight) return this.inflight;

    this.inflight = functionProvider
      .run<CoachVoice[]>({ name: "get-live-session-voices", args: {} })
      .then((res) => {
        this.cache = res || [];
        return this.cache;
      })
      // Don't cache failures, so a transient error retries on the next open.
      .catch(() => [] as CoachVoice[])
      .finally(() => {
        this.inflight = null;
      });

    return this.inflight;
  }
}
