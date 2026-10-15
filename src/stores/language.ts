import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  fetchLanguageCapabilities,
  fetchLanguageState,
} from "../common/language/api";
import { isMultilingualState } from "../common/language/state";
import type {
  LanguageCapabilities,
  LanguageState,
} from "../common/language/types";
import { registerLanguageAnalytics } from "../plugins/mixpanel";
import { log } from "../common/helper/log";

/**
 * The learner's languages (multilingual round 1, E-01): languages, active
 * language, start levels and own language, from the server profile.
 *
 * Its own store, not part of the profile store, on purpose: the profile store
 * imports types from the sibling dashboard repo, and the translate service and
 * the save window must not pull that import chain in (it breaks the unit
 * tests in CI, where the dashboard is a bare clone).
 *
 * `state` stays null until the server answers `get-language-state`, and on a
 * server without the function. Null means today's English-only behaviour (E-12).
 */
export const useLanguageStore = defineStore("language", () => {
  const state = ref<LanguageState | null>(null);
  const caps = ref<LanguageCapabilities | null>(null);
  const isMultilingual = computed(() => isMultilingualState(state.value));

  function setState(next: LanguageState | null) {
    state.value = next;
    if (next) registerLanguageAnalytics(next);
  }

  function setCaps(next: LanguageCapabilities | null) {
    caps.value = next;
  }

  /** Read state and register. Never rejects: a missing function is "not yet". */
  async function fetchLanguages() {
    const [nextState, nextCaps] = await Promise.all([
      fetchLanguageState(),
      caps.value ? Promise.resolve(caps.value) : fetchLanguageCapabilities(),
    ]);
    caps.value = nextCaps;
    setState(nextState);
    log("fetchLanguages, state", JSON.stringify(nextState));
    return nextState;
  }

  /** The public register only (signed-out popup). */
  async function fetchCaps() {
    if (!caps.value) caps.value = await fetchLanguageCapabilities();
    return caps.value;
  }

  function clear() {
    state.value = null;
  }

  return {
    state,
    caps,
    isMultilingual,
    setState,
    setCaps,
    fetchLanguages,
    fetchCaps,
    clear,
  };
});
