# Subtitle Platform

## Purpose
Content scripts under `src/subtitle` power Subturtle’s on-page subtitle overlays for every supported surface (Netflix, YouTube, future providers). Each integration shares the same learning experience—word selection, translation, and Console Crane—while adapting to the target site’s DOM and policies.

### High-Level Flow
1. **Initializer (per surface)** mounts a Vue app once the host caption container appears.
2. **Site-specific `Index.vue`** tracks native captions, mirrors their layout, and feeds context into the shared marker store.
3. **Shared components (`components/specific`)** render interactive words, selection rectangles, anchors, and translated phrases on top of the host captions.
4. **Stores & Console Crane** reuse global Pinia stores (e.g., `marker`) plus the overlay app to show translations/word details.

## Directory Map
| Path | Description |
| --- | --- |
| `web_youtube`, `web_netflix` | Production integrations. Each folder contains `Index.vue`, `initializer.ts`, `static.ts`, and any extra assets unique to that platform. |
| `_support-template` | Boilerplate for new providers. Copy this folder when bootstrapping another site—then adjust selectors, DOM strategy, and policies. |
| `components/` | Cross-surface Vue components. `specific/Word.vue`, `WordSelectionRectangle.vue`, `TranslatedPhrase.vue`, `SelectionAnchor.vue`, and `SvgLoader.vue` compose the interactive overlay. |
| `components/components.ts` | Barrel file for exporting shared components to site entries. |
| `components/guides` | Lightweight helper snippets used in multiple surfaces. |
| `helpers/global-events.ts` | Registers keyboard+tactical events (e.g., Ctrl/Meta for marking mode) so all surfaces share consistent UX. |

## Core Concepts
- **Marker Store (`src/stores/marker.ts`)** – central authority for marked words, hover state, and auto-clear timers (2.5s single, 5s multi). Integrations should only invoke store actions; never manage timers inside view components.
- **Word Rendering** – `Subtitle.vue` (per surface) splits caption text into `<Word>` components, each wired to `markerStore` for hover/selection state.
- **Selection Rectangle** – `WordSelectionRectangle.vue` reads `markerStore` positions to draw DOM overlays that follow host captions even while they animate.
- **Translation Bubble** – `TranslatedPhrase.vue` shows the latest translated text. Surfaces can offset its placement via local constants.
- **Console Crane** – `src/console-crane` is mounted alongside subtitle overlays to display word details; surfaces only need to ensure the crane container stays connected and receives context.

## Adding a New Surface
1. Duplicate `_support-template` and rename the folder (`src/subtitle/<new-surface>`).
2. Update `static.ts` selectors/CSS hooks for the host’s caption DOM.
3. Implement any CSP/TT policy adjustments in `initializer.ts` before mounting the Vue app.
4. Customize the local `Index.vue` to:
   - detect caption nodes (MutationObserver or site API),
   - track dialogue IDs and mirrored styles,
   - call `markerStore.setContext(...)` for each caption batch.
5. Reuse shared components whenever possible; extend `components/specific` only when behaviour truly differs across all surfaces.
6. Wire the new initializer into `src/main.ts` (AppInitializer) so it loads on the correct domain.

## Debugging Tips
- Enable verbose logs via `log()` helpers inside each surface to confirm activation.
- Inspect `markerStore.markedWords` in the devtools Pinia tab to validate selection lifecycles.
- If overlays drift, ensure `markerStore.triggerPositionUpdate()` fires after every geometric change (WordSelectionRectangle already does this).
- When captions stop appearing, double-check the selectors in `<surface>/static.ts` and MutationObserver filters.

