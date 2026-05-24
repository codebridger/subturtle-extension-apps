import type { Router } from "vue-router";

// Decouples the console-crane store from the router singleton.
//
// The store needs `router.push` at call-time, but statically importing
// `./router` drags the page components into a circular ESM init:
//   store -> router -> word-detail -> SaveWordSectionV2 -> store
// router.ts reads each route's `component` default export at module-eval time,
// so when that chain runs while a page is still initialising it TDZ-crashes
// ("Cannot access '__WEBPACK_DEFAULT_EXPORT__' before initialization").
//
// Routing through this leaf module (it imports only a type, erased at compile)
// breaks the cycle without code-splitting: router.ts registers the instance
// here at bootstrap, and the store reads it lazily. Avoid `import("./router")`
// for this — a dynamic import becomes a separate webpack chunk that cannot be
// fetched from a content-script context (wrong public path + page CSP).
let _router: Router | null = null;

export function setConsoleCraneRouter(router: Router): void {
  _router = router;
}

export function getConsoleCraneRouter(): Router | null {
  return _router;
}
