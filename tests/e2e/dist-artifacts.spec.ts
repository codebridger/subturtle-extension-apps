import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Pure node test — no browser. Pins the build output shape so a
// stray webpack code-splitting flag (numbered chunks) or a missing
// entry can't slip past CI.
test.describe("dist build artifacts", () => {
  const dist = path.resolve(process.cwd(), "dist");

  test("contains every required entry file", () => {
    const required = [
      "background.js",
      "main.js",
      "nibble.js",
      "console-crane.js",
      "popup.js",
      "popup.html",
      "manifest.json",
      "assets",
    ];
    for (const f of required) {
      expect(fs.existsSync(path.join(dist, f)), `dist/${f} missing`).toBe(true);
    }
  });

  test("does not produce orphan numeric chunks", () => {
    const files = fs.readdirSync(dist);
    const orphans = files.filter((f) => /^\d+\.js$/.test(f));
    expect(orphans).toEqual([]);
  });

  test("manifest declares the four expected content_scripts", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(dist, "manifest.json"), "utf8")
    );
    expect(manifest.manifest_version).toBe(3);

    const scripts = (manifest.content_scripts ?? []).flatMap(
      (b: any) => b.js ?? []
    );
    expect(scripts).toContain("main.js");
    expect(scripts).toContain("nibble.js");
    expect(scripts).toContain("console-crane.js");
  });
});
