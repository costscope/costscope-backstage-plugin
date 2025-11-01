import { CostscopeClient } from './client';

// Snapshot test for VALIDATION_ERROR shape including schemaHash.

describe('VALIDATION_ERROR snapshot', () => {
  afterEach(() => {
    delete (process as any).env.COSTSCOPE_RUNTIME_VALIDATE;
  });

  it('includes schemaHash and stable shape', async () => {
    (process as any).env.COSTSCOPE_RUNTIME_VALIDATE = 'true';
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: { fetch: async () => ({ ok: true, json: async () => ({ invalid: true }) }) },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, retry: { maxAttempts: 1 } });
    let err: any;
    try {
      await client.getOverview('P1D');
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.schemaHash).toMatch(/^[0-9a-f]{8}$/);
    // Snapshot only a subset with deterministic message prefix and normalized dynamic pieces.
    const subset = {
      code: err.code,
      attempt: err.attempt,
      path: err.path,
      schemaHash: '<hash>',
      // Normalize message to avoid zod version specific diffs beyond first sentence
      message: String(err.message).replace(/Schema validation failed for [^:]+: /, 'Schema validation failed: '),
    };
    expect(subset).toMatchInlineSnapshot(`
{
  "attempt": 1,
  "code": "VALIDATION_ERROR",
  "message": "Schema validation failed: [\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"array\",\n    \"received\": \"object\",\n    \"path\": [],\n    \"message\": \"Expected array, received object\"\n  }\n]",
  "path": "/costs/daily?period=P1D",
  "schemaHash": "<hash>",
}
`);
  });
});
