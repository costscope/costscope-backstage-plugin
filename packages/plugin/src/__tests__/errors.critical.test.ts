import { buildError, isCritical } from './errors';
import { CostscopeErrorCodes } from './errorCodes';

describe('errors.isCritical heuristic and config', () => {
  it('default heuristic critical vs non-critical', () => {
    const base = { attempt: 1, correlationId: 'c', path: '/p', message: 'm' } as const;
    expect(isCritical(buildError({ ...base, code: CostscopeErrorCodes.HTTP_ERROR, status: 500 } as any))).toBe(true);
    expect(isCritical(buildError({ ...base, code: CostscopeErrorCodes.TIMEOUT } as any))).toBe(true);
    expect(isCritical(buildError({ ...base, code: CostscopeErrorCodes.NETWORK_ERROR } as any))).toBe(true);
    expect(isCritical(buildError({ ...base, code: CostscopeErrorCodes.VALIDATION_ERROR } as any))).toBe(false);
  });
  it('config override restricts classification', () => {
    const base = { attempt: 1, correlationId: 'c', path: '/p', message: 'm' } as const;
    const cfg = { statuses: [418], codes: [CostscopeErrorCodes.TIMEOUT] } as any;
    expect(isCritical(buildError({ ...base, code: CostscopeErrorCodes.HTTP_ERROR, status: 500 } as any), cfg)).toBe(false);
    expect(isCritical(buildError({ ...base, code: CostscopeErrorCodes.TIMEOUT } as any), cfg)).toBe(true);
  });
});
