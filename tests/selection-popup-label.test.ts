import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";

// save-first E-01: the selection popup button says "Learn more or Save", and
// "Learn" when the phrase is already saved, on the account or on this browser.

vi.mock("@modular-rest/client", () => ({
  functionProvider: { run: vi.fn() },
  authentication: { user: null },
}));
vi.mock("../src/common/services/phrase.service", () => ({
  findSavedPhrase: vi.fn(),
}));
vi.mock("../src/common/services/translate.service", () => ({
  MissingTargetLanguageError: class extends Error {},
  TranslateService: {
    instance: { fetchSimpleTranslation: vi.fn(async () => "سلام") },
  },
}));

import { installMemoryChromeStorage } from "./memory-chrome-storage";
import SelectionPopup from "../src/nibble/components/SelectionPopup.vue";
import { findSavedPhrase } from "../src/common/services/phrase.service";
import { TranslateService } from "../src/common/services/translate.service";
import { addPendingSave } from "../src/common/services/pending-saves";

async function openCard() {
  const w = mount(SelectionPopup, {
    attachTo: document.body,
    props: {
      text: "hello",
      context: "hello there",
      rect: new DOMRect(100, 100, 50, 20),
    },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
  });
  await w.find(".nibble-icon-btn").trigger("click");
  await flushPromises();
  return w;
}

describe("SelectionPopup save button label", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installMemoryChromeStorage();
    vi.mocked(findSavedPhrase).mockResolvedValue(null);
  });

  it('says "Learn more or Save" for a new phrase', async () => {
    const w = await openCard();
    expect(w.find(".nibble-save-btn").text()).toBe("Learn more or Save");
    w.unmount();
  });

  it('says "Learn" when the phrase is saved on the account', async () => {
    vi.mocked(findSavedPhrase).mockResolvedValue({
      phrase: "hello",
      translation: "درود",
    } as any);
    const w = await openCard();
    expect(w.find(".nibble-save-btn").text()).toBe("Learn");
    w.unmount();
  });

  it('says "Learn" and reuses the translation when saved on this browser', async () => {
    await addPendingSave({
      phrase: "hello",
      translation: "درود",
      translation_language: "fa",
    });
    const w = await openCard();
    expect(w.find(".nibble-save-btn").text()).toBe("Learn");
    expect(w.find(".nibble-translation").text()).toBe("درود");
    expect(TranslateService.instance.fetchSimpleTranslation).not.toHaveBeenCalled();
    w.unmount();
  });
});
