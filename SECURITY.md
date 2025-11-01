# Security Policy

## Supported Versions

This project is pre‑release (private package). We fix security issues on the `main` branch and include them in the next published version. No backports are currently offered.

## Reporting a Vulnerability

Please responsibly disclose suspected vulnerabilities **privately** by emailing: **dev404ai@gmail.com**.

Include (when possible):

- A concise description of the vulnerability and potential impact
- Steps to reproduce (PoC code, affected endpoints, configuration)
- Any relevant logs, stack traces, or screenshots
- Suggested remediation ideas (if known)

Do **not** open a public GitHub issue for an undisclosed vulnerability.

## Disclosure Workflow (Target SLA)

1. Acknowledge receipt within 72 hours (often <24h)
2. Triage & reproduce
3. Assess severity (CVSS style qualitative: Low / Medium / High / Critical)
4. Develop & test a fix (and regression tests where feasible)
5. Coordinate release (may batch Low issues; High/Critical prioritized immediately)
6. Public disclosure (CHANGELOG entry + optional security advisory) after fix availability

If we cannot reproduce an issue, we’ll request additional context. If a report is out of scope (see below), we will communicate that decision.

## In Scope

- Code execution, privilege escalation, or authentication bypass
- Sensitive data exposure (including secret leakage in logs)
- SSRF, SQLi, XSS, CSRF, template injection
- Logic flaws leading to cost / data integrity compromise

## Out of Scope (Generally)

- Denial of Service via unrealistic resource consumption patterns
- Vulnerabilities requiring physical access or rooted devices
- Missing security headers in local mock / dev tooling
- Older transitive dependency advisories already fixed upstream but not yet released by Backstage (tracked via resolutions)

## Coordinated Disclosure

We support coordinated disclosure. If you plan to publish an advisory, please let us know your intended timeline so we can align fix release & acknowledgement.

## GPG / Encryption

If you require encrypted communication, request our temporary PGP key in your initial email; we can provide one for high‑sensitivity reports.

## Hall of Fame / Thanks

We plan to acknowledge first responsible reporters (opt‑in) once the project is public.

Thank you for helping keep the Costscope ecosystem safe.
