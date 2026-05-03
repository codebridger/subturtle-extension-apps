// Unicode-safe base64 helpers for vue-router params. Lives in its own module
// (no router/store imports) so consumers like the popup's WordDetailModule
// can pull only what they need without dragging in the console-crane router
// — that import path causes a circular ESM init in non-console-crane bundles.
//
// `btoa` only accepts Latin1 — any non-Latin1 character (e.g. accented Latin,
// Persian, Chinese, emoji) throws InvalidCharacterError. We encode via
// TextEncoder so route params can carry any text.
export function encodeRouteParams(params: any): string {
  const bytes = new TextEncoder().encode(JSON.stringify(params));
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decodeRouteParams<T = any>(data: string): T {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}
