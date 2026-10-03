import { THEME_CLASS } from "../common/store/settings";

// Detects system theme and toggles the dark theme class on a given element.
// Uses the namespaced `subturtle-dark`, never a bare `dark` — see THEME_CLASS.
export function useSystemTheme(targetEl: HTMLElement) {
  const setThemeClass = (isDark: boolean) => {
    if (isDark) {
      targetEl.classList.add(THEME_CLASS.dark);
    } else {
      targetEl.classList.remove(THEME_CLASS.dark);
    }
  };

  // Initial check
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setThemeClass(isDark);

  // Listen for changes
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => setThemeClass(e.matches);
  mediaQuery.addEventListener("change", handler);

  // Cleanup (optional, for SPA navigation)
  return () => {
    mediaQuery.removeEventListener("change", handler);
  };
}
