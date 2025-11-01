import { RuleTester } from 'eslint';

// Polyfill structuredClone if missing
if (typeof (globalThis as any).structuredClone !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const tsParser = require('@typescript-eslint/parser');
import rule from '../../eslint-rules/no-barrel-wildcard.mjs';

describe('eslint rule: no-barrel-wildcard', () => {
  const tester = new RuleTester({ languageOptions: { parser: tsParser } });
  tester.run('no-barrel-wildcard', rule as any, {
    valid: [
      { filename: 'src/index.ts', code: "export { costscope } from './plugin';" },
      { filename: 'src/feature/index.ts', code: "export * from './internal';" }, // allowed in nested barrel
      { filename: 'src/not-index.ts', code: "export * from './whatever';" }, // non-root file
    ],
    invalid: [
  { filename: 'src/index.ts', code: "export * from './client';", errors: [{ messageId: 'noWildcard' }] },
  { filename: 'src/index.ts', code: "export * as client from './client';", errors: [{ messageId: 'noWildcard' }] },
    ],
  });
  it('passes RuleTester run (dummy)', () => {
    expect(true).toBe(true);
  });
});
