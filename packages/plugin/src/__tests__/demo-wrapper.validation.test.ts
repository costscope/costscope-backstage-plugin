import { spawnSync } from 'node:child_process';
import path from 'node:path';

describe('demo wrapper validation', () => {
  it('exits 0 in DEMO_VALIDATE_ONLY mode and finds plugin dir', () => {
    const script = path.join(__dirname, '..', '..', 'scripts', 'demo.mjs');
    const res = spawnSync('node', [script], {
      env: { ...process.env, DEMO_VALIDATE_ONLY: '1' },
      cwd: path.join(__dirname, '..', '..'),
      stdio: 'pipe',
    });
    expect(res.status).toBe(0);
  });
});
