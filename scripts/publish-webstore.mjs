#!/usr/bin/env node
/**
 * Publish one extension zip to the Chrome Web Store, through the v2 API.
 *
 * Ported from codebridger/kilogent-browser (scripts/publish-webstore.mjs), which shares this
 * store publisher and has already been run against the live API — the comments on `decide()`
 * and `publish()` below record what the real store answered, where it differs from its docs.
 *
 * WHY A SCRIPT AND NOT A MARKETPLACE ACTION. The whole exchange is four HTTP calls, and every one
 * of them has a failure that reads like a different failure: an upload refused because a review is
 * already pending looks like a bad package, and a version the store already has looks like an
 * outage. Each of those is decided HERE, by `decide()`, which has a self-test.
 *
 * IT IS SAFE TO RUN TWICE. The store refuses a version it already has, so the script asks first:
 * a zip whose version is not above what the store holds is a no-op, not a red run. That is what
 * lets the workflow re-run, and lets somebody dispatch it by hand for an old release.
 *
 * ONLY STABLE ZIPS BELONG HERE. A dev prerelease zip carries a four-part version (1.17.0.3) that
 * Chrome orders ABOVE the next stable 1.17.0 — once one reached the store, every later stable
 * upload would be refused as a downgrade. The workflow only ever hands this script a stable
 * release's zip; the self-test pins why.
 *
 * Environment:
 *   WEBSTORE_ACCESS_TOKEN   an OAuth token with scope https://www.googleapis.com/auth/chromewebstore
 *   WEBSTORE_PUBLISHER_ID   Developer Dashboard → Account → Publisher ID
 *   WEBSTORE_ITEM_ID        the extension's 32-letter id
 *   WEBSTORE_PUBLISH_TYPE   optional: DEFAULT_PUBLISH (live once approved) or STAGED_PUBLISH
 *                           (approved, then waits for a human to press Publish). Default: DEFAULT.
 *
 * Usage:
 *   node scripts/publish-webstore.mjs --zip <extension.zip>
 *   node scripts/publish-webstore.mjs --self-test
 *
 * Locally, a token for the service account the dashboard knows:
 *   gcloud auth print-access-token --impersonate-service-account=<sa-email> \
 *     --scopes=https://www.googleapis.com/auth/chromewebstore
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const API = "https://chromewebstore.googleapis.com";
const PUBLISH_TYPES = ["DEFAULT_PUBLISH", "STAGED_PUBLISH"];
/** What `publish` may answer that means "it went through". Anything else is a failure. */
const ACCEPTED_STATES = ["PENDING_REVIEW", "STAGED", "PUBLISHED", "PUBLISHED_TO_TESTERS"];
const POLL_MS = 5_000;
const POLL_LIMIT = 60; // five minutes; the store is usually done in seconds

/** Chrome's version format: one to four dot-separated integers. Anything else is refused. */
export function parseVersion(v) {
	if (typeof v !== "string" || !/^\d+(\.\d+){0,3}$/.test(v)) {
		throw new Error(`"${v}" is not a Chrome extension version (1–4 dot-separated integers).`);
	}
	return v.split(".").map(Number);
}

/** <0, 0, >0 — missing trailing parts count as zero, so 1.2 equals 1.2.0, as Chrome says. */
export function compareVersions(a, b) {
	const x = parseVersion(a);
	const y = parseVersion(b);
	for (let i = 0; i < 4; i++) {
		const d = (x[i] ?? 0) - (y[i] ?? 0);
		if (d !== 0) return d;
	}
	return 0;
}

/** The highest version a revision carries, or null. A staged rollout can list more than one. */
function revisionVersion(rev) {
	const versions = (rev?.distributionChannels ?? []).map((c) => c.crxVersion).filter(Boolean);
	return versions.sort(compareVersions).at(-1) ?? null;
}

/**
 * A fetchStatus response and the zip's version → what to do.
 *   { action: 'skip',    reason }   the store already has this version or a later one
 *   { action: 'blocked', reason }   a review is pending; the store will refuse an upload
 *   { action: 'upload' }
 */
export function decide(status, version) {
	if (status?.takenDown) {
		return { action: "blocked", reason: "the item has been taken down for a policy violation — see the Developer Dashboard." };
	}
	const submitted = status?.submittedItemRevisionStatus;
	const published = status?.publishedItemRevisionStatus;
	for (const [label, rev] of [["submitted", submitted], ["published", published]]) {
		const have = revisionVersion(rev);
		if (have && compareVersions(have, version) >= 0) {
			return { action: "skip", reason: `the store's ${label} revision is already ${have} (${rev.state}); this zip is ${version}.` };
		}
	}
	if (submitted?.state === "PENDING_REVIEW") {
		return {
			action: "blocked",
			reason:
				`${revisionVersion(submitted) ?? "an earlier version"} is still in review, and the store refuses an upload until it ` +
				"is decided. Wait for it, or cancel it in the Developer Dashboard, then re-run this workflow.",
		};
	}
	return { action: "upload" };
}

