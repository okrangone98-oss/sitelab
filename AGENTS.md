<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- SiteLab is client-only: spec generation lives in src/lib/sitelab.ts as pure functions; history in localStorage. Why: no server analysis worker exists yet, so nothing may claim real site analysis.
- All analysis data is demo until a sandboxed server worker (Playwright/REA) is integrated; never scrape from the browser. Why: security and honesty.