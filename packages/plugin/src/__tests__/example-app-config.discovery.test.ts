import fs from 'node:fs';
import path from 'node:path';

// Minimal YAML parse: avoid adding deps; we only need to check structure substrings.
// This is not a full YAML parser but sufficient to catch common misconfig in our example file.

describe('example app-config.yaml discovery config', () => {
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
  it('uses discovery.endpoints[].plugins with same-origin target pattern', () => {
    const yml = fs.readFileSync(file, 'utf8');
    // Must include plugins array with "costscope"
    expect(yml).toMatch(
      /discovery:\s*[\s\S]*endpoints:\s*[\s\S]*-\s*type:\s*plugin[\s\S]*plugins:\s*\[?[^\n\]]*costscope[^\]]*\]?/m,
    );
    // Target points to the local mock backend discovery URL in the current example
    expect(yml).toMatch(/target:\s*http:\/\/localhost:7007\/api\/costscope\s*$/m);
  });
});
