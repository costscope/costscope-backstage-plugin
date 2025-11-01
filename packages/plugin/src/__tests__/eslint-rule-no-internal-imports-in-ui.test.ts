// Minimal smoke test for the no-internal-imports-in-ui ESLint rule to avoid empty suite
describe('eslint rule: no-internal-imports-in-ui (smoke)', () => {
	it('module loads (implementation tested elsewhere)', async () => {
		const mod = await import('../../../../eslint-rules/no-internal-imports-in-ui.mjs');
		expect(mod).toBeTruthy();
	});
});

