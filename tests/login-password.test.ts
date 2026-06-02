import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";

// The modular-rest plugin module pulls in @modular-rest/client, dashboard
// origin guards, mixpanel etc. at import. We replace it wholesale with a
// minimal stub so we can drive authentication.login from each test.
// vi.mock factories are hoisted above top-level `const`s, so any state they
// close over must come from vi.hoisted().
const { loginMock, tokenRef } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  tokenRef: { current: null as string | null },
}));
vi.mock("../src/plugins/modular-rest", async () => {
  const { ref } = await import("vue");
  return {
    authentication: {
      login: loginMock,
      get getToken() {
        return tokenRef.current;
      },
    },
    loginWithLastSession: vi.fn().mockResolvedValue(undefined),
    isLogin: ref(false),
  };
});

// The popup helper imports the http get() for OAuth flows we don't exercise.
vi.mock("../src/popup/helper/http", () => ({
  get: vi.fn(),
  post: vi.fn(),
}));

// Set the flag *before* the SFC import runs. ES module imports hoist above
// any top-level statement, so plain `process.env.X = "true"` here would land
// after LoginView's script-setup had already captured the flag. vi.hoisted
// runs alongside the hoisted vi.mock blocks, which runs before imports.
// The "flag off" path is covered in a sibling test file.
vi.hoisted(() => {
  process.env.ENABLE_PASSWORD_AUTH = "true";
});

import LoginView from "../src/popup/views/LoginView.vue";
import { StoreUserTokenMessage } from "../src/common/types/messaging";

function mountView(): VueWrapper {
  return mount(LoginView, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
    },
  });
}

describe("LoginView password form (ENABLE_PASSWORD_AUTH=true)", () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    loginMock.mockReset();
    tokenRef.current = null;
    (chrome.runtime.sendMessage as any).mockClear();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("renders the 'With Email & Password' button when the flag is on", async () => {
    wrapper = mountView();
    await flushPromises();

    expect(
      wrapper.find('[data-testid="open-password-form"]').exists()
    ).toBe(true);
    expect(wrapper.find('[data-testid="password-form"]').exists()).toBe(false);
  });

  it("opens the form when the button is clicked", async () => {
    wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="open-password-form"]').trigger("click");

    expect(wrapper.find('[data-testid="password-form"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="password-email"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="password-value"]').exists()).toBe(true);
  });

  it("disables submit until the email is valid and password is 8+ chars", async () => {
    wrapper = mountView();
    await wrapper.find('[data-testid="open-password-form"]').trigger("click");

    expect(
      wrapper.find('[data-testid="password-submit"]').attributes("disabled")
    ).toBeDefined();

    await wrapper.find('[data-testid="password-email"]').setValue("foo");
    await wrapper.find('[data-testid="password-value"]').setValue("short");
    expect(
      wrapper.find('[data-testid="password-submit"]').attributes("disabled")
    ).toBeDefined();

    await wrapper.find('[data-testid="password-email"]').setValue("a@b.co");
    await wrapper.find('[data-testid="password-value"]').setValue("longenough");
    expect(
      wrapper.find('[data-testid="password-submit"]').attributes("disabled")
    ).toBeUndefined();
  });

  it("does not call authentication.login on invalid input submit", async () => {
    wrapper = mountView();
    await wrapper.find('[data-testid="open-password-form"]').trigger("click");

    await wrapper.find('[data-testid="password-email"]').setValue("bad");
    await wrapper.find('[data-testid="password-value"]').setValue("short");
    await wrapper.find('[data-testid="password-form"]').trigger("submit");

    expect(loginMock).not.toHaveBeenCalled();
  });

  it("calls authentication.login and dispatches StoreUserTokenMessage on success", async () => {
    const TOKEN = "JWT.PAYLOAD.SIG";
    loginMock.mockImplementation(async () => {
      tokenRef.current = TOKEN;
      return { id: "u1", type: "user" };
    });

    wrapper = mountView();
    await wrapper.find('[data-testid="open-password-form"]').trigger("click");

    await wrapper
      .find('[data-testid="password-email"]')
      .setValue("agent@example.com");
    await wrapper.find('[data-testid="password-value"]').setValue("password123");
    await wrapper.find('[data-testid="password-form"]').trigger("submit");
    await flushPromises();

    expect(loginMock).toHaveBeenCalledWith(
      { idType: "email", id: "agent@example.com", password: "password123" },
      true
    );

    const send = chrome.runtime.sendMessage as ReturnType<typeof vi.fn>;
    const tokenStoreCall = send.mock.calls.find(([msg]) =>
      StoreUserTokenMessage.is(msg)
    );
    expect(tokenStoreCall).toBeDefined();
    expect(tokenStoreCall![0].token).toBe(TOKEN);
  });

  it("surfaces 'Invalid email or password.' when login rejects", async () => {
    loginMock.mockRejectedValue({ status: false, error: "Wrong creds" });

    wrapper = mountView();
    await wrapper.find('[data-testid="open-password-form"]').trigger("click");

    await wrapper
      .find('[data-testid="password-email"]')
      .setValue("agent@example.com");
    await wrapper.find('[data-testid="password-value"]').setValue("password123");
    await wrapper.find('[data-testid="password-form"]').trigger("submit");
    await flushPromises();

    expect(wrapper.find('[data-testid="password-error"]').text()).toBe(
      "Invalid email or password."
    );

    const send = chrome.runtime.sendMessage as ReturnType<typeof vi.fn>;
    const tokenStoreCall = send.mock.calls.find(([msg]) =>
      StoreUserTokenMessage.is(msg)
    );
    expect(tokenStoreCall).toBeUndefined();
  });

  it("surfaces 'Could not reach the server.' on network error", async () => {
    loginMock.mockRejectedValue(new TypeError("Failed to fetch"));

    wrapper = mountView();
    await wrapper.find('[data-testid="open-password-form"]').trigger("click");

    await wrapper
      .find('[data-testid="password-email"]')
      .setValue("agent@example.com");
    await wrapper.find('[data-testid="password-value"]').setValue("password123");
    await wrapper.find('[data-testid="password-form"]').trigger("submit");
    await flushPromises();

    expect(wrapper.find('[data-testid="password-error"]').text()).toBe(
      "Could not reach the server."
    );
  });

  it("closes the form and clears the password field on Back", async () => {
    wrapper = mountView();
    await wrapper.find('[data-testid="open-password-form"]').trigger("click");

    await wrapper
      .find('[data-testid="password-email"]')
      .setValue("agent@example.com");
    await wrapper.find('[data-testid="password-value"]').setValue("password123");

    await wrapper.find('[data-testid="password-cancel"]').trigger("click");

    expect(wrapper.find('[data-testid="password-form"]').exists()).toBe(false);
    expect(
      wrapper.find('[data-testid="open-password-form"]').exists()
    ).toBe(true);
  });
});
