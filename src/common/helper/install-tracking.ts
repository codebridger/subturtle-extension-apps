/**
 * Install and update tracking for the background service worker (E-02).
 *
 * mixpanel-browser is not loaded here: it expects `window` and `document`,
 * which a MV3 service worker does not have. So the two events go straight to
 * Mixpanel's /track endpoint with fetch, in the same shape mixpanel-browser
 * sends (base64 JSON in a `data` form field), through the same
 * MIXPANEL_API_HOST proxy, on the install's analytics id. The content scripts
 * use that same id as their anonymous `distinct_id` (plugins/mixpanel.ts), so
 * these events join the rest of the install's events.
 */
import { getInstallId } from "./install-id";
import { log } from "./log";

/** The welcome page opened on first install (landing D-01 reads install_id). */
export const WELCOME_URL = "https://subturtle.app/";

export function welcomeUrl(installId: string): string {
  const params = new URLSearchParams({
    install_id: installId,
    utm_source: "extension",
    utm_medium: "install",
  });
  return `${WELCOME_URL}?${params.toString()}`;
}

const DEFAULT_API_HOST = "https://api-js.mixpanel.com";

function insertId(): string {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** UTF-8 safe base64, the encoding mixpanel-browser 2.45 uses for `data`. */
function base64Json(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

/**
 * Send one event to Mixpanel from a context without mixpanel-browser.
 * Never throws: analytics must not break install handling.
 */
export async function trackFromBackground(
  event: string,
  installId: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  const token = process.env.MIXPANEL_PROJECT_TOKEN;
  if (!token) return;
  const host = (process.env.MIXPANEL_API_HOST || DEFAULT_API_HOST).replace(
    /\/+$/,
    ""
  );
  const manifest = chrome.runtime.getManifest();
  const payload = {
    event,
    properties: {
      token,
      // Same identity the content scripts register for an anonymous install.
      distinct_id: installId,
      $device_id: installId,
      time: Date.now() / 1000,
      $insert_id: insertId(),
      app: "chrome-extension",
      // Shared names (plugins/mixpanel.ts): the type of app and its version.
      app_version: manifest.version_name || manifest.version,
      ...properties,
    },
  };
  try {
    await fetch(`${host}/track/?ip=1`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(base64Json(payload))}`,
    });
  } catch (e) {
    log("background: analytics request failed", e);
  }
}

/**
 * Web Store installs carry `update_url` in the manifest; an unpacked build
 * (local dev, the CI e2e run, a dev zip loaded by hand) does not.
 */
function isStoreInstall(): boolean {
  return "update_url" in chrome.runtime.getManifest();
}

/**
 * chrome.runtime.onInstalled handler: `extension_installed` on a new install
 * (and open the welcome page), `extension_updated` with `previous_app_version` on
 * an update. Other reasons (a Chrome update) are ignored.
 */
export async function handleInstalled(
  details: chrome.runtime.InstalledDetails
): Promise<void> {
  const { reason, previousVersion } = details;
  if (reason !== "install" && reason !== "update") return;

  const installId = await getInstallId();
  if (!installId) return;

  if (reason === "install") {
    // Open the page first: it must not wait on the analytics request.
    // Unpacked builds skip it, so dev reloads and CI runs do not open
    // subturtle.app or count fake installs on the landing page.
    if (isStoreInstall()) {
      try {
        await chrome.tabs.create({ url: welcomeUrl(installId) });
      } catch (e) {
        log("background: failed to open the welcome page", e);
      }
    }
    await trackFromBackground("extension_installed", installId, {
      reason: "install",
    });
  } else {
    await trackFromBackground("extension_updated", installId, {
      reason: "update",
      previous_app_version: previousVersion || null,
    });
  }
}
