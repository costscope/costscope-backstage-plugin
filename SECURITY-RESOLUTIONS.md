# Security Resolutions (Temporary Dependency Pins)

Purpose: Authoritative, living record for every active Yarn `resolutions` entry whose intent is security mitigation or stability during upstream lag. Keep the README high‑level; put full detail here.

Update Workflow:

1. Add new pin rationale in a PR (before merge).
2. Include advisory IDs (GHSA / CVE) and links.
3. Set a re‑evaluation date (<=30 days for High/Critical, <=60 days for Moderate; Low optional).
4. On each weekly triage run `yarn resolutions:check` and update the Status column.
5. Remove the row when the pin is dropped (leave historical rows collapsed under an "Archived" section if long‑term audit history is desired later).

> NOTE: Dates use ISO `YYYY-MM-DD`.

| Package / Pattern | Pinned Version | Reason (Summary)                                                          | Advisory Links | Severity | First Added | Re‑Eval By | Drop Condition                              | Status |
| ----------------- | -------------- | ------------------------------------------------------------------------- | -------------- | -------- | ----------- | ---------- | ------------------------------------------- | ------ |
| —                 | —              | No active security pins. Latest run of `yarn resolutions:check` is clean. | —              | —        | —           | 2025-09-15 | Add rows only when a new pin is introduced. | N/A    |

## Pin Details

No active pins. Use this section to document rationale and lifecycle details the next time a temporary `resolutions` entry is added.

## Review Checklist Template

When evaluating a pin for renewal or removal:

- [ ] Still required? (Check `yarn why <package>` to see versions)
- [ ] Upstream fixed & within semver range already? If yes → remove.
- [ ] Any new advisories for pinned version? If yes → bump pin.
- [ ] Changelog / release notes skim for breaking changes.
- [ ] Update `Re‑Eval By` (+30 days High/Critical, +60 days Moderate) if retaining.

## Adding a New Pin (PR Template Snippet)

```
### Security Resolutions Update
Package: <name>
Reason: <one line>
Advisory: <GHSA/CVE links>
Severity: <High|Critical|Moderate|Low>
Re-Eval By: <YYYY-MM-DD>
Drop Condition: <text>
```

Include a diff of `yarn why <name>` in the PR description for reviewer context.

## Removal

When removing a pin, delete its row and (optionally) move rationale to an `Archived` section if historical tracking is desired later. For now we keep file lean—no archive section until first removals occur.
