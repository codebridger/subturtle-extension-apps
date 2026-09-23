import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";

// "With Current Chrome User" signs in with the Google access token that
// chrome.identity.getAuthToken hands the background script. It shipped calling
// /auth/google/token-login, a route the server has never had, and it read the
// token off the ref instead of its value, so checkResponse() was always false and
// the button never sent a request. These tests pin the working path.
//
// vi.mock factories are hoisted above top-level `const`s, so any state they
// close over must come from vi.hoisted().
const { getMock, sendMessageMock, chromeUser } = vi.hoisted(() => ({
  getMock: vi.fn(),
  sendMessageMock: vi.fn(),
  chromeUser: { response: null as { status: string; token: string } | null },
}));

vi.mock("../src/plugins/modular-rest", async () => {
  const { ref } = await import("vue");
  return {
    authentication: { login: vi.fn(), getToken: null },
    loginWithLastSession: vi.fn().mockResolvedValue(undefined),
    isLogin: ref(false),
  };
});

vi.mock("../src/popup/helper/http", () => ({ get: getMock, post: vi.fn() }));

vi.mock("../src/plugins/mixpanel", () => ({ analytic: { track: vi.fn() } }));

// The background script answers GetCurrentChromeUserToken with the Chrome
// profile's access token; every other message (StoreUserTokenMessage) just acks.
vi.mock("../src/common/helper/massage", async () => {
  const { GetCurrentChromeUserToken } = await import("../src/common/types/messaging");
  sendMessageMock.mockImplementation(async (message: any) =>
    GetCurrentChromeUserToken.is(message) ? chromeUser.response : {}
  );
  return { sendMessage: sendMessageMock, sendMessageToTabs: vi.fn() };
});

import LoginView from "../src/popup/views/LoginView.vue";
import { StoreUserTokenMessage } from "../src/common/types/messaging";

function mountView(): VueWrapper {
  return mount(LoginView, {
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
  });
}

describe('LoginView "With Current Chrome User"', () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    getMock.mockReset();
    sendMessageMock.mockClear();
    chromeUser.response = { status: "success", token: "ya29.chrome/user+token" };
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("signs in through /auth/google/access-token-login with the Chrome token", async () => {
    getMock.mockResolvedValue({ status: "success", token: "subturtle-jwt" });
    wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="login-with-chrome"]').trigger("click");
    await flushPromises();

    expect(getMock).toHaveBeenCalledTimes(1);
    const url = getMock.mock.calls[0][0] as string;
    expect(url).toContain("/auth/google/access-token-login?access_token=");
    expect(url).toContain(encodeURIComponent("ya29.chrome/user+token"));
    expect(url).not.toContain("/auth/google/token-login");

    const stored = sendMessageMock.mock.calls
      .map(([message]) => message)
      .find((message) => message instanceof StoreUserTokenMessage);
    expect(stored?.token).toBe("subturtle-jwt");
  });

  it("stores nothing when the server rejects the token", async () => {
    getMock.mockRejectedValue(new Error("HTTP error! status: 401"));
    wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="login-with-chrome"]').trigger("click");
    await flushPromises();

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(
      sendMessageMock.mock.calls.some(([message]) => message instanceof StoreUserTokenMessage)
    ).toBe(false);
  });

  it("stays disabled when Chrome has no signed-in user", async () => {
    chromeUser.response = null;
    wrapper = mountView();
    await flushPromises();

    const button = wrapper.find('[data-testid="login-with-chrome"]');
    expect(button.attributes("disabled")).toBeDefined();
    await button.trigger("click");
    expect(getMock).not.toHaveBeenCalled();
  });
});
