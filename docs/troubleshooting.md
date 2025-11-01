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
