import { authentication } from "@modular-rest/client";

export const VERSION = require("../../../package.json").version;

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
