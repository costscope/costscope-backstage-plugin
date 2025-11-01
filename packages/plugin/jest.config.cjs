const path = require('path');

// Load the root Jest config and override rootDir so '<rootDir>' references resolve to the
// repository root even when tests are executed from inside the package folder.
const rootConfig = require('../../jest.config.cjs');
module.exports = Object.assign({}, rootConfig, {
	rootDir: path.resolve(__dirname, '../../'),
	// Ensure TypeScript test files are handled reliably when running from the package
	// working directory by using ts-jest for .ts/.tsx and babel-jest for JS files.
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest',
		'^.+\\.(js|mjs)$': 'babel-jest',
	},
	moduleNameMapper: Object.assign({}, rootConfig.moduleNameMapper || {}, {
			'^@backstage/core-plugin-api$': '<rootDir>/packages/plugin/src/test-mocks/backstage-core-plugin-api-cjs.js',
			'^@backstage/plugin-catalog-react$': '<rootDir>/packages/plugin/src/test-mocks/plugin-catalog-react-cjs.js',
		// Tests sometimes import the scripts mock-server relative to the package; map to repo scripts
		"^../../scripts/mock-server.cjs$": '<rootDir>/scripts/mock-server.cjs',
		// Some tests import the contracts validators using a relative path; map to package source
		"^../../packages/contracts/src/validators$": '<rootDir>/packages/contracts/src/validators.ts',
			// Map ESM rule imports used in tests to CJS shims (support several relative patterns)
			// These mappings exist because some test files import the ESLint rule implementations
			// via relative ESM specifiers (".mjs"). Jest runs under CommonJS during collection
			// so we provide CJS shims or map to TypeScript sources that Jest can transform.
				// Exact relative import patterns used by tests (explicitly map .mjs specifiers to CJS shims)
				'^\.\./\.\./eslint-rules/no-barrel-wildcard\.mjs$': '<rootDir>/packages/plugin/src/test-mocks/no-barrel-wildcard.cjs.js',
				'^\.\./\.\./eslint-rules/no-direct-finops-service-id\.mjs$': '<rootDir>/packages/plugin/src/test-mocks/no-direct-finops-service-id.cjs.js',
				'^\.\./\.\./\.\./\.\./eslint-rules/no-internal-imports-in-ui\.mjs$': '<rootDir>/packages/plugin/src/test-mocks/no-internal-imports-in-ui.cjs.js',
				// Map generated finops validator imports (TS source or emitted .js) to CJS shim
				'^\.\./\./packages/contracts/src/generated/finops-zod(\.js)?$': '<rootDir>/packages/contracts/src/generated/finops-zod.ts',
				// When validators import the generated module using a relative specifier from within contracts,
				// map that local './generated/finops-zod.js' to the TS source so Jest will transform it.
				'^\\./generated\\/finops-zod(\\.js)?$': '<rootDir>/packages/contracts/src/generated/finops-zod.ts',
				'^\\.\\./\\.\\./packages\\/contracts\\/src\\/generated\\/finops-api$': '<rootDir>/packages/contracts/src/generated/finops-api.ts',

	}),
});
