// Detects system theme and toggles the 'dark' class on a given element
export function useSystemTheme(targetEl: HTMLElement) {
  const setThemeClass = (isDark: boolean) => {
    if (isDark) {
      targetEl.classList.add("dark");
    } else {
      targetEl.classList.remove("dark");
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
