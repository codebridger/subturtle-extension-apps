// Unicode-safe base64 helpers for vue-router params. Lives in its own module
// (no router/store imports) so consumers like the popup's WordDetailModule
// can pull only what they need without dragging in the console-crane router
// — that import path causes a circular ESM init in non-console-crane bundles.
//
// `btoa` only accepts Latin1 — any non-Latin1 character (e.g. accented Latin,
// Persian, Chinese, emoji) throws InvalidCharacterError. We encode via
// TextEncoder so route params can carry any text.
//
// Undefined is a legitimate input — `toggleConsoleCrane(page)` calls this
// without explicit params for routes like "empty" / "settings". We round-trip
// it as an empty string so JSON.parse never sees an empty payload.
export function encodeRouteParams(params: any): string {
  const json = JSON.stringify(params);
  if (json === undefined) return "";
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decodeRouteParams<T = any>(data: string): T | undefined {
  if (data === "") return undefined;
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}
