import type { App } from "vue";

import Popper from "vue3-popper";
import PerfectScrollbar from "vue3-perfect-scrollbar";
import "pilotui/style.css";

/**
 * pilotui's own plugin (`app.use(pilotui)`) is deliberately NOT installed.
 * Besides registering the two globals below, its install runs
 * `appSetting.init()`, which is written for a pilotui *dashboard* that owns
 * the page. In a content script it acts on the HOST page:
 *   - it reads and writes `theme`, `menu`, `layout`, `rtlClass`, `animation`,
 *     `navbar`, `semidark` in the host's localStorage — `theme` is also the
 *     key next-themes sites (Product Hunt…) keep their own theme in;
 *   - it adds / removes `dark` on the host's `<body>`.
 * That turned Product Hunt dark on the next load once its `theme` key said
 * "dark". Components are imported individually anyway; their app store
 * (`useAppStore`, used for RTL in Input/Dropdown) keeps its defaults, which
 * are what `init` would have set on a clean page.
 *
 * So this replicates the install minus `init`: Dropdown and Tooltip render a
 * global `<Popper>`, and PerfectScrollbar backs the scroll areas.
 */
export const installPilotUI = (app: App) => {
  app.use(PerfectScrollbar);
  app.component("Popper", Popper);

  return app;
};
