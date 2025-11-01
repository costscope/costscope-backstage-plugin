# Example Backstage App (Costscope Plugin)

Minimal Backstage app wiring the `@costscope/backstage-plugin` from the monorepo via `workspace:*`.

## Scripts

Run from repo root after installing dependencies:

```
yarn install
yarn workspace app start
```

The route `/costscope` should render the Costscope page. Mock API: run `yarn workspace @costscope/backstage-plugin mock` in parallel.
