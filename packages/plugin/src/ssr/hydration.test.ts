import { QueryClient } from '@tanstack/react-query';
import { hydrateFromManifest } from './hydration';

describe('hydrateFromManifest', () => {
  it('hydrates query cache when manifest script present', () => {
    const qc = new QueryClient();
    const doc = document.implementation.createHTMLDocument('t');
    const script = doc.createElement('script');
    script.id = 'costscope-prefetch';
    script.type = 'application/json';
    script.textContent = JSON.stringify({
      version: 1,
      ts: Date.now(),
      queries: [
        { key: ['costscope','overview','P30D',''], endpoint: '/costs/daily', priority: 0, data: [{ date: '2025-01-01', cost: 1 }] },
      ],
    });
    doc.body.appendChild(script);

    const manifest = hydrateFromManifest(qc, doc as any);
    expect(manifest).toBeTruthy();
    const data = qc.getQueryData(['costscope','overview','P30D','']);
    expect(Array.isArray(data)).toBe(true);
    expect((data as any)[0].cost).toBe(1);
  });

  it('is idempotent when called multiple times with the same manifest', () => {
    const qc = new QueryClient();
    const doc = document.implementation.createHTMLDocument('t');
    const script = doc.createElement('script');
    script.id = 'costscope-prefetch';
    script.type = 'application/json';
    script.textContent = JSON.stringify({
      version: 1,
      ts: Date.now(),
      queries: [
        { key: ['costscope','overview','P7D','proj'], endpoint: '/costs/daily', priority: 0, data: [{ date: '2025-02-01', cost: 7 }] },
      ],
    });
    doc.body.appendChild(script);

    const m1 = hydrateFromManifest(qc, doc as any);
    expect(m1).toBeTruthy();
    const first = qc.getQueryData(['costscope','overview','P7D','proj']);
    expect(first).toEqual([{ date: '2025-02-01', cost: 7 }]);

    const m2 = hydrateFromManifest(qc, doc as any);
    expect(m2).toBeTruthy();
    const second = qc.getQueryData(['costscope','overview','P7D','proj']);
    expect(second).toEqual([{ date: '2025-02-01', cost: 7 }]);
  });
});
