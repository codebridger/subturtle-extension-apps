/**
 * Vazirmatn for right-to-left text (E-09, UX spec "Right-to-left text").
 *
 * The font ships in the extension (`static/assets/fonts`, OFL licence next to
 * it), not from Google Fonts: content scripts run on any site, and a font
 * request to a third party from every page is not something we want.
 *
 * The @font-face is added from script because only `chrome.runtime.getURL`
 * knows the extension's URL; the `__MSG_@@extension_id__` trick works only in
 * manifest-declared CSS, and our CSS is injected by the bundles.
 *
 * The family name is namespaced ("Subturtle Vazirmatn") so it can never clash
 * with a host page's own Vazirmatn, and `unicode-range` limits it to the
 * Arabic-script blocks: Latin text in the same element keeps its usual font.
 * The CSS that uses it is in tailwind.css (`[dir="rtl"]` inside our scope).
 */
export const RTL_FONT_FAMILY = "Subturtle Vazirmatn";
const STYLE_ID = "subturtle-rtl-font";

const ARABIC_SCRIPT_RANGE =
  "U+0600-06FF, U+0750-077F, U+0870-089F, U+08A0-08FF, U+200C-200F, U+FB50-FDFF, U+FE70-FEFF";

export function fontFaceCss(urlFor: (path: string) => string): string {
  const face = (file: string, weight: number) =>
    `@font-face{font-family:"${RTL_FONT_FAMILY}";` +
    `src:url("${urlFor(`/assets/fonts/${file}`)}") format("truetype");` +
    `font-weight:${weight};font-style:normal;font-display:swap;` +
    `unicode-range:${ARABIC_SCRIPT_RANGE};}`;
  return [
    face("Vazirmatn-Regular.ttf", 400),
    // One bold file covers 500 to 900, so headings do not fall back.
    face("Vazirmatn-SemiBold.ttf", 600),
  ].join("\n");
}

/** Add the @font-face once per document. Safe to call from every bundle. */
export function ensureRtlFont(doc: Document = document): void {
  try {
    if (!doc?.head || doc.getElementById(STYLE_ID)) return;
    if (typeof chrome === "undefined" || !chrome.runtime?.getURL) return;
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = fontFaceCss((p) => chrome.runtime.getURL(p));
    doc.head.appendChild(style);
  } catch (_e) {
    // An invalidated extension context (after an update) has no runtime URL.
  }
}
