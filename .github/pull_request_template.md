<!--
Briefly describe the PR goal. Russian + English welcome.
-->

## Summary

Brief description of changes and motivation.

## Type of Change

- [ ] feat (new functionality)
- [ ] fix (bug fix)
- [ ] docs (documentation only)
- [ ] chore (infrastructure / build / deps)
- [ ] refactor (no behavior change)
- [ ] perf (performance improvement)
- [ ] test (tests only)
- [ ] ci (CI configuration)
- [ ] style (formatting / no logic)
- [ ] build (build changes / dependencies)
- [ ] BREAKING CHANGE

## Related Issues

Closes #
Refs #

## Details / Implementation Notes

Key decisions, type structures, API schemas, migrations.

## Screenshots / Visuals (if UI)

Before / After or GIF.

## Size & Bundle Impact

- [ ] Size-limit checked (`yarn size` if applicable)
- [ ] No unexpected large dependencies

## Tests

- [ ] Unit tests added / updated
- [ ] Edge-cases / errors covered
- [ ] Local `yarn test` passed

## Quality Gates

- [ ] `yarn verify` OK (lint + typecheck + test + size)
- [ ] Storybook (if UI) reviewed

## Documentation

- [ ] README / section updated
- [ ] CHANGELOG updated
- [ ] Code comments

## Breaking Changes

Describe impact, migration path, flags.

## Checklist (General)

- [ ] No direct hardcode of serviceId ('finops-insights') outside `constants.ts`
- [ ] No direct `console.*` (use `logger`)
- [ ] Errors use `CostscopeError` / types

## Release Notes (user-facing)

Brief string that can be copied to CHANGELOG.

## Additional Context

Any links, discussions, RFC.
