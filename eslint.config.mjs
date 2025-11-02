// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import backstage from '@backstage/eslint-plugin';
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';

import noBarrelWildcard from './eslint-rules/no-barrel-wildcard.mjs';
import noDirectErrorCodes from './eslint-rules/no-direct-error-codes.mjs';
import noDirectFinopsServiceId from './eslint-rules/no-direct-finops-service-id.mjs';
import noInternalImportsInUi from './eslint-rules/no-internal-imports-in-ui.mjs';
import noRawContractsImport from './eslint-rules/no-raw-contracts-import.mjs';
import noRuntimeConsole from './eslint-rules/no-runtime-console.mjs';

export default [{
ignores: [
  // Ignore only declaration files in dist outputs, not source .d.ts which hold some internal type augmentations
  'dist/**/*.d.ts',
  'dist-types/**/*.d.ts',
  '**/*.test.ts',
  '**/*.test.tsx',
  // Ignore test shims placed under src/__tests__ (not part of tsconfig project)
  'src/__tests__/**',
  // Ignore Storybook stories from typed linting (not in tsconfig project)
  'src/**/*.stories.ts',
  'src/**/*.stories.tsx',
  '**/plugin.new.*',
  'eslint-rules/**',
  'dist/**',
  'dist-types/**',
  'storybook-static/**',
  'dist-analyze/**',
  'temp/**',
'tmp/**',
],
}, {
files: ['**/src/**/*.{ts,tsx}','!**/src/**/*.test.ts','!**/src/**/*.test.tsx'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: tsParser,
    // Default: no project program build (faster, no TS version support warning spam perceived as hang).
    // Enable full type-aware lint by running with ESLLINT_TYPES=1 (scripts lint:types / lint:types:fix).
    parserOptions: process.env.ESLINT_TYPES === '1'
      ? { project: ['./packages/plugin/tsconfig.json'], tsconfigRootDir: process.cwd() }
      : {},
    globals: { setTimeout: 'readonly', clearTimeout: 'readonly', console: 'readonly' },
  },
plugins: {
    react: reactPlugin,
    'react-hooks': reactHooks,
import: importPlugin,
    '@backstage': backstage,
    security,
'@typescript-eslint': tseslint,
internal: { rules: { 'no-direct-finops-service-id': noDirectFinopsServiceId, 'no-direct-error-codes': noDirectErrorCodes, 'no-barrel-wildcard': noBarrelWildcard, 'no-runtime-console': noRuntimeConsole, 'no-raw-contracts-import': noRawContractsImport, 'no-internal-imports-in-ui': noInternalImportsInUi } },
  },
  settings: { react: { version: 'detect' } },
  rules: {
    ...js.configs.recommended.rules,
    ...reactPlugin.configs.recommended.rules,
// TS plugin rules disabled temporarily pending upgrade
    'react/prop-types': 'off',
'@typescript-eslint/explicit-module-boundary-types': 'off',
'@typescript-eslint/ban-ts-comment': 'off',
'import/order': ['warn', { 'newlines-between': 'always', groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'], alphabetize: { order: 'asc', caseInsensitive: true } }],
// '@typescript-eslint/no-explicit-any': 'off', // plugin disabled
// TypeScript already reports undefined symbols; disable base rule to avoid DOM/global false positives
'no-undef': 'off',
// Disable base rule (incorrect on TS) and use TS-aware variant.
'no-unused-vars': 'off',
// Disabled temporarily due to upstream eslint scope API change incompatibility; restore once plugin updates.
'@typescript-eslint/no-unused-vars': 'off',
'internal/no-direct-finops-service-id': 'error',
'internal/no-direct-error-codes': 'error',
'internal/no-barrel-wildcard': 'error',
// Tighten: disallow direct console.* in src — use central logger instead. Custom rule excludes logger & mock server.
'internal/no-runtime-console': 'error',
'internal/no-raw-contracts-import': 'error',
'internal/no-internal-imports-in-ui': 'error',
// Disabled due to TS 5.4+ parser scope API change causing runtime error; revisit when plugin updates support
// '@typescript-eslint/no-unsafe-declaration-merging': 'off',
// Enforce official support only for MUI v5; forbid legacy v4 package imports
'no-restricted-imports': ['error', {
  "paths": [
    { name: '@material-ui/core', message: 'MUI v4 is unsupported; use @mui/material' },
    { name: '@material-ui/styles', message: 'MUI v4 is unsupported; use @mui/material/styles' },
    { name: '@material-ui/icons', message: 'MUI v4 is unsupported; use @mui/icons-material' }
  ],
  "patterns": [
    { group: ['@material-ui/*'], message: 'MUI v4 is unsupported; migrate to MUI v5 (@mui/*)' }
  ]
}],
// Base rule off to avoid double-reporting; custom rule handles policy granularity.
'no-console': 'off',
// Enable a subset of security plugin rules (others left default/off to avoid noise in frontend bundle)
'security/detect-eval-with-expression': 'error',
'security/detect-new-buffer': 'warn',
'security/detect-buffer-noassert': 'warn',
// Some security rules rely on legacy ESLint APIs not exposed in flat config; disable those that error.
'security/detect-child-process': 'off',
'security/detect-disable-mustache-escape': 'off',
'security/detect-non-literal-fs-filename': 'off',
'security/detect-non-literal-regexp': 'off',
'security/detect-non-literal-require': 'off',
'security/detect-object-injection': 'off',
'security/detect-possible-timing-attacks': 'off',
'security/detect-pseudoRandomBytes': 'off',
  },
}, // Override: allow literals in mock server (development helper)
{
  files: ['scripts/mock-server.ts'],
  rules: { 'internal/no-direct-finops-service-id': 'off' },
}, // Scripts and Node helpers (JS/TS): restrict unsafe child_process usage and shell invocation
{
  files: [
    'scripts/**/*.{js,cjs,mjs,ts}',
    'packages/**/scripts/**/*.{js,cjs,mjs,ts}',
    'tests-e2e/**/*.cjs',
  ],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'script',
    globals: { process: 'readonly', console: 'readonly', require: 'readonly', module: 'readonly', __dirname: 'readonly' },
  },
  rules: {
    // Forbid shell-based exec; prefer execFile/execFileSync with explicit args
    'no-restricted-syntax': [
      'error',
      { selector: 'CallExpression[callee.name="execSync"]', message: 'Avoid execSync; use execFileSync with explicit args.' },
      { selector: 'CallExpression[callee.property.name="execSync"]', message: 'Avoid execSync; use execFileSync with explicit args.' },
  // NOTE: We intentionally do not restrict generic `.exec(...)` calls to avoid false positives (e.g., RegExp#exec).
      // Avoid invoking shells directly; pass program and args instead
      { selector: 'CallExpression[callee.name=/^spawn(Sync)?$/][arguments.0.value=/^(bash|sh)$/]', message: 'Avoid spawning shells; run the target binary with args.' },
      { selector: 'CallExpression[callee.property.name=/^spawn(Sync)?$/][arguments.0.value=/^(bash|sh)$/]', message: 'Avoid spawning shells; run the target binary with args.' },
      // Avoid shell: true in spawn/spawnSync options
      { selector: 'CallExpression[callee.name=/^spawn(Sync)?$/] ObjectExpression > Property[key.name="shell"] > Literal[value=true]', message: 'Avoid shell:true; pass program and args to spawn.' },
      { selector: 'CallExpression[callee.property.name=/^spawn(Sync)?$/] ObjectExpression > Property[key.name="shell"] > Literal[value=true]', message: 'Avoid shell:true; pass program and args to spawn.' },
    ],
    // Allow redeclaration of built-in globals (e.g., __dirname shims in ESM scripts)
    'no-redeclare': ['error', { builtinGlobals: false }],
  },
}, // Declaration files: relax unused vars (common for augmentation / public API shape), suppress no-undef noise
{
  files: ['**/*.d.ts'],
  rules: { 'no-unused-vars': 'off', '@typescript-eslint/no-unused-vars': 'off', 'no-undef': 'off', 'import/order': 'off' }
}, // Storybook stories: allow unused props/imports (demo scenarios) but keep our internal custom rules
{
  files: ['**/*.stories.tsx'],
  rules: { '@typescript-eslint/no-unused-vars': 'off', 'no-unused-vars': 'off' }
}, {
  files: ['scripts/**/*.ts'],
  languageOptions: { parserOptions: { project: null } },
}, ...storybook.configs["flat/recommended"]];
