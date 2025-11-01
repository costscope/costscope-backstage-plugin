#!/usr/bin/env node
/**
 * Check if an open PR exists for a given branch. Usage:
 *   GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo node scripts/check-open-pr.js chore/sync-examples-version
 * Outputs to GITHUB_OUTPUT (if set): exists=true|false, prNumber=<number or empty>
 */
const https = require('https');

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const branch = process.argv[2];
if (!repo || !token || !branch) {
  console.error('[check-open-pr] Missing required env vars or arg.');
  process.exit(1);
}
const owner = repo.split('/')[0];
const url = new URL(`https://api.github.com/repos/${repo}/pulls?state=open&head=${owner}:${branch}`);

const opts = {
  headers: {
    'User-Agent': 'costscope-sync-script',
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json'
  }
};

https.get(url, opts, res => {
  let data='';
  res.on('data', c => data+=c);
  res.on('end', () => {
    try {
      const arr = JSON.parse(data);
      const pr = Array.isArray(arr) && arr[0];
      const exists = !!pr;
      const prNumber = exists ? pr.number : '';
      console.log(`[check-open-pr] exists=${exists} prNumber=${prNumber}`);
      if (process.env.GITHUB_OUTPUT) {
        require('fs').appendFileSync(process.env.GITHUB_OUTPUT, `exists=${exists}\nprNumber=${prNumber}\n`);
      }
    } catch (e) {
      console.error('[check-open-pr] parse error', e.message);
      process.exit(2);
    }
  });
}).on('error', e => { console.error('[check-open-pr] request error', e.message); process.exit(3); });
