import { QueryClient } from '@tanstack/react-query';
import { hydrateFromManifest, readManifestFromDocument } from '../hydration';

describe('SSR hydration manifest', () => {
  it('returns undefined when script element is missing', () => {
    const doc = document.implementation.createHTMLDocument('test');
    const m = readManifestFromDocument(doc);
    expect(m).toBeUndefined();
  });

  it('hydrates React Query cache from valid manifest', () => {
    const doc = document.implementation.createHTMLDocument('manifest');
    const script = doc.createElement('script');
    script.id = 'costscope-prefetch';
    script.type = 'application/json';
    const key = ['costscope', 'overview', { period: 'P7D' }];
    const payload = {
      version: 1,
      ts: Date.now(),
      queries: [
        {
          key,
          endpoint: '/costs/daily',
          data: [{ ts: '2024-01-01', amount: 1 }],
        },
      ],
    };
    script.textContent = JSON.stringify(payload);
    doc.body.appendChild(script);

    const qc = new QueryClient();
    const manifest = hydrateFromManifest(qc, doc);
    expect(manifest).toBeTruthy();
    expect(qc.getQueryData(key as any)).toEqual([{ ts: '2024-01-01', amount: 1 }]);
  });
});
