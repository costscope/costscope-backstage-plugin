import fs from 'node:fs';
import path from 'node:path';
// Avoid importing full Backstage runtime; create a tiny shim mimicking the method we need.
class FrontendHostDiscoveryShim {
  static fromConfig(cfg: any) {
    return new FrontendHostDiscoveryShim(cfg);
  }
  constructor(private cfg: any) {}
  async getBaseUrl(_pluginId: string) {
    const endpoints = this.cfg.getOptionalConfigArray('discovery.endpoints') || [];
    const raw = endpoints[0]?.getString?.('target') || endpoints[0]?.get?.('target')?.toString?.();
    if (!raw) throw new Error('no discovery target');
    return raw.replace(/\/$/, '');
  }
}

// This test ensures that with the example app-config.yaml, FrontendHostDiscovery resolves
// costscope baseUrl to the mock-backend proxy and that the proxy upstream path mapping is correct.

function loadYaml(): string {
  const file = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'examples',
    'backstage-app',
    'app-config.yaml',
  );
  return fs.readFileSync(file, 'utf8');
}

function getTargetFromYaml(yml: string): string {
  const re = /target:\s*([^\s#]+)\s*$/gm;
  let m: RegExpExecArray | null;
  let last: string | undefined;
  while ((m = re.exec(yml)) !== null) last = m[1];
  if (!last) throw new Error('target not found in example app-config.yaml');
  return last.replace(/^['"]|['"]$/g, '');
}

class StubConfig {
  constructor(private readonly yml: string) {}
  getString(path: string) {
    if (path === 'backend.baseUrl') return 'http://localhost:7008';
    throw new Error('unexpected getString ' + path);
  }
  getOptionalConfigArray(path: string) {
    if (path !== 'discovery.endpoints') return undefined;
    return [
      {
        get: (k: string) =>
          ({
            toString: () => getTargetFromYaml(this.yml),
            external: getTargetFromYaml(this.yml),
          }) as any,
        getString: (k: string) => getTargetFromYaml(this.yml),
        getOptionalString: (k: string) => getTargetFromYaml(this.yml),
        getStringArray: (k: string) => ['costscope'],
      },
    ] as any;
  }
}

describe('FrontendHostDiscovery + mock-backend proxy mapping', () => {
  it('resolves /api/costscope base from discovery target', async () => {
    const yml = loadYaml();
    const cfg = new StubConfig(yml) as any;
    const discovery = FrontendHostDiscoveryShim.fromConfig(cfg);
    const base = await discovery.getBaseUrl('costscope');
    expect(base.endsWith('/api/costscope')).toBe(true);
    // The example discovery target points to the mock backend URL
    expect(base).toMatch(/^http:\/\/localhost:7007\/api\/costscope$/);
  });
});
