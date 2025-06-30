import { authentication } from "@modular-rest/client";

export const VERSION = require("../../../package.json").version;

export const SUBTURTLE_DASHBOARD_URL = process.env.SUBTURTLE_DASHBOARD_URL;

export function getSubturtleDashboardUrlWithToken() {
  const token = authentication.getToken;
  const url = `${process.env.SUBTURTLE_DASHBOARD_URL}/#/auth/login_with_token?token=${token}`;
  console.log("Subturtle dashboard url", url);
  return url;
}

export const DATABASE = {
  USER_CONTENT: "user_content",
};

export const COLLECTIONS = {
  PHRASE: "phrase",
  PHRASE_BUNDLE: "phrase_bundle",
};
