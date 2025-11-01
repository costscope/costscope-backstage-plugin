import fs from 'node:fs';
import path from 'node:path';

describe('demo script wiring', () => {
  it('demo:inner starts mock backend', () => {
    const pkgPath = path.join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const cmd: string = pkg.scripts?.['demo:inner'] || '';
    // Accept both generic 'mock' and explicit 'mock:start:demo', and backend:start or backend:start:demo
    expect(cmd).toMatch(
      /run-p .*mock(?::start:demo)? .*backend:start(?::demo)? .*build:watch .*example:start/,
    );
  });
});
