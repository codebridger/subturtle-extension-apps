import { startMarking } from "../../stores/marker";

export function registerGlobalEvents() {
  document.addEventListener("keydown", startMarking);
}

export function unregisterGlobalEvents() {}
