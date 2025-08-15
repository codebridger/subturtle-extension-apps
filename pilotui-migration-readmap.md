### PilotUI migration roadmap (extension-apps)

Objective
- Replace PrimeVue usage with the new custom UI library (PilotUI) incrementally, keeping existing custom components intact and retaining PrimeVue during transition. If a 1:1 equivalent is not available, keep the PrimeVue component and list it in the final report.

Scope
- Project: `extension-apps/`
- Keep custom components as-is. Only migrate PrimeVue usages.
- Do not remove PrimeVue for now; both libraries will coexist during migration.

Current PrimeVue usage (discovered)
- Plugin/theme registration
  - `src/plugins/vue-prime/index.ts`
  - `src/plugins/vue-prime/content-script-side.ts`
  - Registered via `installVuePrime(app)` in `src/plugins/install.ts`
- Components imported from `primevue/*`
  - Buttons: `Button`
  - Inputs: `InputText`, `InputGroup`
  - Selectors: `MultiSelect`
  - Layout: `Fieldset`, `Divider`
  - Indicators: `Badge`
  - Misc: `Chip`, `Carousel`
- Files referencing PrimeVue components
  - `src/subtitle/components/specific/TranslatedPhrase.vue` (Button)
  - `src/console-crane/modules/word-detail/index.vue` (Fieldset, Divider, Button, Badge)
  - `src/console-crane/modules/settings/index.vue` (Fieldset)
  - `src/console-crane/index.vue` (Button)
  - `src/console-crane/components/SelectPhraseBundle.vue` (MultiSelect, InputText, InputGroup, Button)
  - `src/console-crane/components/SelectPhraseBundleV2.vue` (MultiSelect, InputText, InputGroup, Button)
  - `src/console-crane/components/SaveWordSection.vue` (Button, InputGroup)
  - `src/console-crane/components/SaveWordSectionV2.vue` (Button, InputGroup, Chip, Fieldset)
  - `src/console-crane/components/Modal.vue` (Button)
  - `src/console-crane/components/FreemiumLimitCounter.vue` (Button)
  - `src/console-crane/components/Definition.vue` (Divider)
  - `src/popup/views/IntroView.vue` (Carousel, Button)
  - `src/common/components/inputs/ThemeSwitcher.vue` (Button)
  - `src/common/components/materials/Tabs.vue` (Button, InputGroup)

Strategy
- Keep PrimeVue installed and registered. Introduce PilotUI alongside it via a dedicated plugin. Migrate component usage incrementally per area. Where PilotUI lacks an equivalent, keep the PrimeVue component and track it in the Unmapped list.
- Prefer an adapter layer to minimize churn: create wrapper components with PrimeVue-compatible props/slots that render PilotUI equivalents internally. This allows drop-in replacements with small import changes.

PilotUI integration plan
1) Add dependency
   - Add PilotUI package (name TBD; e.g. `@pilotui/vue` or similar per docs). Lock versions.
2) Create plugin `src/plugins/pilotui/index.ts`
   - Register PilotUI plugin(s) with the Vue app.
   - Import PilotUI base CSS/theme as required. Ensure CSS load order does not break existing PrimeVue styles; load PilotUI after PrimeVue to prefer PilotUI styles in migrated areas or scope styles appropriately.
3) Adapter components (new)
   - Location: `src/common/components/pilotui/`
   - Adapters to create first: `Button`, `InputText`, `InputGroup`, `MultiSelect`, `Divider`, `Badge`, `Fieldset`, `Chip`, `Carousel`.
   - Each adapter exposes the same minimal API currently used by our code (props/events/slots). Internally render the PilotUI equivalent.
4) Incremental migration by feature
   - Start with low-risk screens, then proceed to more complex flows:
     - `common` small pieces (`ThemeSwitcher.vue`, `materials/Tabs.vue`)
     - `popup/views/IntroView.vue`
     - `console-crane/components/*` (SelectPhraseBundle, SaveWordSection, Modal, Definition, FreemiumLimitCounter)
     - `console-crane/modules/*` (settings, word-detail)
     - `console-crane/index.vue`
     - `subtitle/components/specific/TranslatedPhrase.vue`
   - For each file: replace PrimeVue imports with adapter imports. If an adapter cannot be implemented due to missing PilotUI parity, keep PrimeVue and log it to Unmapped list.
5) Verification
   - Build extension (`yarn build`) and manually verify views in Chromium-based browser with test data.
   - Visual QA for spacing, focus states, disabled states, sizes.
   - Check console for runtime warnings.
6) Cleanup (post-migration, later phase)
   - When Unmapped list is empty and all usages are migrated, remove PrimeVue plugin, CSS and dependency.

To‑Do checklist (living list)
- [x] 0. Create this roadmap document
- [ ] 1. Add PilotUI dependency to `package.json` and install; keep `primevue`
- [ ] 2. Add `src/plugins/pilotui/index.ts` and wire it in `src/plugins/install.ts` (keep PrimeVue call)
- [ ] 3. Create adapter components in `src/common/components/pilotui/*`
- [ ] 4. Migrate small/common files (`ThemeSwitcher.vue`, `materials/Tabs.vue`)
- [ ] 5. Migrate `popup/views/IntroView.vue`
- [ ] 6. Migrate `console-crane/components/*`
- [ ] 7. Migrate `console-crane/modules/*`
- [ ] 8. Migrate `console-crane/index.vue`
- [ ] 9. Migrate `subtitle/components/specific/TranslatedPhrase.vue`
- [ ] 10. Build and manual QA in browser
- [ ] 11. Audit for remaining `primevue/*` imports; update Unmapped list
- [ ] 12. Final report: list kept PrimeVue components without equivalents

Notes & constraints
- Keep all custom components unchanged.
- Do not remove PrimeVue until the end. If a PilotUI equivalent is missing, keep the PrimeVue component and record it.
- Theming: if both libraries include global CSS, ensure predictable specificity and load order; avoid regressions in non-migrated areas.

Unmapped list (to maintain as we progress)
- None yet.

Appendix: files to touch first (low-risk)
- `src/plugins/install.ts` (to register PilotUI plugin)
- `src/plugins/pilotui/index.ts` (new)
- `src/common/components/pilotui/*` (new adapters)
- `src/common/components/inputs/ThemeSwitcher.vue`
- `src/common/components/materials/Tabs.vue`


