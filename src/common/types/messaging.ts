export const MESSAGE_TYPE = {
  GET_LOGIN_STATUS: "GET_LOGIN_STATUS",
  GET_CURRENT_CHROME_USER_TOKEN: "GET_CURRENT_CHROME_USER_TOKEN",
  OPEN_LOGIN_WINDOW: "OPEN_LOGIN_WINDOW",
  STORE_USER_TOKEN: "STORE_USER_TOKEN",
  SYNC_SETTINGS: "SYNC_SETTINGS",
};

export type LoginStatusResponse = {
  status: boolean;
  token?: string;
};

export type SettingsObject = {
  theme: string;
  language: string;
};

export class BaseMessage {
  type!: string;

  static is(message: any) {}
  static checkResponse(response: any) {}
}

export class GetLoginStatusMessage implements BaseMessage {
  type: string;

  constructor() {
    this.type = MESSAGE_TYPE.GET_LOGIN_STATUS;
  }

  static is(message: any): message is GetLoginStatusMessage {
    return message.type === MESSAGE_TYPE.GET_LOGIN_STATUS;
  }

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

export class OpenLoginWindowMessage implements BaseMessage {
  type: string;

  constructor() {
    this.type = MESSAGE_TYPE.OPEN_LOGIN_WINDOW;
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
