import { authentication, functionProvider } from "@modular-rest/client";
import { normaliseSourceUrl } from "../helper/url-normalise";
import type { BundleSuggestion } from "../../console-crane/modules/word-detail/types";

/**
 * Per-page bundle suggestion: which bundle the save modal should default to for
 * the current page + logged-in user. Called once per page (first word-detail
 * open) and cached client-side by normalised URL so repeated word lookups on
 * the same page reuse the result.
 */
export class BundleSuggestionService {
  static instance = new BundleSuggestionService();

  // Cache of in-flight / resolved suggestions keyed by normalised URL.
  private cache = new Map<string, Promise<BundleSuggestion>>();

  /** Clear the cache (e.g. after a save creates a new bundle for this page). */
  clear(url?: string) {
    if (url) this.cache.delete(normaliseSourceUrl(url));
    else this.cache.clear();
  }

  async getForCurrentPage(): Promise<BundleSuggestion> {
    const empty: BundleSuggestion = { matchedBundle: null, suggestedName: null };

    // Logged-in only; anonymous users get nothing to suggest.
    if (!authentication.user?.id) return empty;
    if (typeof location === "undefined") return empty;

    const key = normaliseSourceUrl(location.href);
    if (!key) return empty;

    const cached = this.cache.get(key);
    if (cached) return cached;

    const pageTitle = typeof document !== "undefined" ? document.title : "";
    const request = functionProvider
      .run<BundleSuggestion>({
        name: "getBundleSuggestionForPage",
        args: {
          refId: authentication.user?.id,
          pageTitle,
          pageUrl: location.href,
        },
      })
      .catch((error) => {
        // Best-effort; never block the save flow.
        console.error("Bundle suggestion error:", error);
        this.cache.delete(key);
        return empty;
      });

    this.cache.set(key, request);
    return request;
  }
}
