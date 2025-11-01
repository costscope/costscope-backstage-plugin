import { mapError } from './errors';
import { CostscopeErrorCodes } from './errorCodes';

describe('errors (negative)', () => {
  it('maps AbortError to TIMEOUT', () => {
    const abortErr = new DOMException('Aborted', 'AbortError');
  const mapped = mapError(abortErr, { path: '/x', attempt: 1, correlationId: 'c', timeoutMs: 1000 });
    expect(mapped.code).toBe(CostscopeErrorCodes.TIMEOUT);
    expect(mapped.__costscope).toBe(true);
  });
});
