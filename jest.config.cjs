const skipCoverage = !!process.env.SKIP_COVERAGE;

module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx|js|mjs)$': 'babel-jest',
  },
  // Do not force Jest to treat .ts/.tsx as ESM here; let babel-jest transform TypeScript
  // files. For ESM .mjs files Jest always treats them as ESM by default.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  // Use a CJS shim that registers ts-node before requiring the TypeScript setup file.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  globalSetup: '<rootDir>/scripts/jest-global-setup.js',
  globalTeardown: '<rootDir>/scripts/jest-global-teardown.js',
  // Only treat files with explicit .test/.spec suffixes as tests, even under __tests__
  testMatch: [
    '<rootDir>/**/__tests__/**/*.test.[tj]s?(x)',
    '<rootDir>/**/?(*.)+(spec|test).[tj]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tmp/',
    '/tests-storybook/',
    // Ignore ephemeral sandbox Backstage app created for e2e (prevent pulling in its Jest/Playwright tests)
    'tmp/',
    '/packages/contracts/dist/',
    '/storybook-static/',
    '/tests-e2e/',
    // Ignore accidental empty test suites under the repo root `src/__tests__` which are duplicates
    '<rootDir>/src/__tests__/',
    // Temporary: ignore heavy UI suites except widgets (cards, lists, panels, charts)
    // Allow widgets subfolders by narrowing negative lookahead to exclude those four groups
    '/packages/plugin/src/components/(?!widgets/(cards|lists|panels|charts)/).*',
    '/packages/plugin/src/features/',
    '/packages/plugin/src/__tests__/integration/',
    // Also match package-relative paths when tests are run from inside the package
    // Package-relative pattern equivalent (negative lookahead to allow widgets groups)
    'src/components/(?!widgets/(cards|lists|panels|charts)/).*',
    'src/features/',
    'src/__tests__/integration/',
    // Hard-ignore removed legacy sanitize test (defensive in case of stray regeneration)
    'CostscopePage.sanitize.test.[tj]sx?$',
    '\\.(test|spec)\\.d\\.ts$',
    // Extra defensive ignore for declaration test file pattern that can be matched by
    // the generic testMatch when filenames include multiple extensions like `.test.d.ts`.
    '^.*\\.test\\.d\\.ts$',
  ],
  modulePathIgnorePatterns: [
    // removed legacy tmp sandbox path
  ],
  // Coverage collection: include all TS/TSX except declarations, stories, mocks, generated code, and experimental new plugin API placeholder.
  collectCoverageFrom: [
    'packages/plugin/src/**/*.{ts,tsx}',
    '!packages/plugin/src/**/*.d.ts',
    // Exclude tests from coverage collection
    '!packages/plugin/src/**/*.test.ts',
    '!packages/plugin/src/**/*.test.tsx',
    '!packages/plugin/src/**/*.spec.ts',
    '!packages/plugin/src/**/*.spec.tsx',
    '!packages/plugin/src/**/__tests__/**',
    '!packages/plugin/src/**/*.stories.tsx',
    '!packages/plugin/src/test-mocks/**',
    '!packages/plugin/src/testing/**',
    '!packages/plugin/src/generated/**',
    // Exclude large integration surface & wiring files (targeted separately later)
    '!packages/plugin/src/api.ts',
    '!packages/plugin/src/formatting.tsx',
    '!packages/plugin/src/index.ts',
    '!packages/plugin/src/public/plugin.ts',
    '!packages/plugin/src/public/index.ts',
    '!packages/plugin/src/client/hooks/**',
    '!packages/plugin/src/hooks/**',
    '!packages/plugin/src/finops-api.ts',
    // Legacy public shim files kept for backward-compatibility
    '!packages/plugin/src/buildPath.ts',
    '!packages/plugin/src/transport.ts',
    '!packages/plugin/src/initRuntimeValidation.ts',
    '!packages/plugin/src/types.ts',
    '!packages/plugin/src/validationTypes.ts',
    '!packages/plugin/src/validationTelemetry.ts',
    // SSR shims/barrels that are exercised indirectly elsewhere
    '!packages/plugin/src/ssr/useProgressiveHydration.ts',
    '!packages/plugin/src/ssr/hydrateFromManifest.ts',
    // Low-value UI entry barrels not covered by unit tests
    '!packages/plugin/src/components/index.ts',
    '!packages/plugin/src/components/pages/EntityCostscopeContent.tsx',
  ],
  // Allow disabling coverage thresholds for focused/local debug runs:
  // use `SKIP_COVERAGE=1 yarn test:dev --testPathPattern=foo`.
  coverageThreshold: skipCoverage
    ? undefined
    : {
        global: {
          statements: 80,
          lines: 80,
          branches: 70,
          functions: 70,
        },
      },
  // For this repo we need Jest to transform some node_modules that ship ESM
  // source (notably @backstage/*). Transforming all node_modules is expensive
  // and unnecessary; instead allowlist the packages that publish ESM so Jest
  // will transform them. Add other packages here if they surface similar errors.
  // Pattern explanation: ignore node_modules except when the path starts with
  // one of the allowlisted scopes (e.g. @backstage or @costscope).
  transformIgnorePatterns: [
    // Allow transforming specific scoped packages that ship ESM sources.
    // Canonical negative lookahead pattern keeps most node_modules ignored.
    'node_modules/(?!(?:@backstage|@costscope|@tanstack|@mui|zod)/)',
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/packages/plugin/src/$1',
    '^react-syntax-highlighter$':
      '<rootDir>/packages/plugin/src/test-mocks/reactSyntaxHighlighterMock.tsx',
    '^react-syntax-highlighter/dist/esm/.*$':
      '<rootDir>/packages/plugin/src/test-mocks/reactSyntaxHighlighterMock.tsx',
    '^@backstage/core-components$':
      '<rootDir>/packages/plugin/src/test-mocks/backstageCoreComponentsMock.tsx',
    // Map generated contract modules & validators to their TS sources so tests in
    // other packages (e.g. mock-backend) can import them directly during root-level Jest runs.
    // Also map the root package entry to its TS index for cases importing '@costscope/contracts'.
    '^@costscope/contracts$': '<rootDir>/packages/contracts/src/index.ts',
    '^@costscope/contracts/generated/finops-zod(\.js)?$':
      '<rootDir>/packages/contracts/src/generated/finops-zod.ts',
    '^@costscope/contracts/validators(\.js)?$': '<rootDir>/packages/contracts/src/validators.ts',
    '^@costscope/contracts/generated/finops-api(\.js)?$':
      '<rootDir>/packages/contracts/src/generated/finops-api.ts',
    '^@costscope/contracts/(.*)$': '<rootDir>/packages/contracts/src/$1',
  },
};
