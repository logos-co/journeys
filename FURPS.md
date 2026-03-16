# FURPS — eco-prio

## Functionality

### Core
- Pipeline view of Logos ecosystem journeys from GitHub Projects v2 (GraphQL API, paginated)
- Three journey types via labels: `user`, `developer`, `node operator`
- Release targeting via `testnet *` labels (e.g. `testnet v0.1`, `testnet unscheduled`)
- Cross-team dependency tracking via structured `## Dependencies` section in issue body (`- team: URL` or `- team: TODO`)
- Dependency status: real-time from fetched issue state (pending/done/not tracked)
- Blocked team tracking via `blocked:teamname` labels with color-coded indicators
- Documentation linking from `## Documentation` section in issue body
- Doc warning badge when docs dep is closed but no doc URL exists
- Open/closed journey split with chronological sort for closed

### Admin (write PAT required, admin mode toggled per session)
- Drag-and-drop reordering (updates GitHub Projects v2 item position via GraphQL mutation)
- Add/remove `blocked:*` labels on issues
- Add dependencies to issue body (team + optional GitHub issue URL)
- Auto-resolve team name from GitHub issue URL using repo-to-team mapping

### Detail Panel
- Expandable per-row drill-down with full markdown body, assignees, dependency table, blocked labels
- Expand/collapse all toggle
- Links to GitHub issue and documentation

## Usability

- Logos-branded light theme: sandy parchment bg (`#DDDED8`), forest text (`#0E2618`), coral accent (`#E46962`), teal header (`#0C2B2D`)
- Responsive: 5-column desktop grid (Journey | Type | Release | Deps | Chevron), 2-column mobile
- Color-coded journey types (user=red, developer=blue, node operator=amber)
- Deterministic hash-based team colors (avoids muddy yellow-green range)
- Settings modal with PAT management, scope guidance, and inline token entry on rate-limit errors
- Toast notifications (success/error/info/warning, 4s auto-dismiss)
- Empty state with branded "Configure your project" CTA
- Project badge in header links to GitHub Projects board

## Reliability

- User/org auto-detection: tries user GraphQL query first, falls back to org
- Batch issue fetch with `Promise.allSettled` (6-item concurrency limit) — one failure doesn't block others
- HTML escaping on all user-supplied text (XSS prevention)
- Optimistic drag reorder with rollback on API failure
- Local body cache in `itemRegistry` prevents overwrites during rapid successive dependency adds
- Graceful fallback: no PAT = read-only public access; marked.js missing = escaped preformatted text
- URL validation on dependency issue URLs (strict GitHub issue URL regex)
- Silent skip of malformed dependency entries (no crash on bad data)

## Performance

- GraphQL pagination: 50 items/page with automatic cursor loop
- Lazy dependency loading: deps fetched in background after pipeline renders
- 6-item concurrent batch fetch balances speed vs API rate limits
- In-place DOM node movement on drag (no full re-render)
- Hidden detail panels have empty innerHTML (no hidden DOM overhead)
- Map/Set data structures for O(1) lookups (fetched issues, open panels)
- No polling — refresh only on manual button click
- Single initial load; conditional auth header (lower rate limit without token)

## Supportability

- Zero-backend static SPA: plain HTML + ES modules + Tailwind CDN + marked.js
- No build step, no framework — ~2,400 lines of vanilla JS across 8 modules
- Clear module separation: api, config, detail, drag, markdown, pipeline, teams
- localStorage-based config (owner, project number, PAT) — no server-side state
- Admin mode resets on reload (secure default)
- Deterministic team color generation supports unlimited teams without code changes
- Repo-to-team mapping in `teams.js` (add new entries for new repos)
- Hardcoded color overrides for journey types and release labels (change in `pipeline.js`)
- Global `window._*` handlers decouple onclick attributes from module internals