/** The version inside a zip's manifest.json — what the store will read, not what a tag says. */
export function zipVersion(zipPath) {
	const manifest = JSON.parse(execFileSync("unzip", ["-p", zipPath, "manifest.json"], { encoding: "utf8" }));
	parseVersion(manifest.version);
	if (manifest.version_name) {
		// sync-manifest-version.mjs writes version_name only for prereleases (see the header).
		throw new Error(`this zip is a prerelease (${manifest.version_name}); only stable releases go to the store.`);
	}
	return manifest.version;
}

function readEnv(env) {
	const need = ["WEBSTORE_ACCESS_TOKEN", "WEBSTORE_PUBLISHER_ID", "WEBSTORE_ITEM_ID"];
	const missing = need.filter((k) => !env[k]);
	if (missing.length) throw new Error(`missing ${missing.join(", ")}.`);
	const publishType = env.WEBSTORE_PUBLISH_TYPE || "DEFAULT_PUBLISH";
	if (!PUBLISH_TYPES.includes(publishType)) {
		throw new Error(`WEBSTORE_PUBLISH_TYPE is "${publishType}". Allowed: ${PUBLISH_TYPES.join(", ")}.`);
	}
	return {
		token: env.WEBSTORE_ACCESS_TOKEN,
		name: `publishers/${env.WEBSTORE_PUBLISHER_ID}/items/${env.WEBSTORE_ITEM_ID}`,
		publishType,
	};
}

async function call(token, method, url, body, contentType = "application/json") {
	const res = await fetch(url, {
		method,
		headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": contentType } : {}) },
		body,
	});
	const text = await res.text();
	let json;
	try {
		json = text ? JSON.parse(text) : {};
	} catch {
		json = { raw: text };
	}
	if (!res.ok) {
		// The API's own message is the useful part — "item not found", "publisher mismatch", the
		// manifest problem. Print it whole rather than a status code that names nothing.
		const err = new Error(`${method} ${url} → HTTP ${res.status}\n${JSON.stringify(json.error ?? json, null, 2)}`);
		err.reason = (json.error?.details ?? []).find((d) => d.reason)?.reason;
		throw err;
	}
	return json;
}

function summary(line) {
	console.log(line);
	if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, line + "\n");
}

async function publish(zipPath) {
	const { token, name, publishType } = readEnv(process.env);
	const version = zipVersion(zipPath);
	console.log(`zip:  ${path.basename(zipPath)} — version ${version}`);
	console.log(`item: ${name}`);

	const fetchStatus = () => call(token, "GET", `${API}/v2/${name}:fetchStatus`);
	const status = await fetchStatus();
	// Printed whole (minus the public key) because the documented shape and the real one have already
	// disagreed once; the next surprise should be readable from the run log, not guessed at.
	const { publicKey: _publicKey, ...shown } = status;
	console.log(`store status:\n${JSON.stringify(shown, null, 2)}`);
	const next = decide(status, version);
	if (next.action === "skip") {
		summary(`⏭️ Chrome Web Store: nothing to do — ${next.reason}`);
		return;
	}
	if (next.action === "blocked") throw new Error(next.reason);

	// A submission in review cannot always be seen coming: for an item under its FIRST review,
	// fetchStatus answers with nothing but its name and id. The upload is where the store says so.
	let up;
	try {
		up = await call(token, "POST", `${API}/upload/v2/${name}:upload`, fs.readFileSync(zipPath), "application/zip");
	} catch (err) {
		if (err.reason !== "NOT_UPDATEABLE") throw err;
		throw new Error(
			`a submission is still in review, and the store refuses any upload until it is decided. ${version} was ` +
				"not uploaded. Re-run this workflow for this release once the review is done, or cancel it in the dashboard.",
		);
	}
	let state = up.uploadState;
	for (let i = 0; state === "IN_PROGRESS" && i < POLL_LIMIT; i++) {
		await new Promise((r) => setTimeout(r, POLL_MS));
		state = (await fetchStatus()).lastAsyncUploadState;
	}
	if (state !== "SUCCEEDED") {
		throw new Error(`upload ended in state ${state}. Response:\n${JSON.stringify(up, null, 2)}`);
	}
	if (up.crxVersion && up.crxVersion !== version) {
		throw new Error(`the store read version ${up.crxVersion} from a zip whose manifest says ${version}.`);
	}
	console.log(`uploaded ${version}`);

	const res = await call(token, "POST", `${API}/v2/${name}:publish`, JSON.stringify({ publishType }));
	if (res.warningInfo) console.log(`warnings:\n${JSON.stringify(res.warningInfo, null, 2)}`);
	// THE DOCUMENTED `state` IS NOT ALWAYS THERE. Kilogent's first real submission answered 200 with
	// only name, itemId and a warning — and was in review. A 200 from publish IS the store accepting
	// the submission; only a state it names can contradict it.
	const submitted = res.state ?? "PENDING_REVIEW";
	if (!ACCEPTED_STATES.includes(submitted)) {
		throw new Error(`publish answered state ${submitted}.\n${JSON.stringify(res, null, 2)}`);
	}
	summary(`✅ Chrome Web Store: ${version} submitted (${publishType}) — now ${submitted}.`);
}

