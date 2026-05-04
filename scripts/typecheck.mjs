// Wrapper around `tsc --noEmit` that filters out two classes of upstream
// errors we can't fix from this repo:
//
// 1. node_modules/pilotui/* — pilotui's package.json points `exports.types`
//    at raw TS source, so tsc follows into pilotui/src/vue.ts which has a
//    mismatched plugin signature against vue3-perfect-scrollbar.
//
// 2. ../dashboard-app/* — src/stores/profile.ts imports types from the
//    sibling dashboard-app repo (see CLAUDE.md). dashboard-app's frontend
//    types re-export from server-side TS that depends on mongoose / stripe
//    / @modular-rest/server — installed in dashboard-app's own
//    node_modules but not in ours. CI clones dashboard-app without
//    installing its deps; locally maintainers usually have them. Either
//    way, those errors aren't actionable from here.
//
// On clean runs we print only a short summary so GitHub's log parser
// doesn't surface the suppressed errors as red `Error:` annotations.
// Real errors in our own code still print the full tsc output and fail.
import { spawnSync } from "node:child_process";

const SUPPRESSED_PATH_FRAGMENTS = [
  "node_modules/pilotui/",
  "dashboard-app/",
];

const FILE_AT_ERROR = /([^\s:]+\.(?:ts|tsx|d\.ts|vue))\(\d+,\d+\):\s*error\s+TS\d+/;

function isSuppressed(line) {
  const m = line.match(FILE_AT_ERROR);
  if (!m) return false;
  return SUPPRESSED_PATH_FRAGMENTS.some((frag) => m[1].includes(frag));
}

const r = spawnSync("npx", ["tsc", "--noEmit"], { encoding: "utf8" });
const output = (r.stdout || "") + (r.stderr || "");

const allErrorLines = output.split("\n").filter((l) => /error TS\d+/.test(l));
const realErrorLines = allErrorLines.filter((l) => !isSuppressed(l));
const suppressedCount = allErrorLines.length - realErrorLines.length;

if (realErrorLines.length > 0) {
  // Print full tsc output so the user sees error context, then a summary.
  console.error(output);
  console.error(
    `\n${realErrorLines.length} type error(s) in our code. Fix above.`
  );
  if (suppressedCount > 0) {
    console.error(
      `(${suppressedCount} additional error(s) suppressed from pilotui / dashboard-app — see scripts/typecheck.mjs.)`
    );
  }
  process.exit(1);
}

const suffix =
  suppressedCount > 0
    ? ` (${suppressedCount} upstream error(s) from pilotui / dashboard-app suppressed — see scripts/typecheck.mjs)`
    : "";
console.log(`typecheck clean.${suffix}`);
process.exit(0);
