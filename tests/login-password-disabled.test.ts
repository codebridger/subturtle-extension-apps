import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";

// process.env.ENABLE_PASSWORD_AUTH is read at script-setup module load. We
// intentionally leave it undefined here so the const inside LoginView resolves
// to false. The "flag on" cases live in tests/login-password.test.ts.
delete process.env.ENABLE_PASSWORD_AUTH;

vi.mock("../src/plugins/modular-rest", async () => {
  const { ref } = await import("vue");
  return {
    authentication: {
      login: vi.fn(),
      get getToken() {
        return null;
      },
    },
    loginWithLastSession: vi.fn().mockResolvedValue(undefined),
    isLogin: ref(false),
  };
});

vi.mock("../src/popup/helper/http", () => ({
  get: vi.fn(),
  post: vi.fn(),
}));

import LoginView from "../src/popup/views/LoginView.vue";

describe("LoginView password form (ENABLE_PASSWORD_AUTH unset)", () => {
  it("hides the password form button when the flag is off", async () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
      },
    });
    await flushPromises();

    expect(
      wrapper.find('[data-testid="open-password-form"]').exists()
    ).toBe(false);
    expect(wrapper.find('[data-testid="password-form"]').exists()).toBe(false);

    wrapper.unmount();
  });
});
