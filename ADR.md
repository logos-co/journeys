# Architecture Decision Records — eco-prio

## ADR-001: Static SPA with no backend

**Status:** Accepted

**Context:** We need a tool to visualize and prioritize Logos ecosystem journeys. The data already lives in GitHub Projects v2.

**Decision:** Build a static single-page application that runs entirely in the browser, using GitHub's API directly.

**Consequences:**
- No infrastructure to maintain or deploy (GitHub Pages)
- PAT stored client-side in localStorage (user controls their own credentials)
- No server-side caching — every load hits GitHub API
- Rate limits apply per-user (60/hr unauthenticated, 5000/hr with PAT)

---

## ADR-002: GitHub Projects v2 as sole data source

**Status:** Accepted

**Context:** Journey data (issues, labels, ordering) needs a single source of truth that the team already uses.

**Decision:** Use GitHub Projects v2 GraphQL API for reads and mutations. Issues are journeys; labels encode type, release, and blocked status; issue body encodes dependencies and doc URLs.

**Consequences:**
- No data sync or consistency issues — GitHub is authoritative
- Dependency on GitHub API availability and rate limits
- Issue body format (`## Dependencies`, `## Documentation`) is a convention, not enforced by GitHub
- Ordering managed via `updateProjectV2ItemPosition` mutation

---

## ADR-003: No framework (vanilla JS + ES modules)

**Status:** Accepted

**Context:** The app has ~50 items, 8 modules, and ~2,400 lines of JS. A framework adds bundle size, build tooling, and upgrade burden.

**Decision:** Use plain ES modules with string-based HTML templates, Tailwind CSS via CDN, and marked.js for markdown.

**Consequences:**
- No build step — edit and reload
- HTML templates are string concatenation (less readable than JSX, but no transpiler)
- No virtual DOM — direct DOM manipulation, which is fine for <100 items
- No framework upgrade churn
- New contributors need only HTML/JS knowledge

---

## ADR-004: localStorage for configuration

**Status:** Accepted

**Context:** Users need to configure their GitHub owner/org, project number, and PAT. There is no backend.

**Decision:** Store all config in localStorage (`ppd_owner`, `ppd_project_number`, `ppd_pat`).

**Consequences:**
- PAT stays client-side (user privacy)
- Config persists across sessions without network
- No multi-device sync
- User can inspect/clear via browser DevTools

---

## ADR-005: In-memory admin mode (not persisted)

**Status:** Accepted

**Context:** Admin actions (reorder, add deps, manage labels) should not happen accidentally.

**Decision:** Admin mode is an in-memory toggle that resets to read-only on every page reload.

**Consequences:**
- Safe default — user must explicitly opt in each session
- Write PAT scope not exercised unless admin mode is active
- Slight friction for frequent admins (must toggle each reload)

---

## ADR-006: Structured issue body for dependencies and docs

**Status:** Accepted

**Context:** GitHub issues don't have native fields for cross-team dependencies or doc URLs.

**Decision:** Use markdown sections in the issue body:
- `## Dependencies` with `- team: URL` or `- team: TODO` lines
- `## Documentation` with a bare URL

Parsed via regex in `markdown.js`.

**Consequences:**
- Human-readable in GitHub UI without the app
- Fragile — depends on exact heading and line format
- Silent skip of malformed entries (no error feedback to user)
- Body mutations (add dep) must preserve existing content and other sections

---

## ADR-007: Deterministic hash-based team colors

**Status:** Accepted

**Context:** Teams need distinct visual colors. New teams can appear at any time.

**Decision:** Generate HSL colors by hashing the team name. Shift hue by +30 to skip muddy yellow-green range. Special-case "red team" to fixed hue=0.

**Consequences:**
- Any team name auto-gets a consistent color without hardcoding
- Colors are deterministic across sessions and users
- Some collisions possible (different names → similar hue), but rare enough in practice

---

## ADR-008: Batch issue fetch with concurrency limit

**Status:** Accepted

**Context:** Each dependency references a GitHub issue that must be fetched for status. A journey may have 3-5 deps; 30 journeys = 90-150 individual API calls.

**Decision:** Batch-fetch using `Promise.allSettled` with a concurrency limit of 6. One failure doesn't block others.

**Consequences:**
- ~3-5x faster than serial, without triggering rate limits
- `allSettled` ensures partial results render even if some deps fail
- 6 concurrent requests is conservative; works for both authenticated and unauthenticated limits

---

## ADR-009: Optimistic drag-and-drop with rollback

**Status:** Accepted

**Context:** Drag reordering should feel instant, but must persist to GitHub.

**Decision:** Move DOM nodes immediately on drop, update in-memory array, then fire GraphQL mutation. On failure, re-render from original state.

**Consequences:**
- Instant visual feedback
- If mutation fails, user sees revert with error toast
- Last-writer-wins if two users reorder simultaneously (GitHub behavior)

---

## ADR-010: User/org auto-detection via fallback query

**Status:** Accepted

**Context:** GitHub Projects v2 GraphQL uses different root fields for user projects (`user { projectV2 }`) vs org projects (`organization { projectV2 }`). The config only stores `owner`, not the owner type.

**Decision:** Try the user query first. If it fails (null result), retry with the org query.

**Consequences:**
- Works transparently for both user and org projects
- First load is slightly slower for org projects (two queries)
- `isOrg` flag is returned from `fetchProjectItems` for constructing the correct GitHub URL

---

## ADR-011: Local body cache for rapid mutations

**Status:** Accepted

**Context:** When adding multiple dependencies in quick succession, each mutation fetches the issue body, appends a dep, and writes it back. If the second fetch returns stale data (before the first write propagates), it overwrites the first dep.

**Decision:** Use the locally cached body from `itemRegistry` (updated after each successful mutation) instead of re-fetching from GitHub. Fall back to GitHub fetch only if no cache exists.

**Consequences:**
- Rapid successive adds no longer overwrite each other
- Local cache may diverge from GitHub if another user edits the body concurrently (acceptable for this tool)
