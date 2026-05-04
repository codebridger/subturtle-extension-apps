import { App } from "vue";

export const CONSOLE_CRANE_ROOT_ID = "subturtle-console-crane-root";

export async function initConsoleCraneApp(app: App): Promise<App> {
  let root = document.getElementById(CONSOLE_CRANE_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = CONSOLE_CRANE_ROOT_ID;
    root.classList.add("subturtle-scope");
    root.style.position = "fixed";
    root.style.zIndex = "2147483647";
    root.style.top = "0";
    root.style.left = "0";
    root.style.width = "0";
    root.style.height = "0";
    document.body.appendChild(root);
  }

  app.mount(root);
  return app;
}
