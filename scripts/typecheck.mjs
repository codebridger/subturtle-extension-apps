// Wrapper around `tsc --noEmit` that filters out one known third-party
// source-TS error. pilotui's package.json points `exports.types` at raw
// TS source files, so tsc follows into `node_modules/pilotui/src/vue.ts`
// which has a mismatched plugin signature against `vue3-perfect-scrollbar`.
// Not our code to fix; we suppress just this file path so a real
// regression in our own code still fails the check.
import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsc", "--noEmit"], { encoding: "utf8" });
const output = (r.stdout || "") + (r.stderr || "");

const errorLines = output
  .split("\n")
  .filter((l) => /error TS\d+/.test(l))
  .filter((l) => !l.startsWith("node_modules/pilotui/"));

if (errorLines.length > 0) {
  // Print the raw tsc output so the user sees the full error context.
  console.error(output);
  process.exit(1);
}

// Soft pilotui errors still get printed (so a future maintainer notices)
// but don't fail the check.
if (output.trim()) console.log(output.trim());
process.exit(0);
