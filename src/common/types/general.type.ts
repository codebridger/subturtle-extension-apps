import { App } from "vue";

export type Theme = "auto" | "light" | "dark";

export type Dictionary = {
  [key: string]: any;
};

export interface SubtitleBondingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface AppInitializer {
  website: {
    host: string;
    path: string;
  };
  component: any;
  start: (app: App) => Promise<App>;
}
