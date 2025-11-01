// Import from the local contracts workspace using a relative path that Jest can resolve
import { verifyDescriptorHash } from '../../packages/contracts/src/validators';

// Basic integration test for verifyDescriptorHash using the real OPENAPI_SPEC_HASH from contracts.
// We assert the happy path (fragment match) and a negative path (random hash mismatch).

describe('verifyDescriptorHash (integration)', () => {
  it('matches when descriptor equals spec hash fragment (default 12 chars)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { OPENAPI_SPEC_HASH } = require('../../packages/contracts/src/generated/finops-api');
    const fragment: string = String(OPENAPI_SPEC_HASH).slice(0, 12);

    const result = verifyDescriptorHash({ descriptorHash: fragment });
    expect(result.matches).toBe(true);
    expect(result.comparedSpecFragment).toBe(fragment);
    expect(result.specHash).toBe(OPENAPI_SPEC_HASH);
  });

  it('does not match for a clearly different descriptor hash', () => {
    const result = verifyDescriptorHash({ descriptorHash: '000000000000' });
    expect(result.matches).toBe(false);
    expect(result.comparedSpecFragment).toHaveLength(12);
  });
});
