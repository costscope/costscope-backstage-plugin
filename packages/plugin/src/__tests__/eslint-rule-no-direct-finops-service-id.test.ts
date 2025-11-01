import { RuleTester } from 'eslint';

// Polyfill structuredClone for environments where Jest + jsdom might not expose it
// (ESLint RuleTester in v9 uses structuredClone internally)
if (typeof (globalThis as any).structuredClone !== 'function') {
  (globalThis as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const tsParser = require('@typescript-eslint/parser');
import rule from '../../eslint-rules/no-direct-finops-service-id.mjs';

describe('eslint rule: no-direct-finops-service-id', () => {
  const tester = new RuleTester({ languageOptions: { parser: tsParser } });
  tester.run('no-direct-finops-service-id', rule as any, {
    valid: [
  { code: "import { DEFAULT_SERVICE_ID } from './constants';\nconst x = DEFAULT_SERVICE_ID;" },
  { filename: 'src/constants.ts', code: "export const DEFAULT_SERVICE_ID = 'finops-insights';" },
  { filename: 'src/constants/index.ts', code: "export const DEFAULT_SERVICE_ID = 'finops-insights';" },
    ],
    invalid: [
      { code: "const svc = 'finops-insights';", errors: [{ messageId: 'noDirect' }] },
      { code: 'const a = `finops-insights`;', errors: [{ messageId: 'noDirect' }] },
    ],
  });
  it('passes RuleTester run (dummy)', () => {
    expect(true).toBe(true);
  });
});
