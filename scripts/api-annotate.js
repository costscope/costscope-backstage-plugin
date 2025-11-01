/*
 Read api-diff.json and emit GitHub Actions annotations attached to the API report file.
 - Added symbols -> ::notice annotations
 - Removed symbols -> ::warning annotations
 Batches long lists to avoid annotation spam.
*/
const fs = require('node:fs');
const path = require('node:path');

const DIFF_JSON = path.resolve(__dirname, '..', 'api-diff.json');
const API_FILE = 'etc/costscope-backstage-plugin.api.md';

function emit(kind, title, lines) {
  const maxPerAnnotation = 20;
  for (let i = 0; i < lines.length; i += maxPerAnnotation) {
    const chunk = lines.slice(i, i + maxPerAnnotation);
    const msg = [title, '', ...chunk.map((s) => `- ${s}`)].join('\n');
    const payload = `${kind} file=${API_FILE},line=1::${msg.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`;
    console.log(`::${payload}`);
  }
}

function main() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(DIFF_JSON, 'utf8'));
  } catch (e) {
    console.log('::notice ::No api-diff.json found; skip API annotations');
    return;
  }
  const added = Array.isArray(data.added) ? data.added : [];
  const removed = Array.isArray(data.removed) ? data.removed : [];

  if (!added.length && !removed.length) {
    console.log('::notice file=' + API_FILE + ',line=1::No public API additions or removals detected');
    return;
  }

  if (added.length) emit('notice', 'Public API additions', added);
  if (removed.length) emit('warning', 'Public API removals', removed);
}

main();
