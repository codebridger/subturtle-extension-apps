# Subturtle Extension — Working Notes

Operating manual for working inside this repo. For product overview / supported sites / architecture diagram, see [README.md](./README.md). For subtitle-surface internals (YouTube/Netflix), see [src/subtitle/README.md](./src/subtitle/README.md).

## Quick start

```bash
npm install
npm run dev      # webpack --watch, writes dist/
npm run build    # NODE_ENV=production webpack --mode=production
```

Load `dist/` as an unpacked extension at `chrome://extensions`. There is no separate dev server — the bundler writes straight to `dist/`, and Chrome reloads when you click the reload button on the extension card.

## Bundles (+ popup, background)

| Bundle | Entry | Runs on | Purpose |
| --- | --- | --- | --- |
| `main.js` | [src/main.ts](src/main.ts) | YouTube `/watch`, Netflix | Subtitle phrase collector — wraps caption words in `<Word>` spans, hover/anchor selection. |
| `nibble.js` | [src/nibble.ts](src/nibble.ts) | `<all_urls>` | Web text phrase collector — native `Selection` → floating Subturtle icon → translation card. **Does not mutate page DOM.** |
| `console-crane.js` | [src/console-crane.ts](src/console-crane.ts) | `<all_urls>` | The modal app (word-detail, settings, save flow). Owns its own Vue app + Pinia store + router. Feature bundles drive it via the [bridge](src/common/services/console-crane-bridge.ts). |
| `popup.js` | [src/popup.ts](src/popup.ts) | Toolbar popup | Settings, language, dashboard link, per-site Nibble toggle. |
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

Params are encoded into the route via `encodeRouteParams` in [src/console-crane/stores/console-crane.ts](src/console-crane/stores/console-crane.ts) — Unicode-safe (uses TextEncoder). Decode with `decodeRouteParams`. **Never use `window.btoa(JSON.stringify(...))` directly** — it throws `InvalidCharacterError` on non-Latin1 input (Persian, CJK, emoji, accented Latin).

### Translation

```ts
import { TranslateService } from "@/common/services/translate.service";
const text = await TranslateService.instance.fetchSimpleTranslation(phrase, contextString);
```

24-hour in-memory cache keyed on `(translationType, targetLanguage, phrase, context)`. `fetchDetailedTranslation` for the rich `LanguageLearningData` shape used by ConsoleCrane.

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
- **`src/stores/profile.ts` imports types from a sibling repo.** The path `../../../dashboard-app/frontend/types/database.type` resolves to a directory _next to_ this repo's root, not inside it. The actual repo is [`codebridger/subturtle-dashboard-app`](https://github.com/codebridger/subturtle-dashboard-app); local builds work because devs check both repos out side-by-side. CI clones the dashboard repo into `../dashboard-app/` before `yarn build` runs (see [.github/workflows/release.yml](.github/workflows/release.yml)). Don't try to "fix" the import to a relative-internal path or vendor the file — both will drift.

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
3. **Write `.env.production`** — webpack's [dotenv-webpack](webpack.config.js) is configured with `safe: true`, so all 8 keys from [.env.example](.env.example) must be present at build time. CI populates the file from 3 GitHub Actions secrets and 5 vars (see workflow `env:` block).
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

## Verification checklist

When changes touch the bundle layout, content scripts, or shared CSS:

- `dist/` contains exactly: `background.js`, `main.js`, `nibble.js`, `console-crane.js`, `popup.js`, `popup.html`, `manifest.json`, `assets/` (no orphan numeric chunks).
- On YouTube `/watch`: subtitle popup works; Nibble selection popup also works (all three content scripts run there). Exactly one `#subturtle-console-crane-root` in the DOM.
- On Wikipedia: only `nibble.js` and `console-crane.js` run; selection → icon → translation card → save flow opens ConsoleCrane.
- In the popup: per-site toggle reads/writes `nibbleDisabledDomains` and survives a popup re-open. Toggling Nibble OFF for a host **while ConsoleCrane is open** must NOT close the modal or lock page scroll — the modal lifecycle is decoupled from the Nibble per-host gate via the bridge.
- In ConsoleCrane on a non-Latin page (e.g. Persian / Chinese article): no `InvalidCharacterError` from `btoa`.
- Visual scale is consistent on a default-html-font-size site (YouTube) and a large-html-font-size site (typical WordPress blog).

## Useful pointers

- Manifest: [static/manifest.json](static/manifest.json)
- Webpack entries: [webpack.config.js](webpack.config.js)
- PostCSS scoping + rem rewrite: [postcss.config.js](postcss.config.js)
- Vue plugin setup: [src/plugins/install.ts](src/plugins/install.ts)
- Background message types: [src/common/types/messaging.ts](src/common/types/messaging.ts)
- ConsoleCrane store: [src/console-crane/stores/console-crane.ts](src/console-crane/stores/console-crane.ts)
- ConsoleCrane bridge: [src/common/services/console-crane-bridge.ts](src/common/services/console-crane-bridge.ts)
- Settings store: [src/common/store/settings.ts](src/common/store/settings.ts)
- Marker store: [src/stores/marker.ts](src/stores/marker.ts)
- Translate service: [src/common/services/translate.service.ts](src/common/services/translate.service.ts)
- Release workflow: [.github/workflows/release.yml](.github/workflows/release.yml)
- semantic-release config: [release.config.cjs](release.config.cjs)
- Changelogs: [CHANGELOG.md](CHANGELOG.md) (stable), [CHANGELOG-DEV.md](CHANGELOG-DEV.md) (prerelease)
- Version-bump helpers: [scripts/next-version.mjs](scripts/next-version.mjs), [scripts/sync-manifest-version.mjs](scripts/sync-manifest-version.mjs)
