### PilotUI migration roadmap (extension-apps)

Objective
- Migrate PrimeVue usages to PilotUI where PilotUI provides an equivalent. Keep custom components intact. Retain PrimeVue during transition. Only create adapters for components without a PilotUI equivalent.

Scope
- Project: `extension-apps/`
- Keep custom components unchanged.
- Keep PrimeVue for now; both libraries will coexist.

Integration (no coding yet; plan only)
- Package: `@codebridger/lib-vue-components`
- Styles: `@codebridger/lib-vue-components/style.css`
- Vue install: `vueApp.use(vueComponents, { prefix: "CL", dontInstallPinia: true })`
- Plugin file: create a single file `src/plugins/pilotui.ts` (no folder). Wire it from `src/plugins/install.ts` after PrimeVue.
- AppRoot: The library suggests wrapping UI in `App` (aka AppRoot). We will evaluate minimal adoption for extension context; not required to begin replacing leaf components.
- PilotUI docs: `https://codebridger.github.io/lib-vue-components/llm.md`

PrimeVue usage to consider (summary)
- `Button`, `InputText`, `InputGroup`, `MultiSelect`, `Divider`, `Badge`, `Fieldset`, `Chip`, `Carousel`.

Component mapping (based on docs)
- Equivalent in PilotUI (replace directly; no adapters):
  - Button → `elements.ts` Button
  - Badge → `elements.ts` Badge
  - InputText → Forms Input (text field)
  - MultiSelect → Forms Select with multiple (aka Select2 style)
  - Carousel → `components` Carousel

- Must remain (no clear 1:1 in PilotUI; create adapters only if needed):
  - InputGroup (container utility not clearly provided)
  - Divider (not explicitly listed; can fallback to `<hr>` later, but keep for now)
  - Fieldset (closest is Card/Panel; not a strict equivalent)
  - Chip (not explicitly listed; closest might be Tag/Badge variants)

Plan of action (high level)
1) Install PilotUI package and styles. Keep PrimeVue.
2) Add `src/plugins/pilotui.ts` and register it in `src/plugins/install.ts` (after PrimeVue).
3) Replace usages of: Button, Badge, InputText, MultiSelect, Carousel with PilotUI equivalents.
4) For remaining components (InputGroup, Divider, Fieldset, Chip), keep PrimeVue; create minimal adapters only if we need to standardize usage.
5) Build and run manual QA. Audit remaining `primevue/*` imports and update the remain list.

To‑Do checklist (living)
- [x] Create/clean this roadmap
- [ ] Install `@codebridger/lib-vue-components`
- [ ] Add `src/plugins/pilotui.ts` and wire it in `src/plugins/install.ts`
- [ ] Replace Button, Badge, InputText, MultiSelect, Carousel with PilotUI equivalents
- [ ] Keep/InputGroup, Divider, Fieldset, Chip (PrimeVue) or adapters if needed
- [ ] Build + manual QA; update remain list
- [ ] Final report of remaining PrimeVue components

Appendix: files to touch first (low-risk)
- `src/plugins/install.ts` (to register PilotUI plugin)
- `src/plugins/pilotui/index.ts` (new)
- `src/common/components/pilotui/*` (new adapters)
- `src/common/components/inputs/ThemeSwitcher.vue`
- `src/common/components/materials/Tabs.vue`


