import { buildError, isCostscopeError } from './errors';
import { CostscopeErrorCodes } from './errorCodes';

describe('isCostscopeError', () => {
  it('returns true for branded CostscopeError', () => {
    const err = buildError({
      code: CostscopeErrorCodes.TIMEOUT,
      message: 'timeout',
      attempt: 1,
      correlationId: 'abc',
      path: '/x',
    });
    expect(isCostscopeError(err)).toBe(true);
  });
  it('returns false for generic Error', () => {
    const err = new Error('nope');
    expect(isCostscopeError(err)).toBe(false);
  });
  // Root export surface tested indirectly in integration tests; avoid heavy Backstage deps here.
});
