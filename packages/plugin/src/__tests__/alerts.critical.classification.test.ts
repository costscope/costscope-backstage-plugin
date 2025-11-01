import { CostscopeClient } from './client';
import { CostscopeErrorCodes } from './errorCodes';
import { buildError } from './errors';
import { CriticalProfiles } from 'src/criticalProfiles';

describe('Client alerts: critical classification and profiles', () => {
  const baseDeps = () => ({
    discoveryApi: { getBaseUrl: async (id: string) => `http://localhost/${id}` },
    identityApi: { getCredentials: async () => ({ token: 't' }) },
    errorApi: { post: jest.fn() },
  });

  it('default heuristic: alerts on >=500, TIMEOUT, NETWORK; not on VALIDATION_ERROR', async () => {
    // HTTP 500
    {
      const alertApi = { post: jest.fn() };
      const fetchApi = { fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }) };
      const client = new CostscopeClient({ ...baseDeps(), fetchApi, alertApi, retry: { maxAttempts: 1 } } as any);
      await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: CostscopeErrorCodes.HTTP_ERROR, status: 500 });
      expect(alertApi.post).toHaveBeenCalledTimes(1);
    }

    // TIMEOUT
    {
      const alertApi = { post: jest.fn() };
      const fetchApi = {
        fetch: jest.fn((_url: string, opts: any) =>
          new Promise((_r, j) => {
            opts?.signal?.addEventListener('abort', () => j({ name: 'AbortError' }));
          }),
        ),
      };
      const client = new CostscopeClient({ ...baseDeps(), fetchApi, alertApi, timeoutMs: 10, retry: { maxAttempts: 1 } } as any);
      await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: CostscopeErrorCodes.TIMEOUT });
      expect(alertApi.post).toHaveBeenCalledTimes(1);
    }

    // NETWORK_ERROR (throw without status)
    {
      const alertApi = { post: jest.fn() };
      const fetchApi = { fetch: async () => { throw new Error('net'); } };
      const client = new CostscopeClient({ ...baseDeps(), fetchApi, alertApi, retry: { maxAttempts: 1 } } as any);
      await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: CostscopeErrorCodes.NETWORK_ERROR });
      expect(alertApi.post).toHaveBeenCalledTimes(1);
    }

    // UNKNOWN without status (synthetic) should be considered critical as well
    {
      const alertApi = { post: jest.fn() };
      const thrown = buildError({ code: CostscopeErrorCodes.UNKNOWN as any, message: 'u', attempt: 1, correlationId: 'c', path: '/costs/daily?period=P1D' } as any);
      const fetchApi = { fetch: async () => { throw thrown; } };
      const client = new CostscopeClient({ ...baseDeps(), fetchApi, alertApi, retry: { maxAttempts: 1 } } as any);
      await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: CostscopeErrorCodes.UNKNOWN });
      expect(alertApi.post).toHaveBeenCalledTimes(1);
    }

    // VALIDATION_ERROR should NOT produce an alert (non-critical)
    {
      const alertApi = { post: jest.fn() };
      const validationErr = buildError({ code: CostscopeErrorCodes.VALIDATION_ERROR as any, message: 'bad', attempt: 1, correlationId: 'c', path: '/costs/daily?period=P1D' } as any);
      const fetchApi = { fetch: async () => { return { ok: true, json: async () => { throw validationErr; } } as any; } } as any; // simulate thrown during parsing/validation
      const client = new CostscopeClient({ ...baseDeps(), fetchApi, alertApi, retry: { maxAttempts: 1 } } as any);
      await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: CostscopeErrorCodes.VALIDATION_ERROR });
      expect(alertApi.post).not.toHaveBeenCalled();
    }
  });

  it('profiles: defaultHeuristic, transientInfra, minimal', async () => {
    // defaultHeuristic (explicit undefined) behaves like default → 500 is critical
    {
      const alertApi = { post: jest.fn() };
      const fetchApi = { fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }) };
      const client = new CostscopeClient({ ...baseDeps(), fetchApi, alertApi, critical: CriticalProfiles.defaultHeuristic, retry: { maxAttempts: 1 } } as any);
      await expect(client.getOverview('P1D')).rejects.toMatchObject({ status: 500 });
      expect(alertApi.post).toHaveBeenCalledTimes(1);
    }

    // transientInfra: 500 is NOT critical, 503 and TIMEOUT are critical
    {
      // 500 → no alert
      const alertApi = { post: jest.fn() };
      const fetchApi = { fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }) };
      const client = new CostscopeClient({ ...baseDeps(), fetchApi, alertApi, critical: CriticalProfiles.transientInfra, retry: { maxAttempts: 1 } } as any);
      await expect(client.getOverview('P1D')).rejects.toMatchObject({ status: 500 });
      expect(alertApi.post).not.toHaveBeenCalled();
    }
    {
      // 503 → alert
      const alertApi = { post: jest.fn() };
      const fetchApi = { fetch: async () => ({ ok: false, status: 503, json: async () => ({}) }) };
      const client = new CostscopeClient({ ...baseDeps(), fetchApi, alertApi, critical: CriticalProfiles.transientInfra, retry: { maxAttempts: 1 } } as any);
      await expect(client.getOverview('P1D')).rejects.toMatchObject({ status: 503 });
      expect(alertApi.post).toHaveBeenCalledTimes(1);
    }
    {
      // TIMEOUT → alert
      const alertApi = { post: jest.fn() };
      const fetchApi = {
        fetch: jest.fn((_url: string, opts: any) =>
          new Promise((_r, j) => {
            opts?.signal?.addEventListener('abort', () => j({ name: 'AbortError' }));
          }),
        ),
      };
      const client = new CostscopeClient({ ...baseDeps(), fetchApi, alertApi, timeoutMs: 10, critical: CriticalProfiles.transientInfra, retry: { maxAttempts: 1 } } as any);
      await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: CostscopeErrorCodes.TIMEOUT });
      expect(alertApi.post).toHaveBeenCalledTimes(1);
    }

    // minimal: nothing is critical
    {
      const alertApi = { post: jest.fn() };
      const fetchApi = { fetch: async () => ({ ok: false, status: 503, json: async () => ({}) }) };
      const client = new CostscopeClient({ ...baseDeps(), fetchApi, alertApi, critical: CriticalProfiles.minimal, retry: { maxAttempts: 1 } } as any);
      await expect(client.getOverview('P1D')).rejects.toMatchObject({ status: 503 });
      expect(alertApi.post).not.toHaveBeenCalled();
    }
  });

  it('silent: suppresses toasts even when critical', async () => {
    const alertApi = { post: jest.fn() };
    const fetchApi = { fetch: async () => ({ ok: false, status: 503, json: async () => ({}) }) };
    const client = new CostscopeClient({ ...baseDeps(), fetchApi, alertApi, critical: CriticalProfiles.transientInfra, silent: true, retry: { maxAttempts: 1 } } as any);
    await expect(client.getOverview('P1D')).rejects.toMatchObject({ status: 503 });
    expect(alertApi.post).not.toHaveBeenCalled();
  });
});
