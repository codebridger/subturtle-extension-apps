# MS Teams Subtitle Integration

This directory contains the MS Teams-specific implementation of the Subturtle subtitle learning extension.

## Overview

The MS Teams integration provides interactive subtitles with word translation and learning features during Teams meetings. It works by:
- Detecting live captions in MS Teams meetings
- Rendering interactive word overlays on top of the native captions
- Providing click-to-translate functionality
- Displaying a word detail modal for learning

## Architecture

### Key Components

- **`Index.vue`**: Main component that manages subtitle detection and rendering
  - Polls for caption elements using `MutationObserver`
  - Creates per-dialogue overlay components
  - Manages the `ConsoleCrane` modal for word details
  
- **`Subtitle.vue`**: Individual subtitle line component
  - Renders interactive words with click handlers
  - Applies MS Teams' native caption styling
  - Handles word selection and highlighting

- **`initializer.ts`**: Entry point for MS Teams integration
  - Waits for caption container to appear
  - Mounts the Vue app into the page

### Data Flow

1. **Caption Detection**: `Index.vue` uses `MutationObserver` to detect new caption elements
2. **Dialogue Tracking**: Each caption element is tracked with a unique `dialogueIndex`
3. **Word Rendering**: `Subtitle.vue` breaks text into clickable word components
4. **Word Selection**: Clicking a word triggers `OpenWordDetail` in `Word.vue`
5. **Modal Display**: `ConsoleCrane` shows translation and learning options

### Interaction Enhancements

The MS Teams overlay uses two key interaction affordances to keep the UI predictable when captions constantly re-render:

- **Selection lifecycle**: `markerStore` owns the auto-clear lifecycle. When the pointer leaves the selection and the user is no longer marking, the store starts a timeout (≈2.5 s for single-word, ≈5 s for multi-word). Because the logic lives in the store rather than in DOM-bound components, selections expire reliably even while Teams injects new caption nodes.
- **Translation placement**: `Index.vue` exposes `translationSpacingPx`, a single constant that defines how far above the selection the translated phrase floats. Adjusting this value lets us react to future Teams layout changes while keeping the overlay below the selection rectangle’s z-index so the highlight stays visible.

## MS Teams-Specific Challenges

### Content Security Policy (CSP)

MS Teams has a strict CSP that blocks certain JavaScript operations. We've implemented workarounds:

1. **Trusted Types Polyfill** (`src/trusted-types-polyfill.ts`)
   - Intercepts Vue's policy creation attempts
   - Provides passthrough policies for pre-compiled templates
   
2. **Runtime-Only Vue Build** (`webpack.config.js`)
   - Uses `vue.runtime.esm-bundler.js` to avoid template compiler
   - All components use SFC (Single File Component) syntax

### Styling Challenges

MS Teams captions have dynamic styling that changes based on:
- User preferences (font size, color)
- Meeting state (presenting, recording, etc.)
- Caption position (top, bottom)

**Solution**: We track and apply the native caption CSS classes:
- Extract `className` from caption elements
- Pass `textClasses` to `Subtitle.vue`
- Apply classes to maintain visual consistency

### DOM Structure

MS Teams uses a complex DOM structure with:
- Shadow DOM in some areas
- Dynamically created/destroyed caption elements
- Multiple caption containers for different states

**Solution**: 
- Use `teleport` sparingly to avoid conflicts
- Keep components within `#subturtle-app` container
- Clean up disconnected dialogue elements

## File Structure

```
ms-team/
├── Index.vue              # Main component
├── initializer.ts         # Entry point
├── static.ts             # Constants (selectors, etc.)
└── components/
    └── Subtitle.vue      # Subtitle line component
```

## Development

### Testing in MS Teams

1. Build the extension: `npm run build`
2. Load the extension in Chrome
3. Join a Teams meeting
4. Enable live captions
5. Click on words to test translation

### Debugging

Enable console logs to see:
- `Subturtle: Activated for MS Teams` - Extension loaded
- `Subturtle: OpenWordDetail called` - Word clicked
- Caption detection and dialogue tracking

### Common Issues

**Modal not appearing:**
- Check console for CSP errors
- Verify `ConsoleCrane` is mounted in `Index.vue`
- Ensure Trusted Types polyfill is loaded

**Words not clickable:**
- Verify `pointer-events: auto` in CSS
- Check that `Word.vue` has `@click.stop` handler
- Ensure words are being rendered (inspect DOM)

**Styling mismatches:**
- Check that `textClasses` are being passed correctly
- Verify caption CSS classes are being extracted
- Inspect computed styles on caption elements

## Related Files

- **Trusted Types Polyfill**: `src/trusted-types-polyfill.ts`
- **Webpack Config**: `webpack.config.js` (Vue runtime alias)
- **Word Component**: `src/subtitle/components/specific/Word.vue`
- **ConsoleCrane Modal**: `src/console-crane/index.vue`
- **Marker Store**: `src/stores/marker.ts` (word selection state)
