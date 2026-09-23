import { authentication } from "@modular-rest/client";

export const VERSION = require("../../../package.json").version;

/**
 * Installed-extension version for display. Prefers manifest `version_name`
 * (carries the full semver incl. prerelease channel, e.g. "1.15.1-dev.1") and
 * falls back to the numeric manifest `version` on stable builds. Outside an
 * extension context (unit tests / non-chrome), falls back to the package.json
 * VERSION constant — the Vitest chrome shim doesn't implement getManifest.
 */
export function getExtensionVersion(): string {
  try {
    const manifest = chrome.runtime.getManifest();
    return manifest.version_name || manifest.version;
  } catch {
    return VERSION;
  }
}

export const SUBTURTLE_DASHBOARD_URL = process.env.SUBTURTLE_DASHBOARD_URL;

export function getSubturtleDashboardUrlWithToken(redirectPath?: string) {
  const token = authentication.getToken;
  let url = `${process.env.SUBTURTLE_DASHBOARD_URL}/#/auth/login_with_token?token=${token}`;
  // The dashboard's login_with_token page reads `redirect`, validates same-origin,
  // and pushes it after auth — so a deep-link survives the token handoff.
  if (redirectPath) {
    url += `&redirect=${encodeURIComponent(redirectPath)}`;
  }
  return url;
}

export const DATABASE = {
  USER_CONTENT: "user_content",
};

export const COLLECTIONS = {
  PHRASE: "phrase",
  PHRASE_BUNDLE: "phrase_bundle",
};
