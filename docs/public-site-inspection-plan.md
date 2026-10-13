# SiteLab: public site inspection MVP

## Goal
Turn the current demo-only feature selection into a truthful, evidence-based analysis of publicly accessible webpages, while keeping the Spring Cyberpunk mission UX unchanged.

## Architecture
- Keep the current client-side demo generator as fallback; never label examples as real observations.
- Implement a separate server-only Playwright worker; no browser process or credentials in the frontend.
- Phase one collects page title, headings, publicly visible navigation, button and form labels, with source URLs and timestamps.
- Present observed, inferred and unknown findings distinctly; never claim server logic or databases were reconstructed.
- REA integration is a later opt-in analysis adapter after environment and license review.

## Security prerequisites (blocking)
- Input URL must be http(s), public, and allowed by applicable site rules.
- Resolve DNS and reject all private, loopback, link-local, multicast and reserved IPs for IPv4/IPv6 at initial request and every redirect; revalidate at connection time to prevent DNS rebinding.
- Block localhost, internal hosts, alternate IP spellings, custom ports, credentials in URL and unsupported protocols.
- Sandbox isolated browser with restricted network egress, no credentials, extensions, downloads or persistent storage.
- Enforce limits on redirects, navigation timeout, pages, response sizes, concurrency, and per-user rate.
- Sanitize output, don't execute extracted instructions or secrets, and strip personal data and query tokens.
- Fail closed; if safe worker cannot run, disable real-analysis CTA rather than fake output.

## Acceptance tests
1. Known public test site yields sourced heading/button evidence.
2. Invalid/private URLs and redirect-to-private are rejected.
3. Timeout and blocked site show actionable error, not a fabricated finding.
4. Demo mode and real mode are visibly different.
5. Current four mission steps, markdown exports and responsive styles still work.
6. `bun run test` and `bun run build` pass before PR.

No production deployment or existing application modifications without review.
