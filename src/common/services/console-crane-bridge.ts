import type { ConsolePage } from "../../console-crane/types";

// In-page event bridge between feature bundles (subtitle, nibble) and the
// console-crane content script. All Subturtle content scripts share the same
// extension isolated world per tab, so window CustomEvents reach across them.
const OPEN_EVENT = "subturtle:console-crane:open";
const STATE_EVENT = "subturtle:console-crane:state";
const REQUEST_STATE_EVENT = "subturtle:console-crane:request-state";

export interface OpenPayload {
  page: ConsolePage;
  params?: Record<string, any>;
  active?: boolean;
}

export interface StatePayload {
  isActive: boolean;
}

export function emitOpen(payload: OpenPayload): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: payload }));
}

export function onOpen(handler: (payload: OpenPayload) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<OpenPayload>).detail);
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}

export function emitState(payload: StatePayload): void {
  window.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: payload }));
}

export function onState(handler: (payload: StatePayload) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<StatePayload>).detail);
  window.addEventListener(STATE_EVENT, listener);
  return () => window.removeEventListener(STATE_EVENT, listener);
}

export function requestState(): void {
  window.dispatchEvent(new Event(REQUEST_STATE_EVENT));
}

export function onRequestState(handler: () => void): () => void {
  window.addEventListener(REQUEST_STATE_EVENT, handler);
  return () => window.removeEventListener(REQUEST_STATE_EVENT, handler);
}
