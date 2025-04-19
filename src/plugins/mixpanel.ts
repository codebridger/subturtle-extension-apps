import mixpanel, { Config } from "mixpanel-browser";

let config: Partial<Config> = {
  debug: process.env.NODE_ENV != "production",
  // aws proxy link
  api_host: process.env.MIXPANEL_API_HOST || undefined,
  api_method: "POST",
};

mixpanel.init(process.env.MIXPANEL_TRACKING_ID as string, config);
export const analytic = mixpanel;
