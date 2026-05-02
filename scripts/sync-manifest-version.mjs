import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];
if (!version) {
	console.error("Usage: node scripts/sync-manifest-version.mjs <version>");
	process.exit(1);
}

const manifestPath = "static/manifest.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.version = version;
writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t") + "\n");
console.log(`Synced ${manifestPath} to ${version}`);