async function selfTest() {
	const assert = (await import("node:assert/strict")).default;
	const rev = (state, ...versions) => ({ state, distributionChannels: versions.map((v) => ({ crxVersion: v, deployPercentage: 100 })) });

	assert.equal(compareVersions("1.2", "1.2.0"), 0);
	assert.ok(compareVersions("1.10.0", "1.9.9") > 0, "numeric, not lexical");
	// Why dev zips must never reach the store: Chrome orders a dev build above the stable it precedes.
	assert.ok(compareVersions("1.17.0.3", "1.17.0") > 0);
	assert.throws(() => parseVersion("1.17.0-dev.3"), /not a Chrome extension version/);
	assert.throws(() => parseVersion("1.2.3.4.5"));

	// First API publish after a manual one, and the ordinary case.
	assert.equal(decide({}, "1.17.0").action, "upload");
	assert.equal(decide({ publishedItemRevisionStatus: rev("PUBLISHED", "1.16.0") }, "1.17.0").action, "upload");
	// Re-running for the same release is a no-op, not a failure.
	assert.equal(decide({ publishedItemRevisionStatus: rev("PUBLISHED", "1.17.0") }, "1.17.0").action, "skip");
	assert.equal(decide({ publishedItemRevisionStatus: rev("PUBLISHED", "1.18.0") }, "1.17.0").action, "skip");
	// Already submitted and in review: skip, not blocked — it is ours.
	assert.equal(decide({ submittedItemRevisionStatus: rev("PENDING_REVIEW", "1.17.0") }, "1.17.0").action, "skip");
	// An OLDER version in review blocks a newer upload.
	const blocked = decide(
		{
			publishedItemRevisionStatus: rev("PUBLISHED", "1.16.0"),
			submittedItemRevisionStatus: rev("PENDING_REVIEW", "1.16.1"),
		},
		"1.17.0",
	);
	assert.equal(blocked.action, "blocked");
	assert.match(blocked.reason, /1\.16\.1 is still in review/);
	// A rejected or cancelled submission does not block the next one.
	assert.equal(decide({ submittedItemRevisionStatus: rev("REJECTED", "1.16.1") }, "1.17.0").action, "upload");
	// A staged rollout lists several channels; the highest one counts.
	assert.equal(decide({ publishedItemRevisionStatus: rev("PUBLISHED", "1.16.0", "1.17.0") }, "1.17.0").action, "skip");
	assert.equal(decide({ takenDown: true }, "1.17.0").action, "blocked");

	assert.throws(() => readEnv({}), /missing WEBSTORE_ACCESS_TOKEN, WEBSTORE_PUBLISHER_ID, WEBSTORE_ITEM_ID/);
	const env = { WEBSTORE_ACCESS_TOKEN: "t", WEBSTORE_PUBLISHER_ID: "p", WEBSTORE_ITEM_ID: "i" };
	assert.equal(readEnv(env).name, "publishers/p/items/i");
	assert.equal(readEnv(env).publishType, "DEFAULT_PUBLISH");
	assert.throws(() => readEnv({ ...env, WEBSTORE_PUBLISH_TYPE: "staged" }), /Allowed/);

	// THE STORE'S OWN LIMITS, checked here because the store checks them only at upload — after the
	// release is cut. A 140-character description made Kilogent's first upload bounce and cost a
	// whole extra release.
	const manifest = JSON.parse(fs.readFileSync(new URL("../static/manifest.json", import.meta.url), "utf8"));
	assert.ok(manifest.name.length <= 75, `manifest name is ${manifest.name.length} characters; the store allows 75`);
	assert.ok(
		manifest.description.length <= 132,
		`manifest description is ${manifest.description.length} characters; the store refuses more than 132`,
	);

	console.log("✅ publish-webstore: version order, skip/block/upload decisions, env validation and the store manifest limits hold.");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
if (isMain) {
	const args = process.argv.slice(2);
	try {
		if (args.includes("--self-test")) {
			await selfTest();
		} else {
			const i = args.indexOf("--zip");
			const zip = i >= 0 ? args[i + 1] : undefined;
			if (!zip || !fs.existsSync(zip)) throw new Error("usage: publish-webstore.mjs --zip <extension.zip> | --self-test");
			await publish(path.resolve(zip));
		}
	} catch (err) {
		console.error(`✗ ${err.message}`);
		if (process.env.GITHUB_ACTIONS) console.log(`::error::Chrome Web Store: ${String(err.message).split("\n")[0]}`);
		process.exit(1);
	}
}
