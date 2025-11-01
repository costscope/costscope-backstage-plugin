# Storybook & Visual Testing

## Local Storybook (dev mode)

Run the interactive Storybook locally while developing the plugin.

Quick start (from repo root):

```bash
yarn storybook:dev
```

Notes:

- URL: http://localhost:6006/?path=/docs/costscope-pages-costscopepage--docs
- In dev containers or headless environments, prevent auto‑open of a system browser:

	```bash
	BROWSER=none yarn storybook:dev
	```

- Change port if 6006 is busy:

	```bash
	SB_PORT=6100 yarn storybook:dev
	```

- Stop: Ctrl+C in the terminal.

## Live Storybook (UI Demo)

Explore the current UI components & states without cloning the repo:

➡️ https://costscope.github.io/costscope-backstage-plugin/

The site is auto‑published from the `main` branch using GitHub Pages (workflow: `Storybook`). See `docs/RELEASING.md` for a pre‑publish checklist.

## Visual Regression Tests (Chromatic)

This repo integrates Chromatic to run visual regression tests against our Storybook stories on every PR and push to `main`.

### Setup (one-time in your fork)

- Create a Chromatic project and add the repository.
- Add a GitHub secret `CHROMATIC_PROJECT_TOKEN` with the token from Chromatic.

### Usage

#### Local publish (optional)

```bash
yarn build-storybook
yarn chromatic # requires CHROMATIC_PROJECT_TOKEN in env
```

#### CI Integration

CI runs automatically via `.github/workflows/chromatic.yml` and will comment status on the PR. Snapshots are generated from the static build at `storybook-static` for consistency with the Pages deployment.

### Stability Tips

- Animations/transitions are paused for snapshots via a Chromatic parameter in `.storybook/preview.tsx` to reduce flake.
- Ensure stories render deterministically (seeded data, avoid Date.now without controls). Stories in this repo use deterministic sample data or mocked API responses.
