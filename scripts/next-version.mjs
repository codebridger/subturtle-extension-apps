import semanticRelease from "semantic-release";

try {
	const result = await semanticRelease(
		{ dryRun: true, ci: false },
		{ stdout: process.stderr, stderr: process.stderr }
	);
	if (result && result.nextRelease) {
		console.log(result.nextRelease.version);
	} else {
		console.log("NONE");
	}
} catch (err) {
	console.error(`Failed to compute next version: ${err.message}`);
	process.exit(1);
}
