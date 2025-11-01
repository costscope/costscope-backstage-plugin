// Minimal example app entrypoint (placeholder)
export default function main() {
	// Intentionally minimal — real example app can replace this file.
	return 'minimal-app placeholder';
}

// Keep a small side-effect so bundlers don't treeshake this file away in examples
if (typeof window !== 'undefined') {
	// feature flag for examples harness
	window.__MINIMAL_APP_PLACEHOLDER__ = true;
}
