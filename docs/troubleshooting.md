# Troubleshooting

If the demo fails during build with an error like:

- Error: Cannot find module @rollup/rollup-linux-arm64-gnu

This typically happens when node_modules were installed on a different OS/CPU and reused (for example, switching between x64 and arm64). Fix it by reinstalling dependencies for your current platform:

```bash
rm -rf node_modules packages/*/node_modules examples/*/node_modules examples/backstage-app/packages/app/node_modules
yarn install --frozen-lockfile
# then
npm run demo -- --reset
```

Note: We use tsup (esbuild) but rollup is a transient dev dependency of tools like Backstage CLI and tsup plugins; rollup ships platform-specific optional packages that must match your OS/arch.

## Process spawning pitfalls (scripts and E2E)

You may encounter CodeQL warnings like “Shell command built from environment values” or ESLint errors about `execSync`/`spawn` usage in repository scripts.

Common causes:

- Shell string usage, for example: `execSync('yarn build')`, <code>execSync(`git show ${ref}:${file}`)</code>
- Spawning a shell to run pipelines: `spawn('bash', ['-c', 'lsof -ti :3000 | xargs -r kill -9'])`
- Using `{ shell: true }` with `spawn`/`spawnSync`

How to fix:

- Prefer explicit argument arrays and avoid the shell.
  - `execFileSync('yarn', ['build'], { stdio: 'inherit' })`
  - `execFileSync('git', ['show', `${ref}:${relPath}`], { stdio: 'pipe' })`
- Replace shell pipelines with two steps: run the producer, parse output, then act in JS (e.g., run `lsof` → parse PIDs → `process.kill`).
- Avoid `{ shell: true }` and direct `bash`/`sh` spawns in repo scripts.

Why: avoiding shell interpretation makes scripts robust to spaces/special characters and prevents injection vulnerabilities in CI.
