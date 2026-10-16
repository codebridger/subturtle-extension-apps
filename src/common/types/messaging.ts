export const MESSAGE_TYPE = {
  GET_LOGIN_STATUS: "GET_LOGIN_STATUS",
  GET_CURRENT_CHROME_USER_TOKEN: "GET_CURRENT_CHROME_USER_TOKEN",
  OPEN_LOGIN_WINDOW: "OPEN_LOGIN_WINDOW",
  STORE_USER_TOKEN: "STORE_USER_TOKEN",
  SYNC_SETTINGS: "SYNC_SETTINGS",
  LANGUAGE_STATE_CHANGED: "LANGUAGE_STATE_CHANGED",
};

export type LoginStatusResponse = {
  status: boolean;
  token?: string;
};

export type SettingsObject = {
  theme: string;
  language: string;
  nibbleDisabledDomains?: string[];
};

export class BaseMessage {
  type!: string;

  static is(message: any) { }
  static checkResponse(response: any) { }
}

export class GetLoginStatusMessage implements BaseMessage {
  type: string;

  constructor() {
    this.type = MESSAGE_TYPE.GET_LOGIN_STATUS;
  }

  static is(message: any): message is GetLoginStatusMessage {
    return message.type === MESSAGE_TYPE.GET_LOGIN_STATUS;
  }

  /**
   * To check if the message has an expected token in response.
   */
  static checkResponse(response: any): response is LoginStatusResponse {
    return response && response.status && response.token;
  }
}

export class GetCurrentChromeUserToken implements BaseMessage {
  type: string;

  constructor() {
    this.type = MESSAGE_TYPE.GET_CURRENT_CHROME_USER_TOKEN;
  }

  static is(message: any): message is GetCurrentChromeUserToken {
    return message.type === MESSAGE_TYPE.GET_CURRENT_CHROME_USER_TOKEN;
  }

  static checkResponse(response: any): response is LoginStatusResponse {
    return response && response.status !== undefined && response.token;
  }
}

export class StoreUserTokenMessage implements BaseMessage {
  type: string;
  token: string | null;

  constructor(token: string | null) {
    this.type = MESSAGE_TYPE.STORE_USER_TOKEN;
    this.token = token;
  }

  static is(message: any): message is StoreUserTokenMessage {
    return message.type === MESSAGE_TYPE.STORE_USER_TOKEN;
  }
}

/**
 * Where a login started (E-03). The background puts it on the login window's
 * URL (`popup.html#/login?source=…`) so LoginView can send it with
 * `user_logged-in` and `login_failed`. A login opened from the toolbar popup
 * itself has no source on the URL and counts as "popup".
 */
export type LoginSource = "save_prompt" | "practice" | "popup";

export class OpenLoginWindowMessage implements BaseMessage {
  type: string;
  source?: LoginSource;

  constructor(source?: LoginSource) {
    this.type = MESSAGE_TYPE.OPEN_LOGIN_WINDOW;
    if (source) this.source = source;
  }

  static is(message: any): message is OpenLoginWindowMessage {
    return message.type === MESSAGE_TYPE.OPEN_LOGIN_WINDOW;
  }
}

export class SettingsSyncMessage {
  type: string;
  settings?: SettingsObject;

  constructor(settings?: SettingsObject) {
    this.type = MESSAGE_TYPE.SYNC_SETTINGS;
    if (settings) this.settings = settings;
  }

  static is(message: any): message is SettingsSyncMessage {
    return message.type === MESSAGE_TYPE.SYNC_SETTINGS;
  }
}

/**
 * The popup switched the active language (E-03). Sent to every open tab so each
 * content script's profile store takes the new state without a page reload;
 * the next save and translation in that tab follow the new language.
 */
export class LanguageStateChangedMessage {
  type: string;
  // The server's LanguageState (common/language/types.ts), as plain JSON.
  state: any;

  constructor(state: any) {
    this.type = MESSAGE_TYPE.LANGUAGE_STATE_CHANGED;
    this.state = state;
  }

  static is(message: any): message is LanguageStateChangedMessage {
    return message?.type === MESSAGE_TYPE.LANGUAGE_STATE_CHANGED;
  }
}
