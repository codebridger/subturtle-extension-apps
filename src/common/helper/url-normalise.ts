/**
 * Normalise a source page URL so saves from the same content group together.
 * Mirrors the server-side normaliser (server/src/modules/translation/url-normalise.ts):
 * drops query strings, fragments, and timestamps; lowercases the host; removes a
 * trailing slash. Returns the input unchanged when it cannot be parsed.
 */
export function normaliseSourceUrl(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  const trimmed = raw.trim();

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }

  url.hash = "";
  url.search = "";
  url.hostname = url.hostname.toLowerCase();

  let normalised = url.toString();

  if (normalised.endsWith("/") && url.pathname !== "/") {
    normalised = normalised.slice(0, -1);
  }

  return normalised;
}
