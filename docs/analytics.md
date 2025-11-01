# Analytics Events (Costscope Plugin)

Current analytics events emitted via Backstage `AnalyticsApi`.

- costscope.page.view — on page or entity tab mount; attributes: location, project?
- costscope.period.change — when period preset changes; attributes: previous, next, group, location, project?
- costscope.refresh.click — on refresh in overview/breakdown/actions; attributes: target, period?, group?, location, project?

Notes:

- Emission is best‑effort; if no AnalyticsApi is available, events are skipped.
- Tests/Storybook may disable analytics; no functional impact in production.
