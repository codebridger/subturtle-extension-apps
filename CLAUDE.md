# Subturtle Extension — Working Notes

Operating manual for working inside this repo. For product overview / supported sites / architecture diagram, see [README.md](./README.md). For subtitle-surface internals (YouTube/Netflix), see [src/subtitle/README.md](./src/subtitle/README.md).

## Quick start

```bash
yarn install
yarn dev          # webpack --watch, writes dist/
yarn build        # NODE_ENV=production webpack --mode=production

yarn test         # Vitest one-shot (unit + component)
yarn test:watch   # Vitest watch mode
yarn test:e2e     # Playwright E2E against the loaded extension (requires dist/)
yarn typecheck    # tsc --noEmit via the upstream-error filter
```

Load `dist/` as an unpacked extension at `chrome://extensions`. There is no separate dev server — the bundler writes straight to `dist/`, and Chrome reloads when you click the reload button on the extension card.

## Sibling repositories

This extension does not stand alone — it depends on two other `codebridger` repos. They are normally checked out **next to** this repo (`../`), and devs work on all of them side-by-side from the `subturtle-all-apps.code-workspace`.

| Sibling | Repo | Consumed here as | Local checkout |
| --- | --- | --- | --- |
| Server / Dashboard | [`codebridger/subturtle-dashboard-app`](https://github.com/codebridger/subturtle-dashboard-app) | TS types imported by [src/stores/profile.ts](src/stores/profile.ts) via `../../../dashboard-app/frontend/types/database.type`; also the live dev API/auth server at `https://dev.dashboard.subturtle.app/`. | `../dashboard-app` — the import path resolves to a dir of that exact name next to this repo's root. CI clones it there (see [release.yml](.github/workflows/release.yml)). |
| pilotUI | [`codebridger/pilotui`](https://github.com/codebridger/pilotui) | npm dependency `pilotui@^1.29.0` — the Tailwind/Vue component library the whole UI builds on. | `node_modules/pilotui` (a published, built artifact — **not** the source repo). Clone the repo separately to edit the source. |

### Working across siblings (download / search / branch)

When a change on this repo's branch needs a matching change in a sibling — a new field on a `dashboard-app` type, a fix in a `pilotui` component — you can pull the sibling in and work on it. **Do this on a feature branch in the sibling; never commit to the sibling's `main` just to make this repo's branch pass.** The goal is to verify this repo's branch against the modified sibling while keeping the sibling's `main` clean.

1. **Search locally first.** The sibling is often already on disk next to this repo. Confirm before cloning:
   ```bash
   git -C ../dashboard-app remote -v      # expect codebridger/subturtle-dashboard-app
   ls node_modules/pilotui                # the built pilotui (read-only artifact)
   ```
   `dashboard-app` may also be checked out under its full name `../subturtle-dashboard-app`; the import path needs a dir literally named `dashboard-app`, so symlink or clone into that name.
2. **Download it if missing.**
   ```bash
   git clone https://github.com/codebridger/subturtle-dashboard-app.git ../dashboard-app
   git clone https://github.com/codebridger/pilotui.git ../pilotui
   ```
3. **Branch the sibling, then change it.**
   ```bash
   git -C ../dashboard-app checkout -b <feature-branch>   # e.g. feat/new-bundle-field
   # …edit types/components in the sibling…
   ```
   This keeps the sibling's `main` untouched while this repo's branch is tested against the patched code.
4. **Point this repo at the local pilotui to test a patch** (the dashboard types are already read straight off `../dashboard-app`):
   ```bash
   (cd ../pilotui && yarn link) && yarn link pilotui    # use local pilotui source
   # …verify…
   yarn unlink pilotui && yarn install --force          # revert before committing
   ```
   Never leave a `yarn link` / `file:` override in `package.json` when you commit — CI installs `pilotui@^1.29.0` from the registry.

Same confirm-before-acting rule as always: never push a sibling branch or open a PR against a sibling without explicit per-action user confirmation.

## Bundles (+ popup, background)

| Bundle | Entry | Runs on | Purpose |
| --- | --- | --- | --- |
| `main.js` | [src/main.ts](src/main.ts) | YouTube `/watch`, Netflix | Subtitle phrase collector — wraps caption words in `<Word>` spans, hover/anchor selection. |
| `nibble.js` | [src/nibble.ts](src/nibble.ts) | `<all_urls>` | Web text phrase collector — native `Selection` → floating Subturtle icon → translation card. **Does not mutate page DOM.** |
| `console-crane.js` | [src/console-crane.ts](src/console-crane.ts) | `<all_urls>` | The modal app (word-detail, settings, save flow). Owns its own Vue app + Pinia store + router. Feature bundles drive it via the [bridge](src/common/services/console-crane-bridge.ts). |
| `popup.js` | [src/popup.ts](src/popup.ts) | Toolbar popup | Ad-hoc text translation (input + detailed result), settings, language, dashboard link, per-site Nibble toggle. Reuses console-crane's `WordDetailModule` for the result panel — see [Shared APIs § WordDetailModule](#worddetailmodule-detailed-translation-panel) for the cross-bundle reuse rules. |
| `background.js` | [src/background.ts](src/background.ts) | Service worker | OAuth, token storage, settings persistence to `chrome.storage.local`, broadcast `SYNC_SETTINGS` to tabs. |

Manifest content_scripts split is in [static/manifest.json](static/manifest.json). On a YouTube `/watch` page all three content scripts run side-by-side in the same isolated world — `main.js`, `nibble.js`, and `console-crane.js` — so they coordinate through shared `chrome.storage` (settings) and `window` CustomEvents (the ConsoleCrane bridge).

**ConsoleCrane is its own content script, not a component embedded in feature bundles.** There is exactly one ConsoleCrane instance per page regardless of which feature bundles are loaded. Feature bundles never `import` the ConsoleCrane component or its store directly; they call `emitOpen()` from [src/common/services/console-crane-bridge.ts](src/common/services/console-crane-bridge.ts) and listen to `onState()` for "is the modal open right now". See [Shared APIs § ConsoleCrane bridge](#consolecrane-bridge) below.

## Style isolation: the two non-negotiable rules

### 1. Every Vue mount root must carry `.subturtle-scope`

`postcss.config.js` runs [`postcss-prefix-selector`](postcss.config.js) which rewrites every Tailwind / pilotui / SFC selector to `.subturtle-scope <selector>`. Without that class on a root element, **none of our CSS applies** — the app renders unstyled.

Bootstraps that already get this right:
- [src/subtitle/web_youtube/initializer.ts](src/subtitle/web_youtube/initializer.ts) — appends `<div id="subturtle-app" class="subturtle-scope">`
- [src/subtitle/web_netflix/initializer.ts](src/subtitle/web_netflix/initializer.ts) — same pattern
- [src/nibble/initializer.ts](src/nibble/initializer.ts) — `<div id="subturtle-nibble-root" class="subturtle-scope">`
- [src/console-crane/initializer.ts](src/console-crane/initializer.ts) — `<div id="subturtle-console-crane-root" class="subturtle-scope">`

When adding a new mount point, copy this pattern. The class also drives dark mode — see `applyThemeToDOM` in [src/common/store/settings.ts](src/common/store/settings.ts).

### 2. Tailwind `rem` is rewritten to `px` at build time

`rem` is always relative to the host page's `<html>` `font-size`. WordPress / news templates routinely set this to 18-24px, which scaled the entire ConsoleCrane up. The `remToPxPlugin` at the bottom of [postcss.config.js](postcss.config.js) rewrites every `rem` in the output CSS to `px` against a fixed 14px base.

Implications:
- `text-xl` is always 17.5px regardless of host page.
- Don't write hand-rolled `rem` in scoped Vue styles — it'll go through the rewrite, but you'll get more predictable output writing `px` directly.
- If the UI feels off-scale, change `REM_BASE_PX` in [postcss.config.js](postcss.config.js); don't fight it from individual components.

## Bundle conventions

- **No code-splitting in entry bundles.** The popup router uses static imports ([src/popup/router.ts](src/popup/router.ts)) — lazy `() => import(...)` produces named chunks that don't resolve at runtime under the extension's URL scheme. If you add views/routes, import them statically.
- **Asset URLs need `web_accessible_resources`.** `chrome.runtime.getURL("/assets/foo.png")` returns `chrome-extension://invalid/` for paths not declared accessible. The manifest already exposes `assets/*` to all URLs.
- Webpack entry points live in [webpack.config.js](webpack.config.js) — add a new entry there for any new content script.

## Code comments

Multi-line comments and docstrings are fine — encouraged, even, where the *why* is non-obvious (ESM init-order traps, cross-bundle behaviour, browser/extension quirks). Match the surrounding style (`navigation.ts`, `modular-rest.ts`, the `word-detail` JSDoc). There is **no** "one short line max" rule; don't collapse an explanatory block to a single line just to be terse.

## Shared APIs

### ConsoleCrane bridge

From any feature bundle (subtitle, nibble), open the modal by emitting a CustomEvent on `window`:

```ts
import { emitOpen } from "@/common/services/console-crane-bridge";
emitOpen({
  page: "word-detail",                      // "empty" | "word-detail" | "settings"
  params: { word: phrase, context: paragraphText },
  active: true,                              // pass true to force-open (omit to toggle)
});
```

The console-crane content script listens (`onOpen` in [src/console-crane.ts](src/console-crane.ts)) and calls `store.toggleConsoleCrane(...)` against its own Pinia store. Two complementary channels exist for state flowing the other way:

- `onState((s) => ...)` — fires whenever `isActive` changes. Used by Nibble's [SelectionPopup](src/nibble/components/NibbleSurface.vue) to hide itself while the modal is open.
- `requestState()` — feature bundle asks console-crane to re-emit its current state. A freshly mounted listener calls this to sync up rather than waiting for the next change.

**Inside the console-crane bundle itself**, code can keep using `useConsoleCraneStore()` directly — it's the same Vue app. Bridge events are only the cross-bundle path.

Params are encoded into the route via `encodeRouteParams` from [src/console-crane/route-params.ts](src/console-crane/route-params.ts) — Unicode-safe (uses TextEncoder). Decode with `decodeRouteParams`. **Never use `window.btoa(JSON.stringify(...))` directly** — it throws `InvalidCharacterError` on non-Latin1 input (Persian, CJK, emoji, accented Latin).

These helpers live in their own module (separate from the store) so consumers can import them without dragging in the console-crane router. Importing them from the store would close a circular ESM init when the importer isn't `console-crane.ts` itself (popup → WordDetailModule → store → router → WordDetailModule). Keep them in `route-params.ts`.

### Translation

```ts
import { TranslateService } from "@/common/services/translate.service";
const text = await TranslateService.instance.fetchSimpleTranslation(phrase, contextString);
```

24-hour in-memory cache keyed on `(translationType, targetLanguage, phrase, context)`. `fetchDetailedTranslation` for the rich `LanguageLearningData` shape used by ConsoleCrane.

### WordDetailModule (detailed translation panel)

[src/console-crane/modules/word-detail/index.vue](src/console-crane/modules/word-detail/index.vue) is the rich result panel — definition, phonetic, examples, related expressions, plus the bundle save UI from [SaveWordSectionV2](src/console-crane/components/SaveWordSectionV2.vue). It runs its own `fetchDetailedTranslation` call internally, so the caller just supplies inputs.

It supports two mounting modes:

- **Route-driven** (console-crane): mounted by the console-crane router; reads `{ word, context }` from the base64-encoded `:data` route param. This is what `emitOpen({ page: "word-detail", params })` ultimately drives.
- **Prop-driven** (popup, anywhere outside the console-crane router): pass `:word` and optional `:context` directly. When `word` is present it's preferred over the route param.

Also emits `loading: boolean` mirroring its internal pending state — bind it on the parent (e.g. the popup's [TranslateCard](src/popup/components/TranslateCard.vue)) to reflect a button spinner.

**Cross-bundle reuse caveat.** The "feature bundles never import the ConsoleCrane component or its store" rule is about the modal wrapper and `useConsoleCraneStore` — they're for opening the modal on a page that already has the ConsoleCrane content script. Reusing presentational sub-modules like `WordDetailModule` (and the things it transitively pulls in: `SaveWordSectionV2`, `SelectPhraseBundleV2`, `FreemiumLimitCounter`) **is fine** as long as:

1. You're in a bundle that does NOT also load `console-crane.js` (today: only the popup qualifies — it's its own Chrome extension page, not a content script).
2. You drive the module via props, not by trying to inject route params it doesn't have.
3. The host app installs Pinia + the modular-rest auth plugin before mount (`addPlugins(app)` from [src/plugins/install.ts](src/plugins/install.ts)).

If you ever need this from a content-script bundle that runs alongside ConsoleCrane, use the [bridge](#consolecrane-bridge) instead — don't double-mount the same component on the same page.

**The popup hosts the console pages in its own router — no modal.** `WordDetailModule`'s "Practice with AI" / "Preview flashcard" buttons open the `practice-config` / `flashcard-preview` console pages. On the popup page there's no `console-crane.js` content script and so no modal to render into. Instead the popup registers those console modules as routes in [its own router](src/popup/router.ts) (each wrapped in a back-header [ConsolePageScaffold](src/popup/components/ConsolePageScaffold.vue) under [src/popup/views/](src/popup/views/)), and [src/popup/App.vue](src/popup/App.vue) `provide()`s an `openConsolePage(page, params)` navigator that `router.push`es that route (params Unicode-safely encoded via `encodeRouteParams`). `WordDetailModule` `inject`s it, so the actions render as full popup pages with a working Back. In the console-crane content script there's no provider, so the same module falls back to the store-driven modal (unchanged). Home is `<keep-alive>`d (`include="HomeView"`) so Back returns to the existing translation rather than a blank input. The console modules (`practice-config`, `flashcard-preview`) are router-agnostic — they read only `route.params.data` — so they work in either router unchanged. Regression-tested in [tests/e2e/popup-console-crane.spec.ts](tests/e2e/popup-console-crane.spec.ts).

### Settings store

[src/common/store/settings.ts](src/common/store/settings.ts) — Pinia store, syncs through background via `SYNC_SETTINGS`. Holds:
- `theme` (`dark` / `light` / `auto`) — applied to every `.subturtle-scope` element via a `MutationObserver` so teleported subtrees get the class too.
- `language` — target language code.
- `nibbleDisabledDomains` — list of normalized hostnames where Nibble is disabled. Use `isNibbleDisabledForHost(host)` / `setNibbleDisabledForHost(host, disabled)`.

When extending `SettingsObject`, you must update **four** sync points (search the file for `nibbleDisabledDomains` for the pattern):
1. `syncSettingsToBackground` payload
2. `fetchSettingsFromBackground` response handler
3. `chrome.runtime.onMessage` SYNC_SETTINGS listener
4. `chrome.storage.onChanged` listener

And the `SettingsObject` type in [src/common/types/messaging.ts](src/common/types/messaging.ts).

### Marker store (subtitle surfaces only)

[src/stores/marker.ts](src/stores/marker.ts) — central authority for word marking, hover, anchors, auto-clear timers. Used by `<Word>` / `<WordSelectionRectangle>` / `<SelectionAnchor>` / `<TranslatedPhrase>` in [src/subtitle/components/specific/](src/subtitle/components/specific/). **Nibble does not use the marker store** — it reads `text` + `context` from `window.getSelection()` and forwards them through the ConsoleCrane bridge.

## Gotchas

- **Pinia install order in entry scripts.** `useSettingsStore()` requires Pinia. Always run `addPlugins(app)` (see [src/plugins/install.ts](src/plugins/install.ts)) before any `useXxxStore()` call. The Nibble entry initializes Pinia, then settings, then gates the per-domain check, then mounts.
- **Nibble and ConsoleCrane roots must NOT have `pointer-events: none`.** Both are 0×0 fixed elements so they can't intercept clicks anyway, but `pointer-events: none` cascades into the modal and swallows all clicks. Leave the root unspecified for pointer events.
- **Selection popup must `@mousedown.prevent.stop`.** Otherwise clicking the popup deselects the page text, the composable detects the empty selection, and the popup unmounts mid-click.
- **The mount root in Nibble must not block the page.** Set `width: 0; height: 0; position: fixed; top: 0; left: 0`. Children use their own `position: fixed` to position themselves relative to the viewport.
- **Theme dark class lives on `.subturtle-scope`, not `<html>`.** Tailwind's `dark:` rules are rewritten by `postcss-prefix-selector` to `.subturtle-scope.dark ...` — so the same element must carry both classes. The settings store handles this and a `MutationObserver` keeps Vue Teleport subtrees in sync.
- **`src/stores/profile.ts` imports types from a sibling repo.** The path `../../../dashboard-app/frontend/types/database.type` resolves to a directory _next to_ this repo's root, not inside it. The actual repo is [`codebridger/subturtle-dashboard-app`](https://github.com/codebridger/subturtle-dashboard-app); local builds work because devs check both repos out side-by-side. CI clones the dashboard repo into `../dashboard-app/` before `yarn build` runs (see [.github/workflows/release.yml](.github/workflows/release.yml)). Don't try to "fix" the import to a relative-internal path or vendor the file — both will drift. See [§ Sibling repositories](#sibling-repositories) for how to pull in / branch the dashboard and pilotui repos.
- **Playwright Chromium download isn't on CCW's Trusted allowlist.** The chrome-extension-tester-mcp's `postinstall` runs `playwright install chromium`, which pulls from `cdn.playwright.dev` / `playwright.download.prss.microsoft.com`. CCW environments must use Custom network access with those hosts added — see [§ Cloud agent workflow](#cloud-agent-workflow-claude-code-on-the-web). The setup script caches Chromium into the VM snapshot so per-session cost is zero.

## Adding things

### A new video subtitle surface (Disney+, HBO, Crunchyroll, etc.)

Follow [src/subtitle/README.md § Adding a New Surface](src/subtitle/README.md). TL;DR: copy `_support-template/`, fill in `static.ts` selectors, add a host detection branch in [src/main.ts](src/main.ts), update the manifest's first content_scripts block. Reuse `<Word>` / `<WordSelectionRectangle>` / `<TranslatedPhrase>` etc. — never fork them.

### A new Nibble feature

Most additions go in [src/nibble/](src/nibble/) — composables, components, popup states. Reuse ConsoleCrane for any save/detail flow. Don't import the marker store here.

### A new ConsoleCrane page

Add the route to [src/console-crane/router.ts](src/console-crane/router.ts), add the page name to the `ConsolePage` type in [src/console-crane/types.ts](src/console-crane/types.ts), and trigger it via `emitOpen({ page: "<name>", params, active: true })` from any feature bundle (or `useConsoleCraneStore().toggleConsoleCrane(...)` if you're calling from inside the console-crane bundle itself). Params are Unicode-safely encoded for free.

### A new content script entry

1. Add the entry to [webpack.config.js](webpack.config.js) `entry`.
2. Add a `content_scripts` block in [static/manifest.json](static/manifest.json) with the right URL match.
3. The entry script must mount its Vue root inside a `.subturtle-scope`-classed element (see Style isolation rule 1).
4. Run `addPlugins(app)` before any store usage.
5. To open the modal from the new bundle, use the [ConsoleCrane bridge](#consolecrane-bridge) — never import the ConsoleCrane component or store directly from another bundle.

## Release pipeline

Releases are automated by [.github/workflows/release.yml](.github/workflows/release.yml) running [`semantic-release`](https://semantic-release.gitbook.io/) on every push to `main` (stable channel) **or `dev` (prerelease channel)**. The pipeline is split into visible workflow steps rather than hidden inside a single `yarn release` call — read the workflow file end-to-end before changing it.

A top-level `concurrency:` block keys on `github.ref`, so two pushes to the same branch queue but `main` and `dev` runs proceed in parallel without touching each other's state (different changelog files, different version commits).

### How a release runs

1. **Compute the next version** — [scripts/next-version.mjs](scripts/next-version.mjs) calls semantic-release in dry-run mode and prints exactly `NONE` or `1.10.0`-style on stdout. It routes semantic-release's own logs to stderr so the workflow can capture stdout cleanly.
2. **Skip if no release** — when version is `NONE`, every following step's `if:` short-circuits.
3. **Write `.env.production`** — webpack's [dotenv-webpack](webpack.config.js) is configured with `safe: true`, so all 8 keys from [.env.example](.env.example) must be present at build time. CI populates the file from 3 GitHub Actions secrets and 5 vars (see workflow `env:` block). The job's `environment:` line (resolved from the branch) routes `MIXPANEL_PROJECT_TOKEN`, `SUBTURTLE_API_URL`, and `SUBTURTLE_DASHBOARD_URL` to the matching `prod`/`dev` environment; the rest come from repo-level. See [§ Required GitHub Actions config](#required-github-actions-config).
4. **Bump versions for build** — `npm version --no-git-tag-version` writes `package.json`; [scripts/sync-manifest-version.mjs](scripts/sync-manifest-version.mjs) writes the same version to [static/manifest.json](static/manifest.json).
5. **Build & zip** — `yarn build && yarn zip` produces `subturtle.zip` with the new version baked in.
6. **Restore version files** — `git checkout -- package.json static/manifest.json` reverts the bump. This step exists deliberately: it lets `@semantic-release/git` see a real diff in step 7 and create the `chore(release): X.Y.Z [skip ci]` commit. Without restore, the diff is empty and no commit lands.
7. **Run `yarn release`** — `@semantic-release/npm` re-bumps `package.json`, `@semantic-release/changelog` prepends release notes to the active changelog file (`CHANGELOG.md` on `main`, `CHANGELOG-DEV.md` on `dev`), [release.config.cjs](release.config.cjs) `prepareCmd` re-syncs `manifest.json`, `@semantic-release/git` commits all three files and tags `vX.Y.Z`, `@semantic-release/github` creates the release with `subturtle.zip` attached (auto-flagged as prerelease for dev runs).
8. **Upload zip artifact** — also published as a workflow artifact for offline access.

### Conventional Commits drive versioning

- `feat:` → minor bump
- `fix:` / `perf:` → patch bump
- `feat!:` / `BREAKING CHANGE` in body → major bump
- `chore:` / `refactor:` / `docs:` / `style:` / `test:` → no release (commits still appear in notes if a release fires)

If you squash-merge PRs, GitHub uses the **PR title** as the squash commit message, so PR titles must follow this convention to drive the right bump.

**Always include the ClickUp task ID in the commit message.** Reference it as `#<task-id>` (e.g. `fix(console-crane): align bundle selector height #86exw6kme`), matching existing history (`#86et9bk39`, `CU-86exvrzy8`). It can go in the subject or the body, and it links the commit back to the task in ClickUp. When a change closes a task, put the ID on every commit for that task; for squash-merged PRs put it in the PR title.

### `prepareCmd` does not build

[release.config.cjs](release.config.cjs) `prepareCmd` only runs `scripts/sync-manifest-version.mjs`. The build/zip happen earlier as explicit workflow steps so they're visible in CI logs and have access to the env file. Don't move build/zip back into `prepareCmd`.

### Dev channel (prereleases)

Pushes to `dev` cut prereleases on the `dev` channel — versions look like `1.11.0-dev.1`, `1.11.0-dev.2`, etc. When `dev` lands on `main`, semantic-release promotes the next stable bump cleanly (e.g. `1.11.0-dev.3` → `1.11.0`).

- **Two changelog files, never merged.** Stable runs prepend to [CHANGELOG.md](CHANGELOG.md); dev runs prepend to [CHANGELOG-DEV.md](CHANGELOG-DEV.md). The active file is selected at config-load time in [release.config.cjs](release.config.cjs) by reading `GITHUB_REF_NAME` (set by GitHub Actions) or, locally, `git rev-parse --abbrev-ref HEAD`. So `yarn release:dry` works correctly on a `dev` checkout without extra env.
- **Chrome-compatible `manifest.version`, plus `version_name` for prereleases.** Chrome MV3 only accepts 1–4 dot-separated integers in `manifest.version`, so [scripts/sync-manifest-version.mjs](scripts/sync-manifest-version.mjs) maps a prerelease `MAJOR.MINOR.PATCH-channel.N` to `MAJOR.MINOR.PATCH.N` for `version` and copies the full semver into `version_name` (which is what shows in `chrome://extensions`). Stable releases write only `version` and clear any stale `version_name`.
- **GitHub Release auto-flagging.** `@semantic-release/github` checks the branch's `prerelease` flag and marks the release accordingly — no extra config needed beyond the `branches` array in [release.config.cjs](release.config.cjs).
- **Comparison-ordering caveat.** A dev build (`1.11.0.5`) is a higher Chrome version than the stable `1.11.0`. If a tester installs a dev zip and later wants the stable zip of the same base version, Chrome will not auto-downgrade. Once `1.11.0` ships stable, the next dev push is `1.12.0-dev.1` → `1.12.0.1`, which is correctly higher. Acceptable for an internal channel; flag this if you ever wire dev builds to a Chrome Web Store listing.

### Required GitHub Actions config

The release workflow targets one of two GitHub Environments per run, picked from the branch via `environment: ${{ github.ref_name == 'main' && 'prod' || 'dev' }}`. Push to `main` → `prod` environment; push to `dev` → `dev` environment. With the job bound to an environment, `${{ secrets.X }}` / `${{ vars.X }}` resolve environment-first then fall back to repo-level — so the `env:` block in the "Write .env.production" step is the same for both branches.

**Per-environment** (`Settings → Environments → prod` / `dev`) — same keys in both, different values:
- Secret: `MIXPANEL_PROJECT_TOKEN`
- Variables: `SUBTURTLE_API_URL`, `SUBTURTLE_DASHBOARD_URL`

**Repository-level** (`Settings → Secrets and variables → Actions`) — shared by both:
- Secrets: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_TRANSLATE_KEY`
- Variables: `MIXPANEL_API_HOST`, `GOOGLE_TRANSLATE_PROXY_URL`, `UNINSTALL_FORM_URL`

When forking, recreate the two environments and the repo-level entries above.

The default `GITHUB_TOKEN` is enough for the bot to push the release commit and tag, as long as the `main` (or `dev`) ruleset doesn't require PRs. Currently main only blocks force pushes and deletions; no PR rule.

### Local rehearsal

```bash
node scripts/next-version.mjs              # see what the next version would be
yarn build && yarn zip                      # build with whatever package.json currently says
```

A full dry-run of the release plan needs `GITHUB_TOKEN` set:

```bash
GITHUB_TOKEN=$(gh auth token) yarn release:dry
```

This prints the version + notes that would be generated without writing anything or creating a release.

## Verifying changes

**The default way to verify any extension change — locally or in CCW — is to drive the [`chrome-extension-tester`](https://github.com/BHUVAN-RJ/chrome-extension-testing-mcp) (Playwright) MCP yourself.** It's declared in [.mcp.json](.mcp.json), loads at Claude Code startup, and runs a real headless Chromium with the unpacked `dist/` loaded. Prefer it over handing back for a manual reload and over leaning on the committed `tests/e2e/` suite for per-change checks: it drives the *real* built bundle against the *real* dev server, opens both `popup.html` and the content-script surfaces, and needs no human to reload the extension.

Loop after any change:

```bash
yarn build        # rebuild dist/ first — the MCP loads the built bundle, not source
```

```
load_extension({ extension_path: "<abs>/dist" })                     # launch + load unpacked
interact_with_popup({ action: "open" | "type" | "click" | "get_text" })
inspect_dom({ script })                                              # eval JS / check content-script DOM
extension_storage({ action: "set", area: "sync", data: { token } }) # logged-in flows
take_screenshot({ output_path })  /  run_assertion({ script })       # capture + PASS/FAIL
```

Prerequisites: `dist/` built and `.env.production` carrying `ENABLE_PASSWORD_AUTH=true` (so the popup login form renders). For logged-in flows, mint a JWT against the dev server and inject it into `chrome.storage.sync["token"]` via `extension_storage`; the curl/login detail and the full 14-tool reference live in [§ Cloud agent workflow](#cloud-agent-workflow-claude-code-on-the-web) — the CCW-specific configuration of this same MCP.

**MCP vs `tests/e2e/`.** Both are Playwright; they share no code and do different jobs. The MCP is the *interactive, per-change* check (this section). The [`tests/e2e/`](tests/e2e/) specs are the *committed regression suite* CI verify runs on every push/PR — extend them when a behaviour earns a permanent net, not as your day-to-day check. See [§ Boundary](#boundary).

**Can't reach:** real `youtube.com` / `netflix.com` subtitle surfaces — `main.js`'s manifest match is locked to those hosts, so they stay manual (see [§ Verification checklist](#verification-checklist)).

## Testing

Three test layers, all wired into a single CI verify gate that blocks releases on a red.

### Stack

| Layer | Tool | Where |
| --- | --- | --- |
| Unit / component | Vitest + happy-dom + `@vue/test-utils` + `@pinia/testing` | [tests/](tests/) — `*.test.ts` |
| E2E (real Chromium with the unpacked extension loaded) | `@playwright/test` + `chromium.launchPersistentContext({ args: ['--load-extension=dist'] })` | [tests/e2e/](tests/e2e/) — `*.spec.ts` |
| Static type | `tsc --noEmit` via [scripts/typecheck.mjs](scripts/typecheck.mjs) | (whole repo) |

The `.test.ts` / `.spec.ts` split keeps Vitest and Playwright from fighting over file ownership — Vitest's `exclude` config drops everything matching `**/*.spec.ts` and `tests/e2e/**`.

### Vitest setup

- [vitest.config.ts](vitest.config.ts) — happy-dom env. PostCSS is bypassed inline (the project's webpack-targeted [postcss.config.js](postcss.config.js) uses a custom `rem→px` plugin that Vite's loader rejects); unit tests don't import CSS so the bypass is invisible to component tests.
- [tests/setup.ts](tests/setup.ts) — hand-rolled in-memory `chrome.*` shim covering the surface the production code actually touches: `runtime.sendMessage` / `onMessage`, `storage.local` get/set, `storage.onChanged.addListener`, `tabs.query` / `sendMessage`, `i18n.getUILanguage`, `runtime.getURL`. Plus a module-level `vi.mock('mixpanel-browser', ...)` so analytics never fire, and a silenced `console.log`. Don't pull in `jest-chrome` / `sinon-chrome` — both are abandoned and over-engineered for this surface.
- Pinia stores get a fresh `createPinia()` per test in `beforeEach`. Cross-bundle bridge tests use real `window.dispatchEvent` (happy-dom provides a real DOM).

### Playwright E2E setup

- [playwright.config.ts](playwright.config.ts) — `webServer` auto-boots [tests/e2e/server.mjs](tests/e2e/server.mjs) (a ~30-line static-file server for fixture pages). Single worker (extensions don't parallelize cleanly under one persistent context). HTML report always emitted, uploaded as a CI artifact on every run.
- [tests/e2e/extension-fixture.ts](tests/e2e/extension-fixture.ts) — Playwright fixture that loads `dist/` as an unpacked extension and exposes `context`, `serviceWorker`, `extensionId`. Specs that need the extension import `{ test, expect }` from this file instead of `@playwright/test`. The `dist-artifacts.spec.ts` is fs-only and uses plain `@playwright/test`.
- Fixture pages live under [tests/e2e/fixtures/](tests/e2e/fixtures/): `index.html` (English, default 16px html font-size), `persian.html` (Persian RTL — regression target for the `btoa` / Latin1 bug class), `large-font.html` (24px html — regression target for the postcss `rem→px` rewrite).
- Don't run E2E against real `youtube.com` / `netflix.com` — flaky, slow, and breaks on selector changes outside our control. Nibble + ConsoleCrane both match `<all_urls>` in the manifest, so the local fixtures are enough for those flows.

### Critical Chromium flags

The fixture passes a specific args list to `launchPersistentContext`. **Changing them breaks CI silently.**

- `--headless=new` — forces the *full* Chromium binary in new-headless mode. Without it, Playwright defers to `chrome-headless-shell` on Linux runners, which **does not load extensions**. Every `toBeAttached` for `#subturtle-{nibble,console-crane}-root` will time out at 10s. macOS happens to do the right thing without this flag, which makes it easy to drop accidentally.
- `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage` — standard CI hygiene for Chromium under containerised runners. Harmless on macOS, sometimes required on Linux GitHub runners.
- `--disable-extensions-except=${dist}` + `--load-extension=${dist}` — load only our extension, nothing else.

### CI verify gate

[.github/workflows/release.yml](.github/workflows/release.yml) — a single workflow with two jobs.

The new `verify` job runs on `push` AND `pull_request` to `main` / `dev`. Step order matters:

1. Checkout + sibling `dashboard-app` clone (CI-only path; see Gotchas).
2. `yarn install --frozen-lockfile`.
3. Cache + install Playwright Chromium (`~/.cache/ms-playwright` keyed on `yarn.lock` hash).
4. **Type check** — `yarn typecheck`.
5. **Unit tests** — `yarn test`.
6. **Stub `.env.production`** — heredocs *non-empty* placeholder values for every key in `.env.example`. Do not regress this to `cp .env.example .env.production`: empty values cause `mixpanel.init("")` in [src/plugins/mixpanel.ts](src/plugins/mixpanel.ts) to throw synchronously during the content-script import chain, which silently halts every Vue mount before its top-level `log()` calls. Symptom: every browser-loading e2e test times out at `toBeAttached` for the content-script roots, with zero HTTP traffic in the trace after the page load.
7. **Build** — `yarn build`.
8. **E2E tests** — `yarn test:e2e`.
9. **Upload Playwright report** — runs on success or failure (gated by `hashFiles('playwright-report/**') != ''` so it skips silently when typecheck / unit tests fail before Playwright produces output). Pull with `gh run download -n playwright-report <run-id>`.

The existing `release` job is unchanged in body but now has `needs: verify` and `if: github.event_name == 'push'` so it skips on PRs and only fires after verify is green.

### Typecheck wrapper ([scripts/typecheck.mjs](scripts/typecheck.mjs))

Wraps `tsc --noEmit` and suppresses two classes of upstream errors:

- `node_modules/pilotui/*` — pilotui's `package.json` `exports.types` points at raw TS source, so tsc follows into `pilotui/src/vue.ts` which has a mismatched plugin signature against `vue3-perfect-scrollbar`.
- `../dashboard-app/*` — [src/stores/profile.ts](src/stores/profile.ts) walks the import chain into the sibling repo's frontend types, which re-export from server-side TS that depends on `mongoose` / `stripe` / `@modular-rest/server`. dashboard-app's own `node_modules` are usually present locally but are NOT installed in CI.

Real errors in our own code still print full tsc output and fail. Clean runs print a single summary line so GitHub's log parser doesn't surface the suppressed errors as red `Error:` annotations in the UI.

The Vue 3 SFC ambient declaration lives at [src/vue-shim.d.ts](src/vue-shim.d.ts); it must use `DefineComponent` (not Vue 2's default-export shape) or every `.vue` import in the routers gets typed as the bare `vue` module namespace.

### Test file map

```
tests/
  setup.ts                          # chrome.* shim, mixpanel mock
  route-params.test.ts              # encode/decode Unicode round-trip + undefined edge case
  console-crane-bridge.test.ts      # window CustomEvent emit/listen contracts
  console-crane-store.test.ts       # toggleConsoleCrane / goBack / canGoBack / isOnMainPage
  translate.service.test.ts         # cache hit/miss + 24h TTL eviction (vi.useFakeTimers)
  settings-host.test.ts             # nibbleDisabledDomains normalize / toggle
  language-detection.test.ts        # RTL detection, title lookup, supported codes
  selection-popup.test.ts           # @mousedown.prevent.stop regression
  nibble-surface.test.ts            # bridge-driven hide/show
  translate-card.test.ts            # popup translate input flow
  login-password.test.ts            # popup password form (ENABLE_PASSWORD_AUTH=true)
  login-password-disabled.test.ts   # popup password form hidden when flag is unset
  e2e/
    extension-fixture.ts            # chromium.launchPersistentContext + extension load
    server.mjs                      # static fixtures HTTP server
    fixtures/                       # index.html, persian.html, large-font.html
    dist-artifacts.spec.ts          # fs check of dist/ shape (no browser)
    nibble-flow.spec.ts             # content script mounting + Persian emitOpen
    console-crane-lifecycle.spec.ts # modal stays open while Nibble toggles off
    translate-flow.spec.ts          # full Persian translate-and-save with page.route stubs
    password-login.spec.ts          # popup password form end-to-end with stubbed /user/login
    visual-scale.spec.ts            # rem→px rewrite regression net
    popup-console-crane.spec.ts     # popup.html: Practice/Preview navigate to console pages in the popup router (no modal)
```

### Test totals

138 unit / component tests across 19 files; 16 E2E specs across 6 files. Full suite runs in ~20s once Playwright's Chromium is warm.

## Cloud agent workflow (Claude Code on the Web)

Lets a cloud Claude agent on [Claude Code on the Web (CCW)](https://code.claude.com/docs/en/web-quickstart) clone the repo, build the extension, install it into a headless Chromium, log in with username/password against the live dev server at `https://dev.dashboard.subturtle.app/`, and drive popup + content scripts with screenshots — no Google OAuth, no local backend.

> This same MCP is the repo-wide default for verifying **any** change, local or cloud — see [§ Verifying changes](#verifying-changes). What follows is its CCW-specific (cloud) configuration.

The agent path uses **only** the [chrome-extension-tester-mcp](https://github.com/BHUVAN-RJ/chrome-extension-testing-mcp) MCP server (declared in [.mcp.json](.mcp.json)). It is independent of the `tests/e2e/` Playwright fixture and shares no code with it; CI verify runs the spec, the agent runs the MCP.

### One-time CCW environment setup

Done once per CCW environment from [claude.ai/code](https://claude.ai/code) — these settings live in the cloud UI, not the repo.

**Network access:** `Custom`, keeping the Trusted defaults plus Playwright's Chromium-download hosts. Without these, the setup script's `npm install -g chrome-extension-tester-mcp` hangs while pulling Chromium:
```
cdn.playwright.dev
playwright.download.prss.microsoft.com
```

**Environment variables** (`.env` format, no quotes):
```
ENABLE_PASSWORD_AUTH=true
SUBTURTLE_API_URL=https://dev.dashboard.subturtle.app
SUBTURTLE_DASHBOARD_URL=https://dev.dashboard.subturtle.app
AGENT_EMAIL=<provided by user>
AGENT_PASSWORD=<provided by user>
# stubs sufficient for the build, not used by the agent flow:
MIXPANEL_PROJECT_TOKEN=dev_stub
MIXPANEL_API_HOST=https://api-js.mixpanel.com
GOOGLE_TRANSLATE_KEY=dev_stub
GOOGLE_TRANSLATE_PROXY_URL=https://translate.googleapis.com
UNINSTALL_FORM_URL=https://example.com/uninstall
GOOGLE_OAUTH_CLIENT_ID=dev_stub
```

`AGENT_EMAIL` / `AGENT_PASSWORD` are not consumed by the build — they exist so the agent's Bash step can reference `$AGENT_EMAIL` / `$AGENT_PASSWORD` without hardcoding into the prompt. They must match an account that exists on the dev server (the agent does not register; the human or dashboard team seeds the account).

**Setup script** (runs as root on Ubuntu 24.04, cached as a VM snapshot — first session ~5 min, subsequent ones reuse the cache):
```bash
#!/bin/bash
set -e

cd "${CLAUDE_PROJECT_DIR:-/workspace}"

# 1. Install extension deps.
yarn install --frozen-lockfile

# 2. Materialize .env.production from CCW env vars (dotenv-webpack's safe:true
#    requires every key in .env.example to be present at build time).
cat > .env.production <<EOF
MIXPANEL_PROJECT_TOKEN=${MIXPANEL_PROJECT_TOKEN}
MIXPANEL_API_HOST=${MIXPANEL_API_HOST}
GOOGLE_TRANSLATE_KEY=${GOOGLE_TRANSLATE_KEY}
GOOGLE_TRANSLATE_PROXY_URL=${GOOGLE_TRANSLATE_PROXY_URL}
UNINSTALL_FORM_URL=${UNINSTALL_FORM_URL}
SUBTURTLE_API_URL=${SUBTURTLE_API_URL}
SUBTURTLE_DASHBOARD_URL=${SUBTURTLE_DASHBOARD_URL}
GOOGLE_OAUTH_CLIENT_ID=${GOOGLE_OAUTH_CLIENT_ID}
ENABLE_PASSWORD_AUTH=${ENABLE_PASSWORD_AUTH}
EOF

# 3. Build the extension once into dist/.
NODE_ENV=production yarn build

# 4. Install the MCP globally so Playwright Chromium is downloaded once
#    into the cached snapshot. npx in .mcp.json resolves to this install.
npm install -g chrome-extension-tester-mcp@^2.1
```

### Driving the extension via the MCP

Once the environment is set up and the agent session starts, the cached snapshot already has `dist/` built and Playwright Chromium installed. The full login + screenshot loop becomes:

```
# 1. Load the unpacked extension into headless Chromium.
load_extension({ extension_path: "$PWD/dist" })

# 2. Get a JWT from the dev server with the credentials in CCW env vars.
#    modular-rest's authentication.login POSTs to /user/login.
#    The password MUST be base64-encoded — modular-rest's client library
#    does this internally, but raw curl has to pre-encode. Without it
#    the server returns HTTP 412 {"status":"error","e":{}}.
PW_B64=$(printf '%s' "$AGENT_PASSWORD" | base64)
curl -sX POST "$SUBTURTLE_API_URL/user/login" \
  -H 'Content-Type: application/json' \
  -d "{\"idType\":\"email\",\"id\":\"$AGENT_EMAIL\",\"password\":\"$PW_B64\"}"
# → { "status": "success", "token": "<jwt>" }

# 3. Inject the JWT into chrome.storage.sync — same slot background.ts:62
#    reads on every load. The extension is now "logged in".
extension_storage({ action: "set", area: "sync", data: { token: "<jwt>" } })

# 4. Open the popup and screenshot the logged-in view.
interact_with_popup({ action: "open" })
take_screenshot({ output_path: ".agent/popup.png" })
# Expected: "Logged In Successfully!" view (LoginView.vue:57-68 v-else branch).
```

The MCP exposes 14 tools — others worth knowing about: `inspect_dom` (eval JS in a page), `monitor_network` (capture requests during navigation), `send_message_to_background` (drive `chrome.runtime.onMessage` listeners), `get_service_worker_logs` (read background SW console output), `run_assertion` (returns structured PASS/FAIL). Full reference: the [chrome-extension-tester-mcp README](https://github.com/BHUVAN-RJ/chrome-extension-testing-mcp).

### Why password auth exists in this build

`ENABLE_PASSWORD_AUTH` gates the email + password form in [src/popup/views/LoginView.vue](src/popup/views/LoginView.vue) at build time via `dotenv-webpack`. CCW builds set it true so the agent (or a human dev) can log in by typing credentials; stable + dev release builds in [.github/workflows/release.yml](.github/workflows/release.yml) set it false so production users see only Google OAuth. The agent's direct-API path doesn't need the UI, but the UI is what makes manual testing possible.

### How auth works under the hood

The agent's direct-API path POSTs `/user/login` (via `curl`) and gets a JWT. Injecting that JWT into `chrome.storage.sync["token"]` (via the MCP's `extension_storage` tool) lands it in the *same slot* the post-OAuth `StoreUserTokenMessage` path uses — see [src/background.ts:62](src/background.ts) for the read side. modular-rest's client, the profile store, the translate service, and ConsoleCrane all see no difference between an OAuth-issued token and a password-issued token.

### Local dev fallback (no CCW, no MCP)

```bash
echo "ENABLE_PASSWORD_AUTH=true" >> .env.production   # plus the other 8 keys
yarn build && yarn dev    # webpack --watch
# Load dist/ at chrome://extensions, click the extension icon, use the form.
```

The popup form drives `authentication.login` from `@modular-rest/client`, hitting whatever `SUBTURTLE_API_URL` points at. No MCP, no Playwright — just the same UI a real user would see.

### Boundary

The agent path uses only the MCP. `tests/e2e/` is the testing ground for CI verify and stays untouched by agent tooling; the two never share code. If you need to add a new agent capability, route it through the MCP's tools or a new MCP — not through the Playwright fixture.

## Verification checklist

Most of this is automated by `yarn test` + `yarn test:e2e` — the items below are what the test suite already pins, with cross-references to the spec files. Re-run them by hand only if you're touching code the suite can't reach (the YouTube / Netflix subtitle path) or if you want a manual sanity pass on a real site. When verifying by hand, default to the chrome-extension-tester MCP — see [§ Verifying changes](#verifying-changes).

Automated:

- `dist/` shape — entry files present, no orphan numeric chunks, manifest declares all four content scripts. → [tests/e2e/dist-artifacts.spec.ts](tests/e2e/dist-artifacts.spec.ts).
- Both content scripts mount their roots on a generic page; exactly one `#subturtle-console-crane-root`. → [tests/e2e/nibble-flow.spec.ts](tests/e2e/nibble-flow.spec.ts).
- Selection → Subturtle icon → translated card → Save → ConsoleCrane opens with WordDetail rendering Persian content. → [tests/e2e/translate-flow.spec.ts](tests/e2e/translate-flow.spec.ts).
- Toggling Nibble OFF for a host **while ConsoleCrane is open** does NOT close the modal or release the body scroll lock. → [tests/e2e/console-crane-lifecycle.spec.ts](tests/e2e/console-crane-lifecycle.spec.ts).
- Popup translate input: auto-focus on open, spinner while pending, re-submit different word resets, no double-fetch on enter mash. → [tests/translate-card.test.ts](tests/translate-card.test.ts).
- On `popup.html`, translating a phrase then clicking **Practice with AI** / **Preview flashcard** navigates to the matching console page in the popup's own router (no modal); **Back** returns to the kept-alive Home with the translation intact. → [tests/e2e/popup-console-crane.spec.ts](tests/e2e/popup-console-crane.spec.ts).
- Per-host Nibble toggle persists and normalizes (`www.` strip, case fold, dedup). → [tests/settings-host.test.ts](tests/settings-host.test.ts).
- ConsoleCrane on Persian / CJK / emoji inputs throws no `InvalidCharacterError` from `btoa` — covered at the encode level, the bridge level, and the full select-and-save flow. → [tests/route-params.test.ts](tests/route-params.test.ts), [tests/e2e/nibble-flow.spec.ts](tests/e2e/nibble-flow.spec.ts), [tests/e2e/translate-flow.spec.ts](tests/e2e/translate-flow.spec.ts).
- Visual scale is consistent on default-html-fontsize and 24px-html-fontsize hosts (postcss `rem→px` rewrite regression net). → [tests/e2e/visual-scale.spec.ts](tests/e2e/visual-scale.spec.ts).
- Password login form: build-flag gating, validation, success path lands JWT in `chrome.storage.sync["token"]`, 401 surfaces inline error. → [tests/login-password.test.ts](tests/login-password.test.ts), [tests/login-password-disabled.test.ts](tests/login-password-disabled.test.ts), [tests/e2e/password-login.spec.ts](tests/e2e/password-login.spec.ts).

Still manual:

- On YouTube `/watch`: subtitle popup wraps caption words, hover/anchor selection works, all three content scripts run side-by-side. The `main.js` URL match is locked to `youtube.com` and Netflix, so it can't be fixtured without a test-only manifest.
- On Netflix: same — subtitle wrapping behaviour on real Netflix.
- Popup full re-open lifecycle on the actual `chrome-extension://<id>/popup.html` page (the unit suite covers individual components but not the popup-page mount + nav transitions).

## Useful pointers

- Manifest: [static/manifest.json](static/manifest.json)
- Webpack entries: [webpack.config.js](webpack.config.js)
- PostCSS scoping + rem rewrite: [postcss.config.js](postcss.config.js)
- Vue plugin setup: [src/plugins/install.ts](src/plugins/install.ts)
- Background message types: [src/common/types/messaging.ts](src/common/types/messaging.ts)
- ConsoleCrane store: [src/console-crane/stores/console-crane.ts](src/console-crane/stores/console-crane.ts)
- ConsoleCrane bridge: [src/common/services/console-crane-bridge.ts](src/common/services/console-crane-bridge.ts)
- Route-param helpers (Unicode-safe base64): [src/console-crane/route-params.ts](src/console-crane/route-params.ts)
- WordDetailModule (detailed result panel, prop- or route-driven): [src/console-crane/modules/word-detail/index.vue](src/console-crane/modules/word-detail/index.vue)
- Popup translate card: [src/popup/components/TranslateCard.vue](src/popup/components/TranslateCard.vue)
- Settings store: [src/common/store/settings.ts](src/common/store/settings.ts)
- Marker store: [src/stores/marker.ts](src/stores/marker.ts)
- Translate service: [src/common/services/translate.service.ts](src/common/services/translate.service.ts)
- Release + verify workflow: [.github/workflows/release.yml](.github/workflows/release.yml)
- semantic-release config: [release.config.cjs](release.config.cjs)
- Changelogs: [CHANGELOG.md](CHANGELOG.md) (stable), [CHANGELOG-DEV.md](CHANGELOG-DEV.md) (prerelease)
- Version-bump helpers: [scripts/next-version.mjs](scripts/next-version.mjs), [scripts/sync-manifest-version.mjs](scripts/sync-manifest-version.mjs)
- Vitest config: [vitest.config.ts](vitest.config.ts)
- Vitest setup (chrome shim, mixpanel mock): [tests/setup.ts](tests/setup.ts)
- Playwright config: [playwright.config.ts](playwright.config.ts)
- Playwright extension fixture: [tests/e2e/extension-fixture.ts](tests/e2e/extension-fixture.ts)
- Playwright fixtures server: [tests/e2e/server.mjs](tests/e2e/server.mjs)
- Typecheck wrapper (with upstream-error filter): [scripts/typecheck.mjs](scripts/typecheck.mjs)
- Vue 3 SFC ambient declaration: [src/vue-shim.d.ts](src/vue-shim.d.ts)
- Default verification workflow (chrome-extension-tester MCP): [§ Verifying changes](#verifying-changes)
- MCP server config (chrome-extension-tester — default verify tool + CCW): [.mcp.json](.mcp.json)
- Popup LoginView (password form + OAuth buttons): [src/popup/views/LoginView.vue](src/popup/views/LoginView.vue)
