// Vue 3 SFC ambient declaration. The previous shim used Vue 2's default
// export shape, which made TS infer the bare `vue` module namespace at every
// .vue import site — see the 7 errors in src/console-crane/router.ts and
// src/popup/router.ts.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
