import { readFileSync, writeFileSync } from "node:fs";

const semver = process.argv[2];
if (!semver) {
	console.error("Usage: node scripts/sync-manifest-version.mjs <version>");
	process.exit(1);
}

const match = semver.match(/^(\d+\.\d+\.\d+)(?:-([a-z0-9]+)\.(\d+))?$/i);
if (!match) {
	console.error(`Unrecognized version format: ${semver}`);
	process.exit(1);
}
const [, base, channel, counter] = match;
const chromeVersion = channel ? `${base}.${counter}` : base;

const manifestPath = "static/manifest.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.version = chromeVersion;
if (channel) {
	manifest.version_name = semver;
} else {
	delete manifest.version_name;
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t") + "\n");
console.log(
	`Synced ${manifestPath} → version=${chromeVersion}${channel ? `, version_name=${semver}` : ""}`,
);
