import fs from 'node:fs';
import path from 'node:path';

function parseDiscovery(yml: string): { target?: string; plugins: string[] } {
  const pluginsMatch = yml.match(/plugins:\s*\[([^\]]*)\]/);
  const plugins = pluginsMatch
    ? pluginsMatch[1]
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    : [];
  // Find all target lines and prefer the last occurrence (the discovery block appears after proxy)
  const re = /target:\s*([^\s#]+)\s*$/gm;
  let m: RegExpExecArray | null;
  let last: string | undefined;
  while ((m = re.exec(yml)) !== null) {
    last = m[1];
  }
  const target = last;
  return { target, plugins };
}

describe('discovery baseUrl contract', () => {
  it('example discovery mapping routes costscope plugin via mock backend', () => {
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
    const yml = fs.readFileSync(file, 'utf8');
    const { target, plugins } = parseDiscovery(yml);
    expect(plugins).toContain('costscope');
    expect(target).toBeDefined();
    // The example uses a direct mock backend discovery target
    expect(target).toBe('http://localhost:7007/api/costscope');
  });
});
