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
// Real errors in our own code still fail the check.
import { spawnSync } from "node:child_process";

const SUPPRESSED_PATH_FRAGMENTS = [
  "node_modules/pilotui/",
  "dashboard-app/",
];

// Extracts the file path that prefixes a tsc error line. The line is
// always `<path>(<line>,<col>): error TS<num>:` (non-pretty mode), but
// CI loggers may prepend tokens like "Error: " — we match anywhere.
const FILE_AT_ERROR = /([^\s:]+\.(?:ts|tsx|d\.ts|vue))\(\d+,\d+\):\s*error\s+TS\d+/;

function isSuppressed(line) {
  const m = line.match(FILE_AT_ERROR);
  if (!m) return false;
  return SUPPRESSED_PATH_FRAGMENTS.some((frag) => m[1].includes(frag));
}

const r = spawnSync("npx", ["tsc", "--noEmit"], { encoding: "utf8" });
const output = (r.stdout || "") + (r.stderr || "");

const errorLines = output
  .split("\n")
  .filter((l) => /error TS\d+/.test(l))
  .filter((l) => !isSuppressed(l));

if (errorLines.length > 0) {
  console.error(output);
  process.exit(1);
}

// Soft suppressed errors still get printed (so a future maintainer notices)
// but don't fail the check.
if (output.trim()) console.log(output.trim());
process.exit(0);
