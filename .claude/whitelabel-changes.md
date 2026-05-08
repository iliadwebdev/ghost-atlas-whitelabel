# Ghost Atlas Whitelabel — Custom Changes Catalogue

This file catalogues all custom changes made on top of upstream Ghost for the Atlas CMS whitelabel fork.
**Update this file whenever new changes are made so upgrades are easier.**

Last updated: 2026-05-07 — added §22: end-to-end focal-point support for the post `feature_image` (new `posts_meta.feature_image_focal_point` column, validating model layer, email plumbing, body-image renderer extension, a one-property `kg-default-nodes` patch so the editor's body-image focal-point survives server-side lexical→HTML re-rendering, and an `admin-api-schema` patch so the Admin API rejects malformed `{x, y}` payloads at the validator layer rather than the model). Earlier 2026-04-27: §10 added "Admin Signin Button" subsection (hardcoded Atlas purple `#4945FF` on `/ghost/signin`, bypassing the publication's `accent_color`). Same-day: §21 Koenig fork override bumped to `@iliad.dev/koenig-lexical@1.1.4` (lockfile and `node_modules/.pnpm` were stuck on `1.0.3` — pnpm metadata cache prune + reinstall was required to force re-resolution). Earlier: 2026-04-24 (§10 Koenig palette patch and §14 Koenig editor-package patch replaced by the fork via pnpm alias override).

**Upgrade note — v6.25.1 → v6.32.0:** Ghost migrated the monorepo from yarn v1 to **pnpm 10** in PR #27017 (v6.29.0). All scripts, lockfile, CI configs, and the package-manager rule in `CLAUDE.md` moved to pnpm. `shamefully-hoist` was removed in PR #27343 (v6.29.0). `patch-package` was replaced with pnpm's native `pnpm.patchedDependencies`. See §7, §11, §14 for obsoleted workarounds.

---

## 1. `disableWebsiteFeatures` Flag

**Purpose:** Hides all website/publishing UI when Ghost is used as a pure email/newsletter platform (e.g. embedded in Atlas CMS).
**Mechanism:** Backend reads `DISABLE_WEBSITE_FEATURES=true` env var (or `disableWebsiteFeatures: true` in config JSON), exposes it via public config API. Frontend checks `config.disableWebsiteFeatures` to conditionally hide UI.

### Backend

#### `ghost/core/core/server/services/public-config/config.js`

- Added `disableWebsiteFeatures` to the returned config object.
- Reads from `process.env.DISABLE_WEBSITE_FEATURES === 'true'` OR `config.get('disableWebsiteFeatures') === true`.

#### `ghost/core/core/server/api/endpoints/utils/serializers/output/config.js`

- Added `'disableWebsiteFeatures'` to the list of allowed config keys exposed via the Admin API.

### Frontend — React Admin (`apps/`)

#### `apps/admin-x-framework/src/api/config.ts`

- Added `disableWebsiteFeatures?: boolean` to the `Config` TypeScript type.

#### `apps/admin-x-settings/src/components/sidebar.tsx`

- Hides nav items when `disableWebsiteFeatures` is true:
    - **General section:** Meta data, Social accounts, Make site private
    - **Site section:** Entire section (Design & branding, Theme, Navigation, Announcement bar)
    - **Growth section:** Network, Ghost Explore, Recommendations
    - **Advanced section:** Code injection

#### `apps/admin-x-settings/src/components/settings/general/users.tsx`

- Hides the "Invite people" button when `disableWebsiteFeatures` is true.

#### `apps/admin-x-settings/src/components/settings/general/about.tsx`

- Adds an Iliad.dev branding paragraph above the Ghost copyright notice: "This is a modified installation of Ghost, built by Iliad.dev."
- Also formatting-only changes (single → double quotes, JSX reformatting — no functional change beyond the branding paragraph).

#### `apps/admin/src/layout/app-sidebar/app-sidebar-header.tsx`

- Hides the site icon + title branding when `disableWebsiteFeatures` is true, but keeps the search button visible.
- Imports `useBrowseConfig` to read config.

#### `apps/admin/src/layout/app-sidebar/app-sidebar-footer.tsx`

- Removed the `isEmbedded` check that previously returned `null` for embedded views (sidebar footer always renders now).
- Minor formatting cleanup (quotes, trailing commas).

#### `apps/admin/src/layout/app-sidebar/nav-content.tsx`

- Hides **Pages** nav item when `disableWebsiteFeatures` is true.
- Hides **Comments** nav item when `disableWebsiteFeatures` is true.

#### `apps/admin/src/layout/app-sidebar/nav-main.tsx`

- Returns `null` entirely when `disableWebsiteFeatures` is true (avoids empty SidebarGroup adding unwanted spacing).
- Also returns `null` while config is loading (`!configData`) to prevent flash of website-feature items.

#### `apps/admin/src/layout/app-sidebar/nav-content.tsx`

- `disableWebsiteFeatures` defaults to `true` (hidden) while config is loading, to prevent Pages/Comments flashing before API response arrives.

#### `apps/admin-x-settings/src/components/settings/general/users/profile-tab.tsx`

- Email field is **disabled** when embedded (reads `isEmbedded` via `useFramework()`).
- Hint text changes to **"Email is managed by Atlas"** when embedded.

#### `apps/admin/src/layout/app-sidebar/user-menu.tsx`

- Hides **What's new?** menu item and avatar badge when embedded (`window.self !== window.top`).
- Hides **Dark mode** toggle when embedded.
- Hides **Sign out** when embedded (both admin and contributor menus).
- Replaces the user's email with **"Atlas Managed Profile"** in both the sidebar button and the dropdown header when embedded (both `UserMenu` and `ContributorUserMenu`).
- All `isEmbedded` checks return `false` when `?dev=true` is in the URL (dev mode override).

#### `apps/admin/src/main.tsx`

- `detectIsEmbedded()` returns `false` when `?dev=true` is in the URL.

#### `ghost/admin/app/services/embedding.js`

- `isEmbedded` getter returns `false` when `?dev=true` is in the URL (dev mode override).

### Frontend — Ember Admin (`ghost/admin/`)

#### `ghost/admin/app/components/gh-post-settings-menu.hbs`

- Hides "View post" link in post settings when `disableWebsiteFeatures` is true.
- Hides "Template" selector when `disableWebsiteFeatures` is true.
- Hides "Featured" toggle when `disableWebsiteFeatures` is true.
- Hides Code injection, Meta data, X card, Facebook card menu items when `disableWebsiteFeatures` is true.

#### `ghost/admin/app/components/editor/modals/preview.hbs`

- Hides "Web" preview button when `disableWebsiteFeatures` is true.
- Hides share/test email group on the right when `disableWebsiteFeatures` is true.

#### `ghost/admin/app/components/editor/modals/preview.js`

- Injects `config` via `@inject config` decorator.
- Defaults `previewFormat` to `'email'` (instead of `'browser'`) when `disableWebsiteFeatures` is true.

#### `ghost/admin/app/components/editor/publish-management.js`

- Injects `config` via `@inject config` decorator.
- Sets `previewFormat = 'email'` in constructor when `disableWebsiteFeatures` is true.

#### `ghost/admin/app/utils/publish-options.js`

- Added `disableWebsiteFeatures` getter.
- `publishTypeOptions` filtered to only `'send'` when `disableWebsiteFeatures` is true (removes Publish and Publish+Send options).
- Default `publishType` set to `'send'` when `disableWebsiteFeatures` is true.
- Skips "email-from-filter" defaulting logic when `disableWebsiteFeatures` is true.

#### `ghost/admin/app/routes/home.js`

- Redirects admin users to `'posts'` instead of `'stats-x'` when `disableWebsiteFeatures` is true.
- Redirects non-contributor users to `'posts'` instead of `'site'` when `disableWebsiteFeatures` is true.

---

## 2. JWT SSO Authentication

**Purpose:** Allows Atlas CMS to authenticate users into Ghost via signed JWT tokens (iframe embedding with auto-login).

### New File (custom, not in upstream): `ghost/core/core/server/adapters/sso/JwtSSOAdapter.js`

- Actually exists in upstream but heavily modified.
- Verifies JWT tokens using a shared secret (HS256).
- Auto-provisions users with configurable default role.
- Domain restriction check is **currently disabled** (commented out) — needs re-enabling for production security.
- Added extensive `logging.info` / `console.log` debug statements (can be cleaned up).

### `ghost/core/core/server/services/auth/session/index.js`

- Added `logging` import.
- Added `logging.info` for session creation logging.
- Added `catch` block in `createSession` to log session creation errors before re-throwing.

### `ghost/core/core/server/web/parent/backend.js`

- Wires up `createSessionFromToken()` middleware on `/ghost` route.
- Added `redirectAfterTokenExchange` middleware: after successful SSO, redirects to strip `?token=` from URL.
- Added debug log when redirect is skipped.
- Minor formatting changes (single → double quotes).

### `ghost/core/core/server/web/admin/controller.js`

- In production: sets `Content-Security-Policy: frame-ancestors 'self' <origin>` for requests from `*.atlas-cms.rest`, `*.iliad.dev`, or `localhost` (any port).
- Falls back to `X-Frame-Options: SAMEORIGIN` for other origins.
- (Previous `adminFrameProtection` config was commented out; replaced with this hardcoded logic.)
- Origin detection checks `req.headers.origin` first, then falls back to parsing `req.headers['referer']` — browsers do NOT send `Origin` on iframe navigational GET requests, but do send `Referer`.

---

## 3. React Admin Root Route Fix

### `apps/admin/src/routes.tsx`

- **v6.25.1 update:** Upstream replaced the catch-all `path: "*"` EmberFallback with an explicit `EMBER_ROUTES` array that includes `"/"`, which subsumes our original fix. Our custom index route was dropped during the merge — upstream's solution handles the same problem.
- ~~Added `{ index: true, Component: EmberFallback }` inside the `path: ""` (ActivityPub wrapper) route's children.~~
- **Original issue:** Ghost v6.21.0's `path: ""` route catches `/ghost/` before EmberFallback. Upstream fixed this in v6.25.1.

---

## 4. Docker / Dev Infrastructure

### `compose.dev.yaml`

- Passes `DISABLE_WEBSITE_FEATURES` env var through to the Ghost container (with empty default).

### `docker/dev-gateway/Caddyfile`

- Added `@sso_token` matcher: any request to `/ghost` or `/ghost/` with a `?token=` query param.
- Routes SSO token requests to the Ghost **backend** (not the admin dev server) so the session is established before the frontend loads.

---

## 5. Configuration Files

### `ghost/core/config.development.json`

- Added SSO adapter config for local development:
    - `active: "JwtSSOAdapter"`
    - `secret: "svTLJKlfRtxa5tB9DuCd3A=="`
    - `allowedDomains: ["iliad.dev", "atlas-cms.rest", "localhost"]`
    - `defaultRole: "Administrator"`, `autoProvision: true`

### `ghost/core/core/shared/config/env/config.production.json`

- Added SSO adapter config for production (same structure, no autoProvision override).
- Minor formatting cleanup (consistent JSON indentation).

---

## 6. Package Scripts

### `package.json`

- Added `dev:kill` script: kills nx/yarn dev processes and brings down Docker containers.

---

## 7. ~~`yarn.lock`~~ (OBSOLETE after v6.29.0 pnpm migration)

- Previously added `bluebird@3.5.4` and `cloudinary@~1.14.0` as transient deps.
- v6.29.0 replaced `yarn.lock` with `pnpm-lock.yaml`. Pnpm resolves these transitives correctly from the dep graph — no explicit pin needed.
- The Cloudinary storage adapter is still a direct dep of `ghost/core/package.json` (not in upstream) and must survive future merges. As of 2026-04-22 the package is `ghost-storage-cloudinary@^3.0.2` (superseded `ghost-cloudinary-store@^3.3.0` — see §20).

---

## 8. iframe postMessage Navigation Sync

**Purpose:** Notifies the parent iframe of Ghost admin navigation events so the embedding Atlas CMS can keep its own URL bar / breadcrumbs in sync with Ghost's hash-based routing.

### `ghost/admin/app/index.html`

- Added inline `<script>` in `<head>` (after `{{content-for "head-footer"}}`) that listens to `hashchange` events and posts `{ type: 'ghost-nav', hash: location.hash }` to `window.parent`.
- Script is a no-op when Ghost is not embedded in an iframe (`window.parent === window`).

### `ghost/core/core/built/admin/index.html`

- Same script injected into the pre-built admin HTML (this is the file actually served in production).
- **Must be re-applied** after any Ember build or Ghost upgrade that regenerates this file.

---

## 9. Pre-commit Hook — Lint-staged Disabled

**Purpose:** Upstream Ghost's lint-staged config catches hundreds of pre-existing lint errors (mostly Tailwind class ordering) when merging upstream changes, blocking commits.

### `.github/hooks/pre-commit`

- Commented out the `yarn lint-staged --relative` call and its exit-on-failure check.
- Submodule removal and ActivityPub version bump prompts are still active.

---

## 10. Atlas Brand Color Override (Green → Purple `#4945FF`)

**Purpose:** Ghost uses green (`#30CF43`) as its primary accent color throughout the admin UI. The Atlas whitelabel overrides this to purple (`#4945FF`) derived from the Atlas brand color.

### Ember Admin (pre-existing, predates v6.25.1)

#### `ghost/admin/app/styles/patterns/global.css`

- `--green: #4945ff` (overrides upstream `#30cf43`)

#### `ghost/admin/app/styles/spirit/_colors-dark.css`

- `--green: #7B78FF` (dark mode variant)

### Admin Signin Button — pink `accent_color` overridden to Atlas purple (new 2026-04-27)

Distinct from the green→purple work above: the Ember admin signin button (`/ghost/signin`) used the publication's `accent_color` site setting (defaults to Ghost brand pink `#FF1A75`) as an inline `background-color` via `<GhTaskButton @useAccentColor={{true}}>`. The button is now hardcoded to Atlas purple `#4945FF`. The `accent_color` setting itself is **not** changed — Portal signin, member emails, and other publication-facing surfaces still respect the tenant's brand color (which a tenant may legitimately want to be something other than Atlas purple).

#### `ghost/admin/app/templates/signin.hbs`

- Removed `@useAccentColor={{true}}` from the "Sign in →" `<GhTaskButton>` (around line 74). No more inline `style="background-color: ${accent_color}"` on the button element.

#### `ghost/admin/app/styles/layouts/auth.css`

- Added `.gh-signin .gh-btn-login:not(.gh-btn-red) { background: #4945FF; }` directly after the existing `.gh-signin .gh-btn-login:hover` rule. The `:not(.gh-btn-red)` lets the failure-state red (`failureClass: 'gh-btn-red'` from `ghost/admin/app/components/gh-task-button.js`) keep working.

`GhTaskButton`'s `useAccentColor` API is **unchanged** and still in use elsewhere across the admin — only the signin template stops opting in.

### Shade / React Admin (new in v6.25.1 upgrade)

v6.25.1 introduced a separate Tailwind v4 color palette in shade and hardcoded `rgba(48,207,67,...)` values across React components, all bypassing the Ember `--green` CSS variable. These are overridden to `#4945FF` / `rgba(73,69,255,...)`.

#### `apps/shade/tailwind.theme.css`

- `--color-green-100: #ECEAFF`, `--color-green-400: #7A77FF`, `--color-green-500: #4945FF`, `--color-green-600: #3633CC`, `--color-green: #4945FF`

#### `apps/shade/src/docs/tokens.mdx`

- Updated example color values to match.

#### Focus-ring CSS token override (new in v6.32.0 upgrade)

v6.32.0 (PR in the shade refactor series) moved input focus rings from hardcoded `rgba(48,207,67,.25)` to a design token `--focus-ring` consumed as `focus-visible:border-focus-ring focus-visible:ring-focus-ring/25`. Per-component rgba overrides are **obsolete** for these files; we override the token once instead.

- `apps/shade/theme-variables.css` — overrides `--focus-ring` in both light (`:root`) and dark mode blocks:
    - Light: `--focus-ring: #4945FF;` (was `var(--ring)` — a gray)
    - Dark: `--focus-ring: #7B78FF;`
- Upstream components (`input.tsx`, `textarea.tsx`, `input-group.tsx`, `admin-x-design-system/src/global/form/*.tsx`) now use the token as-shipped and do **not** need per-file overrides.

#### Remaining hardcoded RGBA replacements (`rgba(48,207,67,...)` → `rgba(73,69,255,...)`):

These upstream files still embed the rgba literal inline and must be re-patched on each upgrade:

- `apps/admin-x-settings/src/components/sidebar.tsx` — search input focus
- `apps/admin-x-settings/src/components/settings/advanced/integrations.tsx` — "Active" badge bg
- `apps/admin-x-settings/src/components/settings/growth/offers/offers-index.tsx` — "Active" badge bg (2 instances)
- `apps/activitypub/src/views/preferences/components/edit-profile.tsx` — handle input focus
- `apps/posts/src/components/label-picker/label-picker.tsx` — focus ring

#### Other hardcoded color replacements:

- `apps/admin-x-design-system/styles.base.css` — `.gh-prose-links a` color
- `apps/admin/src/layout/app-sidebar/shared-views.ts` — `green` in colorMap

#### Koenig-lexical bundle — moved to `@iliad.dev/koenig-lexical` fork (see §21)

Previously a ~66-replacement pnpm patch against the minified bundle (hex + space-separated rgb across green-100/400/500/600). Palette is now compiled into the source fork `@iliad.dev/koenig-lexical`, installed in place of `@tryghost/koenig-lexical` via a pnpm alias override. No patch file, no bundle replacements, no post-patch copy step, no `?v=HASH` cache-bust dance.

Historical palette mapping (retained for fork maintainers):

| From (Ghost green)               | To (Atlas purple)                | Semantic                  |
| -------------------------------- | -------------------------------- | ------------------------- |
| `#30cf43` / `rgb(48 207 67/…)`   | `#4945ff` / `rgb(73 69 255/…)`   | 500                       |
| `#2ab23a` / `rgb(42 178 58/…)`   | `#3633cc` / `rgb(54 51 204/…)`   | 600 (active button state) |
| `#e1f9e4` / `rgb(225 249 228/…)` | `#eceaff` / `rgb(236 234 255/…)` | 100                       |
| `#58da67` / `rgb(88 218 103/…)`  | `#7a77ff` / `rgb(122 119 255/…)` | 400                       |

---

## 11. ~~Docker Build Fix — Shade `glob` Dependency~~ (OBSOLETE after v6.29.0)

**Status:** No longer required. Upstream declared `glob@^10.5.0` as a direct dev-dependency of `apps/shade` (PR #27017 / pnpm migration). Pnpm's strict resolution eliminates the yarn-hoisted `brace-expansion` conflict that motivated this workaround.

- v6.32.0 `apps/shade/vite.config.ts` uses `import {globSync} from 'glob'`; our previous `readdirSync` fork has been removed.
- Kept in this catalogue as historical context for anyone reviewing old commits.

---

## 12. Email-Safe Gallery Layout

**Purpose:** Upstream Ghost renders gallery cards with `<div>` rows using `display: flex`. Email clients (Outlook especially, but also Gmail web, Yahoo, many dark-mode preprocessors) don't reliably honor flex/grid, so gallery images collapse to a single stacked column in delivered emails. This change makes galleries render as proportional `<table>` layouts when `target === 'email'` so the editor's multi-column layout is preserved in newsletters. Web/HTML rendering is unchanged.

**Mechanism:** The local Koenig gallery renderer (already overridden in this fork — registered at `ghost/core/core/server/services/koenig/node-renderers/index.js:21`) branches on `options.target === 'email'`. For email, each gallery row is emitted as a `<table class="kg-gallery-row">` with one `<td class="kg-gallery-image">` per image. Each cell's `width` attribute is computed from that image's aspect ratio divided by the row's total aspect sum (matching the web's `flex: ratio` behavior). The inlined email stylesheet is updated so multi-image rows don't force each image to full width.

### `ghost/core/core/server/services/koenig/node-renderers/gallery-renderer.js`

Inside the `rows.forEach` loop (the code that builds each gallery row):

1. **Added `const isEmail = options.target === 'email';`** before the loop.
2. **Branched row-container creation** inside the loop:
    - If `isEmail`: create a `<table>` with attributes `class="kg-gallery-row"`, `role="presentation"`, `cellspacing="0"`, `cellpadding="0"`, `border="0"`, `width="100%"`, and inline `style="width:100%;border-collapse:collapse;table-layout:fixed;"`. Append a `<tr>` to it. Set `rowContainer = table` and `rowInsertionPoint = tr`.
    - Else: build the original `<div class="kg-gallery-row">` and set both `rowContainer` and `rowInsertionPoint` to it.
3. **Computed aspect-based column widths** before the inner `row.forEach`:
    ```js
    const aspectRatios = row.map((image) =>
        image.width && image.height ? image.width / image.height : 1,
    );
    const aspectSum = aspectRatios.reduce((sum, r) => sum + r, 0) || row.length;
    ```
4. **Branched image-cell creation** inside `row.forEach`:
    - If `isEmail`: create a `<td class="kg-gallery-image">` with `width="${pct.toFixed(2)}%"` (pct = `aspectRatios[colIdx] / aspectSum * 100`), `valign="top"`, and inline `style="padding:0 4px;vertical-align:top;"`.
    - Else: create the original `<div class="kg-gallery-image">`.
    - Renamed the variable from `imgDiv` → `imgCell` throughout so it works for both branches.
5. **Added inline `<img>` style for email** at the end of the existing `if (options.target === 'email')` block (just after the Unsplash URL branch):
    ```js
    img.setAttribute(
        "style",
        "display:block;width:100%;height:auto;max-width:100%;",
    );
    ```
6. **Updated `.appendChild` calls** at the end of `row.forEach` to use `imgCell` instead of `imgDiv`, and `rowInsertionPoint` instead of `rowDiv`.
7. **Updated the container append** at the end of `rows.forEach` to `container.appendChild(rowContainer)`.

All existing email-only logic (image resize to 600px, retina `/size/w{1200}/` src, Unsplash `?w=1200`, skipping srcset for email) was left untouched — it still runs on the `<img>` before it's inserted into the `<td>`.

### `ghost/core/core/server/services/email-rendering/partials/card-styles.hbs`

Replaced the `.kg-gallery-container` and `.kg-gallery-image img` rules (previously lines 145–158) with table-aware rules:

- `.kg-gallery-container { margin-top: 0; }` (was `-20px`; spacing is now handled by `table.kg-gallery-row { margin-top: 20px }`).
- Added `table.kg-gallery-row { margin-top: 20px; border-collapse: collapse; table-layout: fixed; width: 100%; }`.
- Added `td.kg-gallery-image { padding: 0 4px; vertical-align: top; }`.
- Changed `.kg-gallery-image img` from `width: 100% !important; height: auto !important; padding-top: 20px;` to `display: block; max-width: 100%; height: auto;` so the table cell controls width.
- Kept the `hasRoundedImageCorners` branch (now simplified to just `border-radius: 6px`).

### Upgrade guidance

On each upstream Ghost merge, diff these files and re-port any upstream changes into our email branch:

- `node_modules/@tryghost/kg-default-nodes/lib/nodes/gallery/gallery-renderer.js` — the upstream reference. If upstream adds new image attributes or retina logic, mirror them into our local override's `isEmail` path.
- `ghost/core/core/server/services/koenig/node-renderers/gallery-renderer.js` — our local override. Conflicts here are expected on upgrade; keep the `isEmail` table branch intact.
- `ghost/core/core/server/services/email-rendering/partials/card-styles.hbs` — if upstream changes the `.kg-gallery-*` selectors, re-apply the table-cell variant above.

### Verification

1. `yarn dev` and create a post with a gallery containing mixed-aspect-ratio images (e.g. a 3-image row + a 2-image row + a portrait/landscape mix).
2. Publish as an email newsletter to a test member; open in Mailpit (`http://localhost:8025`) → "View HTML" to confirm `<table class="kg-gallery-row">` with proportional `<td width="...%">` cells.
3. Forward the Mailpit email to Gmail (web + iOS) and Outlook (desktop or OWA) — images should sit side-by-side matching editor proportions, not stacked.
4. Open the same post on the public site — gallery should still render as the original flex `<div>` layout (unchanged).

---

## 13. Docker Build Fix — Drop `transform-encoder` Caddy Module

**Purpose:** Unblock `yarn dev` when caddyserver.com's on-demand build API (`/api/download`) is hanging. Upstream's Dockerfile runs `caddy add-package github.com/caddyserver/transform-encoder`, which depends on that API compiling a custom Caddy binary on their servers. When the API stalls (confirmed hanging for both arm64 and amd64 from direct host curl, April 2026), the image build times out after ~180s with `unexpected EOF`.

The module was used by exactly one line in the Caddyfile — a dev-only Apache-style access log format — so the cheapest fix is to drop it and use Caddy's built-in `console` log format.

### `docker/dev-gateway/Dockerfile`

- Removed line: `RUN caddy add-package github.com/caddyserver/transform-encoder`.
- Image now uses `caddy:2-alpine` as-is (no on-demand binary rebuild).

### `docker/dev-gateway/Caddyfile`

- Changed log format from `format transform "{common_log}"` to `format console` (built-in, no extra module required).

### Upgrade guidance

If upstream re-adds `caddy add-package` for transform-encoder or any other module:

- Leave it removed unless the module becomes functionally required (not just cosmetic logging).
- If a module becomes required, switch the Dockerfile to a multi-stage `xcaddy build` to avoid the caddyserver.com dependency entirely.

---

## 14. Image Width Control in Koenig Editor

**Purpose:** Give newsletter writers granular control over image sizing. Originally shipped as four percentage presets (25% / 33% / 50% / 75%) on top of upstream's Regular / Wide / Full via a pnpm-native bundle patch. As of 2026-04-24 the editor-package side of this moved to the `@iliad.dev/koenig-lexical` fork (see §21), which replaces the four presets with a **single numeric max-width input** (pixels). The consumer-side backend renderer and CSS below still reflect the old preset contract and are scheduled for migration to the fork's new `data-kg-max-width` attribute contract.

**Current mechanism:**

- **Editor UI + WYSIWYG:** compiled into `@iliad.dev/koenig-lexical` source; no patch in this repo. Installed via pnpm alias override (§21).
- **Backend renderer + email/site CSS:** still in this repo (see subsections below). ⚠ **Stale:** still keyed on the old `cardWidth` string presets (`quarter`/`third`/`half`/`threequarters`). Leave as-is until the fork's first release; then migrate to read `data-kg-max-width` (or equivalent numeric attribute) from the serialized node.

### Legacy `cardWidth` values (retained in backend code pending migration)

| Setting       | `cardWidth` value | Email width |
| ------------- | ----------------- | ----------- |
| Quarter       | `quarter`         | 150px       |
| Third         | `third`           | 200px       |
| Half          | `half`            | 300px       |
| Three-quarter | `threequarters`   | 450px       |

### Backend ⚠ stale — pending migration to fork's numeric contract

- `ghost/core/core/server/services/koenig/node-renderers/image-renderer.js`
    - Added `PERCENT_BY_CARD_WIDTH` map at module top.
    - Email output path now computes target width from percentage (`Math.round(600 * percent)`) rather than a fixed 600px cap. Non-percentage widths (`regular` / `wide` / `full` / undefined) fall through to the original 600px behavior.
    - Retina-src logic (`srcWidth >= 1200`) unchanged — higher-resolution source files are still used even when display width is smaller.
    - Web rendering is already free — the existing `kg-width-${node.cardWidth}` class emission at lines 34-36 handles any string, so `kg-width-half` etc. land on the figure automatically.

### Email Styles ⚠ stale — pending migration to fork's numeric contract

- `ghost/core/core/server/services/email-rendering/partials/card-styles.hbs` — `.kg-image-card.kg-width-{quarter,third,half,threequarters}` rules with `width: X% !important`, matching `max-width: {150,200,300,450}px`, centered, `display: block`.

### Site Frontend Styles ⚠ stale — pending migration to fork's numeric contract

- `ghost/core/core/frontend/src/cards/css/image.css` (**new file**) — `.kg-image-card.kg-width-{quarter,third,half,threequarters}` rules with plain `width: X%; margin: 0 auto; display: block;`.
- **Delivery:** Ghost bundles `ghost/core/core/frontend/src/cards/css/*.css` into `cards.min.css` (see `ghost/core/core/frontend/services/assets-minification/card-assets.js`). Themes opt in via `"card_assets": true` in their `package.json`; if a theme uses an explicit `include` list, it must add `"image"` to pick these rules up. Ghost's default Casper/Source themes use `card_assets: true`.
- **Upstream coordination risk:** Ghost does not currently ship an `image.css` — image card widths have always been theme responsibility. If upstream ever adds their own `image.css` with conflicting rules (e.g. for `.kg-width-full`), expect a file-add conflict on merge; favor concatenating their rules after ours so upstream's `regular`/`wide`/`full` styling wins while our percentage rules remain.

### Upgrade guidance

Editor-package upgrades are now owned by the `@iliad.dev/koenig-lexical` fork — see §21. In this repo, bumping is a one-line version change to the `pnpm.overrides` alias. No patch to regenerate, no UMD copy step, no browser cache-bust needed beyond ordinary `pnpm build`.

**Follow-up migration** (pending fork's first release): once the fork ships the numeric-width contract, replace the four `kg-width-{preset}` branches in `image-renderer.js`, `card-styles.hbs`, and `image.css` with logic that reads the fork's numeric attribute (expected: `data-kg-max-width` in px on the `<figure>`). Delete this section's ⚠ stale markers after that migration lands.

---

## 15. Docker Build Fix — Copy `patches/` into `ghost-dev` Image

**Purpose:** Patches in `patches/` (currently just `ghost-storage-cloudinary@3.0.2.patch` — see §20; the former koenig-lexical patch was retired in favor of the fork in §21) are referenced from `package.json` under `pnpm.patchedDependencies`. When the `ghost-dev` Docker image builds, `pnpm install --frozen-lockfile` runs inside the container; if `patches/` isn't copied in, pnpm fails with `ENOENT: no such file or directory, open '/home/ghost/patches/...'`.

Upstream's Dockerfile doesn't need this because upstream has no patches. Added in this fork to keep `pnpm dev` working.

### `docker/ghost-dev/Dockerfile`

- Added `COPY patches patches` right before the `pnpm install` step (after `.github/scripts` and `.github/hooks` copies).
- No `.dockerignore` exclusion needed — `patches/` isn't in `.dockerignore`.

### Upgrade guidance

On each upgrade, re-confirm this `COPY patches patches` line is still present. Upstream may refactor the Dockerfile's layer ordering at any time.

---

## 16. `Dockerfile.railway` — rewritten for pnpm 10

**Purpose:** `Dockerfile.railway` is a fork-only image used by `scripts/docker-push` to build a self-contained Railway deployment (bakes the full monorepo + built admin into the image, no bind mounts). It was written in the yarn-classic era and broke after the upstream pnpm migration (§top-of-file note, PR #27017).

**Symptoms before fix:** `sh scripts/docker-push` failed at multiple stages with `"/yarn.lock": not found`, `"/.github/scripts/install-deps.sh": not found`, then later `Cannot find module 'esbuild'` in the assets builder, then `Cannot find module 'postcss-import'` in the admin-x-settings builder.

**Root cause of the per-app failures:** the original Dockerfile used a multi-stage `FROM development-base AS X-builder` + `RUN cd apps/X && pnpm build` pattern, one stage per workspace. This worked under yarn classic because yarn always hoists every transitive dep to the root `/home/ghost/node_modules`, so `require('postcss-import')` from anywhere walked up and found it. Under pnpm 10 with `shamefully-hoist=false`, transitive deps are only reachable through pnpm's per-binary NODE_PATH injection — which only kicks in when pnpm itself launches the binary, and is fragile in our cross-stage `COPY` graph (the per-stage symlink farm doesn't survive being assembled from multiple builder stages).

### `Dockerfile.railway` — full rewrite (deps + builder + runtime)

Replaced the ten per-app builder stages with a single `builder` stage that runs `pnpm build` from the workspace root. `pnpm build` resolves to `pnpm nx run-many -t build` (per root `package.json`), which is the same invocation upstream's CI uses (`.github/workflows/ci.yml` line ~1589: `pnpm nx build ${{ matrix.package_name }}`). Nx orchestrates the dependency graph, runs each workspace's build through pnpm from root, and gets the correct NODE_PATH so transitive deps like `postcss-import` resolve via the `node_modules/.pnpm/node_modules/` hoist.

Final shape: `base` → `deps` (manifests + `pnpm install --frozen-lockfile`) → `builder` (full source + `pnpm build` + `pnpm --filter ghost build:assets`) → `runtime` (single `COPY --from=builder /home/ghost /home/ghost`).

Trade-off: less granular Docker layer caching (any source change rebuilds everything), in exchange for matching upstream's blessed build path. The `--mount=type=cache,target=/root/.local/share/pnpm/store` mount keeps install fast across rebuilds.

### `ghost/core/package.json` — added `esbuild` devDependency

`ghost/core/bin/minify-assets.js` (called by `pnpm build:assets:js`) does `require('esbuild')`, but no workspace declares esbuild as a direct dep — it only exists transitively via vite/tailwind. When pnpm runs scripts, it sets NODE_PATH for direct binary invocations (e.g. `vite`), but not for plain `node bin/foo.js` calls inside scripts. So `node bin/minify-assets.js` doesn't get NODE_PATH, can't see `.pnpm/node_modules/esbuild`, and fails.

Upstream papers over this in `ghost/core/package.json` script `pack:standalone`, which appends `shamefully-hoist=true` to the `.npmrc` written into the `npm pack` tarball before that tarball is consumed by `Dockerfile.production`. Source builds (our Dockerfile) don't go through `pack:standalone`, so they hit the bug.

Upstream itself had `"esbuild": "0.19.11"` in `ghost/core` devDependencies until commit `5705c6cfa1` (2025-04-23, "Reverted bundled frontend scripts changes (#23005)"), which removed it without removing the still-used `bin/minify-assets.js` — an upstream regression.

Re-added `"esbuild": "0.25.12"` to `ghost/core/package.json` devDependencies (alphabetically between `detect-newline` and `expect`). Picked 0.25.12 because that's a version already resolved transitively in `pnpm-lock.yaml` (avoids adding a new major version to the install graph). `pnpm-lock.yaml` regenerated by `pnpm install` (3-line addition).

Verified locally: `cd ghost/core && pnpm build:assets` now produces `ghost.min.css` plus the five `*.min.js` files (`comment-counts`, `ghost-stats`, `member-attribution`, `admin-auth/admin-auth`, `private`). Without esbuild present, this raises `Cannot find module 'esbuild'`.

### Upgrade guidance

- On each upgrade, re-confirm `Dockerfile.railway` is still using the single-builder pattern with `pnpm build` from root. Upstream doesn't ship this file. If the set of workspaces changes (new `apps/*` added), the per-workspace `package.json` COPY list in the `deps` stage must be extended, otherwise `pnpm install --frozen-lockfile` fails naming the missing workspace.
- Re-confirm the `esbuild` devDependency in `ghost/core/package.json` survived the merge. If upstream re-adds esbuild themselves, drop our entry in favor of theirs (compare versions). If upstream rewrites `bin/minify-assets.js` to not need esbuild, remove our entry. `pnpm --filter ghost build:assets:js` from root is a fast smoke test.

---

## 17. `admin-x-settings` — declare phantom postcss plugins

**Symptom:** `sh scripts/docker-push` (and any Node 22 invocation of `pnpm nx build @tryghost/admin-x-settings`) crashes with `Cannot find module 'postcss-import'` and `Require stack: /home/ghost/apps/admin-x-settings/postcss.config.cjs`, then `triggerUncaughtException` from `node:internal/process/promises`.

**Root cause:** `apps/admin-x-settings/postcss.config.cjs` re-exports the design-system config via `module.exports = require('@tryghost/admin-x-design-system/postcss.config.cjs')`. That config names three plugins as strings (`postcss-import`, `@tailwindcss/postcss`, `autoprefixer`). Vite's bundled postcss-load-config resolves those names with `createRequire(<config file path>)` — anchored at `apps/admin-x-settings/postcss.config.cjs`, not at the design-system file it re-exports. The three plugins are declared only in `admin-x-design-system/package.json`, so under strict pnpm (`shamefully-hoist=false`, PR #27343) they're absent from `apps/admin-x-settings/node_modules/` and Node resolution fails. Vite's `cssPlugin` fires `resolvePostcssConfig(config)` without await/catch, so the rejection becomes an unhandled rejection — fatal on Node 22, tolerated on Node 20 (hence why local dev masks the bug; Docker uses Node 22 because `ghost/core` requires `^22.13.1`). This is a latent upstream bug in commit `dc2ae810f4` (phantom deps missed for admin-x-settings).

### `apps/admin-x-settings/package.json` — added three devDependencies

Added `@tailwindcss/postcss: 4.2.1`, `autoprefixer: 10.4.21`, `postcss-import: 16.1.1` — matching the exact versions pinned in `apps/admin-x-design-system/package.json`, so pnpm dedupes to the single already-installed `.pnpm` entry rather than pulling a second copy. `pnpm-lock.yaml` regenerated by `pnpm install`.

Verified: `docker run --rm -v "$PWD:/work" -w /work node:22.18.0-bullseye-slim bash -c "corepack enable && pnpm nx build @tryghost/admin-x-settings"` exits 0 after the fix (crashed before it).

### Upgrade guidance

On each upgrade, confirm `postcss-import`, `autoprefixer`, and `@tailwindcss/postcss` are still in `apps/admin-x-settings/package.json` devDependencies. If upstream adds them itself (they should — this is a legitimate bug in their phantom-deps audit), drop our entries in favor of theirs. If upstream rewrites `admin-x-design-system/postcss.config.cjs` to export resolved plugin instances instead of string names (e.g. `require('postcss-import')()` in the config itself), our declarations become unnecessary and can be removed.

---

## 18. `Dockerfile.railway` — `ENV NODE_PATH` + serial nx builds

Two independent issues surfaced during the Node-22 Docker build after §17 unblocked admin-x-settings. Both fixes live in the builder stage of [Dockerfile.railway](Dockerfile.railway).

### 18a. `ENV NODE_PATH=/home/ghost/node_modules/.pnpm/node_modules`

**Symptom:** `@tryghost/posts:build` failed with `Rollup failed to resolve import "clsx" from .../admin-x-design-system/es/global/form/color-picker.js`; `ghost-admin:build` failed with `Cannot find module 'lodash/camelCase'` from `ghost/admin/lib/asset-delivery/index.js`.

**Root cause:** Three phantom-dep sites all resolve the same way — code outside the workspace manifest graph that `require()`s or `import`s a transitive dep:

1. `ghost/admin/lib/asset-delivery/index.js` line 7: `const camelCase = require('lodash/camelCase')`. The nested addon has no `package.json` deps; lodash comes from ember-cli's transitive tree. pnpm's shell wrapper at `ghost/admin/node_modules/.bin/ember` injects NODE_PATH for ember-cli itself, but that covers only ember-cli's own descendants, not addon subprocesses.
2. `apps/admin-x-design-system/es/*.js`: admin-x-design-system's vite config externalizes every bare-specifier import (`clsx`, `lucide-react`, `@radix-ui/*`, etc.) into its emitted `es/` output. When posts/stats/activitypub Rollup those files in lib mode, Rollup re-resolves the externals from the importing workspace — which doesn't redeclare them.
3. String-named plugins in re-exported `postcss.config.cjs` files (see §17, plus comments-ui surfacing `Cannot find module 'resolve'` transitively from postcss-import).

**Fix:** Point `NODE_PATH` at pnpm's virtual store root (`node_modules/.pnpm/node_modules`), which has a single-level-flat layout of every installed package. This restores the yarn-classic-era fallback resolution without turning on `shamefully-hoist=true` across the whole install (which would bloat the image).

### 18b. `--parallel=1` on the nx build

**Symptom:** After §18a fixed the phantom-dep resolution, posts still failed mid-build with jest-dom type errors (`Property 'toBeInTheDocument' does not exist on type 'Assertion<HTMLElement>'`) and `TS2307: Cannot find module '@tryghost/admin-x-framework'`.

**Root cause:** `nx.json` sets `parallel: 4`. Under a cold Docker filesystem, Nx queues posts:build before admin-x-framework has finished writing its `dist/` and `types/`, even though the dependency is declared (visible in `pnpm nx graph`). Posts' `tsc` then sees partial/missing upstream types. The build log showed `> nx run @tryghost/posts:build` at 67s and `> nx run @tryghost/admin-x-framework:build` at 94s — out of topological order for the same reason.

**Fix:** Swap `pnpm build` for `pnpm nx run-many -t build --parallel=1`. Serializing the build graph is slower (single-threaded through the tsc/vite chain) but deterministic. The `pnpm-store` cache mount keeps pnpm install fast across rebuilds, so total wall-clock is still dominated by CPU-bound compile work, not I/O.

Verified end-to-end: `sh scripts/docker-push` (equivalent to `docker buildx build --platform linux/amd64 --no-cache -f Dockerfile.railway`) now runs all 16 nx projects to completion and the builder stage exits 0.

### Upgrade guidance

Both fixes are Docker-build-only shims. Upstream Ghost doesn't hit them because their CI uses `pnpm nx run @tryghost/admin:build` (narrower subgraph that happens to respect topology) and runs in an environment where the ember wrapper's own NODE_PATH suffices for asset-delivery.

- If upstream declares the phantom deps explicitly (clsx et al. as posts/stats/activitypub deps; lodash as an asset-delivery devDep), drop the `ENV NODE_PATH` line.
- If upstream fixes the nx parallel-scheduling bug (or we move to a newer nx that fixes it), revert to `pnpm build` and drop `--parallel=1`. Benchmark: serial build is ~2× slower than parallel=4 on this repo.

---

## 19. Docker push-speed: split runtime COPY + enable BuildKit cache

Self-contained change to cut push time on incremental deploys from ~15 min to <1 min. Does not affect runtime behavior; purely a layering / caching optimization.

### 19a. Runtime stage — split the monolithic `COPY --from=builder`

**Symptom:** Every `sh scripts/docker-push` re-transmitted a ~3GB layer to Docker Hub, even when only ghost/core source changed. Slow pushes felt like a hang on the 2.98GB layer.

**Root cause:** `COPY --from=builder /home/ghost /home/ghost` flattens node_modules + all workspaces + build artifacts into one giant Docker layer. Any file change busts it; the whole thing re-uploads.

**Fix:** Replace the single COPY with per-directory COPYs ordered stable → volatile (node_modules first, ghost/core last). See the runtime stage in [Dockerfile.railway](Dockerfile.railway). Each COPY is its own layer, so BuildKit caches them independently. Typical edits only touch `ghost/core/`, so only the last ~50MB layer re-uploads.

### 19b. Removed `--no-cache` from `scripts/docker-push`

`--no-cache` forces a clean rebuild + full re-upload every invocation, defeating 19a. Dropping it lets BuildKit's local cache (on the Mac, in the `docker-container` builder) reuse the deps and builder stages across builds when `pnpm-lock.yaml` hasn't changed.

### Upgrade guidance

- If upstream ever adds a `Dockerfile.railway` (unlikely — it's fork-only), diff theirs against our split runtime stage.
- The runtime stage copies the `apps/` tree wholesale (so new apps/\* workspaces are picked up automatically), but enumerates `ghost/i18n`, `ghost/parse-email-address`, `ghost/admin`, `ghost/core` individually. If a new `ghost/<newpkg>` workspace is added, add a matching `COPY --from=builder` line for it, otherwise Ghost will fail to resolve it at runtime.
- The single-COPY original is preserved in git history (pre-§19) if a rollback is needed.

---

## 20. Cloudinary storage adapter — upgraded to `ghost-storage-cloudinary@3.0.2`

**Symptom (2026-04-22):** Production image uploads on the Railway image returned a generic `"Could not upload image /tmp/<hash>_processed"` error with no underlying cause attached. The shipped `ghost-cloudinary-store@3.3.0` (last npm publish 2019) discards the Cloudinary SDK error object at `index.js:49` and throws a plain `Error` with just the local path — so Railway logs never show _why_ uploads fail.

**Root cause of the silent failure:** `ghost-cloudinary-store@3.3.0` pins `cloudinary@~1.14.0` (2019-era SDK) and the now-deprecated `request` HTTP library. Neither has any known upstream fix path. The author (eexit) published a full rewrite under a new package name years ago; the whitelabel was still on the old one.

### `ghost/core/package.json`

- Replaced `"ghost-cloudinary-store": "^3.3.0"` with `"ghost-storage-cloudinary": "^3.0.2"` (sorted alphabetically — now sits between `ghost-storage-base` and `glob`).

### `ghost/core/core/shared/config/env/config.production.json`

- `storage.active`: `"ghost-cloudinary-store"` → `"atlas_cloudinary"` (see alias adapter below — originally bumped to `"ghost-storage-cloudinary"` on 2026-04-22 but renamed 2026-04-23 to get rid of the hyphens).
- Config block key `storage["ghost-cloudinary-store"]` → `storage["atlas_cloudinary"]`.
- Auth fields intentionally left empty (`""`) so nothing leaks into the baked image; all three `auth.*` values are supplied at runtime via Railway env vars.
- Renamed nested block `display` → `fetch` (v3 renamed this config block; see [`ghost-storage-cloudinary/index.js:25`](https://github.com/eexit/ghost-storage-cloudinary/blob/master/index.js#L25) — `config.fetch || legacy.image || {}`). The `quality` / `secure` / `cdn_subdomain` keys inside are unchanged and still flow to `cloudinary.url(publicId, fetchOptions)` during URL generation.

### `ghost/core/core/server/adapters/storage/atlas_cloudinary.js` (new, alias)

A one-line passthrough: `module.exports = require('ghost-storage-cloudinary');`. Its purpose is purely naming — it lets us pick a shell-safe `storage.active` key.

- **Why the alias exists:** env var names with hyphens (e.g. `storage__ghost-storage-cloudinary__auth__cloud_name`) are rejected by POSIX shells (`VAR=val` requires `[A-Za-z_][A-Za-z0-9_]*`). Some container platforms strip or drop them when propagating env vars through a shell. Using an underscore-only alias (`atlas_cloudinary`) makes the env var names shell-portable: `storage__atlas_cloudinary__auth__cloud_name=…` works everywhere.
- **Why this name specifically:** `cloudinary` would collide with the Cloudinary SDK npm package — Ghost's adapter manager ([adapter-manager.js:120-146](ghost/core/core/server/services/adapter-manager/adapter-manager.js#L120-L146)) checks node_modules first; if `require('cloudinary')` resolves, it loads the SDK and fails the `instanceof StorageBase` check instead of falling through to our adapter. `atlas_cloudinary` is project-specific and has no npm collision.
- **Why `core/server/adapters/storage/` and not `content/adapters/storage/`:** the original placement under `content/adapters/` got shadowed at runtime on any instance with a persistent volume mounted at `content/` (Docker's volume mount hides everything the image baked at that path). Ghost's adapter manager searches three locations in order — node_modules, `content/adapters/`, then `core/server/adapters/` (the `internalAdaptersPath` in [overrides.json:10](ghost/core/core/shared/config/overrides.json#L10)). The third location is inside `ghost/core/` which is never volume-mounted, so an adapter placed there survives regardless of the instance's volume setup. This is where upstream Ghost's own `LocalFilesStorage`, `S3Storage`, etc. live, so we're following the same convention.
- **The underlying `ghost-storage-cloudinary@3.0.2` package (with its patches) is still the real adapter** — the wrapper just re-exports it. Patches continue to apply unchanged.

### Key differences vs the old adapter

- `cloudinary@^2.6.0` (vs `~1.14.0` in the old) — modern SDK, no `request` dep.
- `got@^11` for the `read()` path (vs deprecated `request`).
- Errors now wrap the underlying Cloudinary SDK error via `@tryghost/errors` `InternalServerError` subclass `CloudinaryAdapterError` — the real SDK error flows through `err.err`. **Note:** this is not quite enough on its own — Ghost's `GhostLogger.js:462-477` error serializer whitelists `{id, code, name, statusCode, level, message, context, help, stack, hideStack, errorDetails}` and drops the `err` field, so the wrapped SDK error was invisible in Railway logs. See the patch section below.
- New optional features (all off by default, config shape unchanged from our use):
    - `useDatedFolder: true` — appends `YYYY/MM` to the upload folder.
    - `plugins.retinajs` — adds retina variants on upload.
- Engines: `"node": "^18"`. Our `.npmrc` sets `engine-strict=false`, so pnpm install on Node 22 emits a warning but does not fail. Verified in the Docker build — the package installs and loads correctly.

### Upgrade guidance

- If the fork's `CLOUDINARY_URL` env var is ever removed from Railway, the Ghost config's `storage.ghost-storage-cloudinary.auth` block is the sole source of credentials — the Cloudinary SDK's env-var fallback won't rescue the upload path.
- If bumping `ghost-storage-cloudinary` to a 4.x major, check whether the config shape changes again (`fetch` block, upload options, plugin keys). The v2 → v3 rename was `display` → `fetch`; watch for similar renames on the next bump.
- Dead code to clean up (not blocking): the old local adapter fork at `ghost/core/content/adapters/storage/cloudinary-store/` is no longer referenced by any `active` config. It can be deleted in a follow-up cleanup commit.

### Diagnostic patch — `patches/ghost-storage-cloudinary@3.0.2.patch`

Added 2026-04-23 because the swap alone did not produce visible errors in Railway logs. Two things block visibility of the underlying Cloudinary error:

1. Ghost's `GhostLogger.js:462-477` `err` serializer drops the wrapped `.err` property (see note above).
2. `DEBUG=ghost-storage-cloudinary:*` in Railway does print the full error via `debug('cloudinary.uploader:error', err)`, but the stderr stream is interleaved with Ghost's ERROR log in Railway's collector and visibly truncates the debug output mid-object.

The patch is a ~4-line surgical edit to `index.js` `uploader()` (the upload reject path only — `delete()` and `read()` left untouched) that:

- Adds `console.error('[ghost-storage-cloudinary] upload failed:', err.message, '|', JSON.stringify(err))` as a synchronous stdout write, avoiding the stderr/ERROR-log interleave problem.
- Sets `context: (err && (err.message || err.http_code)) ? ...` on the thrown `CloudinaryAdapterError` so the real error flows through Ghost's allow-listed `context` field into both the log output and the API response JSON.

Registered in root `package.json` under `pnpm.patchedDependencies` alongside the existing koenig-lexical patch (§14). Generated via `pnpm patch ghost-storage-cloudinary@3.0.2` → edit → `pnpm patch-commit`.

**Upgrade guidance:** on the next `ghost-storage-cloudinary` bump, the patch will almost certainly fail to apply if upstream restructures the `uploader()` method. Regenerate with the same approach. If upstream ever fixes this themselves (PR them a `context` field on `CloudinaryAdapterError`), the patch becomes unnecessary — drop it.

### Verification

1. `pnpm install` — lockfile cleanly switches from `ghost-cloudinary-store@3.3.0` to `ghost-storage-cloudinary@3.0.2` (the old package is fully purged from `pnpm-lock.yaml`).
2. Rebuild: `sh scripts/docker-push`.
3. Deploy to Railway. Remove the temporary `DEBUG=ghost-storage-cloudinary:*` env var — no longer needed with the patch.
4. Upload an image via the admin. On success, no change in behavior. On failure, the Railway log will contain a line starting `[ghost-storage-cloudinary] upload failed:` with the real SDK error, _and_ the API response's `errors[0].context` field will contain the real error message + http_code.

#### Phase 3 diagnostic hunk (temporary — remove once root cause found)

Added 2026-04-23 after Phase 2 exposed `Invalid cloud_name gcollective-cloud (http 401)` despite the same credentials working on older Docker images. That 401 message is Cloudinary's generic "signature verification failed" response — so either the secret the SDK ends up with is not the one we wrote in `config.production.json`, or it is and something else (clock, form-data boundary, TLS) is corrupting the signed request.

The patch adds three `console.log` calls right after `cloudinary.config(auth)` in the adapter constructor (around `index.js:40`), printing:

- The SDK's **effective** config (after env-var merging) via `cloudinary.config()`
- The `auth` object the constructor was passed (from Ghost's nconf-resolved config)
- The raw `process.env.CLOUDINARY_URL` value

Compare the boot log against a working older-image instance's boot log to find the divergence.

**Remove when root cause is identified:** regenerate the patch with only the error-surfacing `console.error` + `context:` hunk in `uploader()`. Leave those in — they're a net improvement regardless of this specific incident.

---

## 21. Koenig editor fork — `@iliad.dev/koenig-lexical`

**Purpose:** Replace the minified-bundle pnpm patch against `@tryghost/koenig-lexical` (previously §10 Koenig subsection + §14 editor bits) with a source fork published as `@iliad.dev/koenig-lexical`. The fork compiles the Atlas palette and the image max-width control into readable source, so upgrades no longer involve re-deriving minified variable names from each new bundle.

**Fork responsibilities:**

1. Atlas purple palette replacing Ghost green everywhere (shades 100/400/500/600 — see §10 mapping table).
2. Image card toolbar: removes the four percentage presets and the upstream Regular/Wide/Full buttons; replaces them with a single numeric max-width (px) input. Serializes as a numeric attribute on the image node (planned contract: `data-kg-max-width` on the `<figure>`). Source fork lives at `@iliad.dev/koenig-lexical` on npm; see the fork's repo for implementation.

**Wire-up in this repo:**

### `package.json` — pnpm alias override

```json
"pnpm": {
  "overrides": {
    "@tryghost/koenig-lexical": "npm:@iliad.dev/koenig-lexical@1.1.4",
    ...
  }
}
```

This makes pnpm install the fork's tarball into the `node_modules/@tryghost/koenig-lexical` directory, so all existing code paths — direct imports in `apps/admin/src/utils/fetch-koenig-lexical.ts`, `apps/admin-x-framework/src/test/render.tsx`; the Ember `app.import('node_modules/@tryghost/koenig-lexical/dist/koenig-lexical.umd.js', ...)` at `ghost/admin/ember-cli-build.js:271`; `require.resolve('@tryghost/koenig-lexical')` in `ghost/admin/lib/asset-delivery/index.js` — transparently pick up the fork. No source imports needed updating.

**Direct deps** remain pinned at `@tryghost/koenig-lexical@1.7.30` in [ghost/admin/package.json](ghost/admin/package.json), [apps/admin-x-framework/package.json](apps/admin-x-framework/package.json), [apps/admin/package.json](apps/admin/package.json). The override supersedes these regardless of the declared version — intentional, so upstream Ghost merges touching those manifests produce no conflicts.

**Built-asset delivery** is unchanged. The Ember `asset-delivery` addon still copies `dist/` into `ghost/admin/dist/ghost/assets/koenig-lexical/`, `ghost/core/core/built/admin/assets/koenig-lexical/`, and `apps/admin/dist/assets/koenig-lexical/` on each build. Gitignored; regenerated every build.

### Upgrade guidance

- **Ghost version bumps:** no patch regeneration required. Merge upstream, run `pnpm install`, done.
- **Fork version bumps:** change the version spec inside the override (e.g. `^1.1.0`) and `pnpm install`.
- **Upstream Koenig bumps:** handled in the fork's repo (merge upstream there, republish). Downstream in this repo, adjust the override version if the fork's major changes.
- **Follow-up to resolve:** the backend renderer + email/site CSS in §14 still key on the old `kg-width-{preset}` contract. Migrate to the fork's `data-kg-max-width` numeric contract once the fork's first release ships. After migration, drop the ⚠ stale markers in §14.

### Verification

- `ls node_modules/@tryghost/koenig-lexical/package.json` and inspect the `name` field — reads `@iliad.dev/koenig-lexical` (pnpm aliases the on-disk folder, not the manifest).
- `pnpm-lock.yaml` shows the `@tryghost/koenig-lexical` key resolving to an `@iliad.dev` tarball.
- `pnpm --filter @tryghost/admin build` and `pnpm --filter ghost-admin build` succeed.
- Open the editor, insert an image: palette is purple everywhere; toolbar shows a numeric max-width input (no percentage buttons).

### Resolution — body-image FocalPointPicker marker offset (Tailwind v3 ↔ v4 conflict)

**Root cause:** Two Tailwind builds with overlapping class names but different output formats run side-by-side in the Ember admin DOM:

1. The koenig fork's runtime `<style>` (Tailwind v3) emits `.koenig-lexical .-translate-x-1\/2 { --tw-translate-x: -50%; transform: translate(var(--tw-translate-x), var(--tw-translate-y)) … }` — the v3 chained-transform shape.
2. `apps/admin`'s injected Tailwind v4 build (~340 KB) emits unscoped `.-translate-x-1\/2 { --tw-translate-x: calc(…); translate: var(--tw-translate-x) var(--tw-translate-y); }` — the v4 shape that uses the new CSS `translate:` property.

Both rules match the marker. They target *different* CSS properties (`transform:` vs `translate:`), so they don't override each other in the cascade — they **compound**. The marker gets translated `-50% -50%` once via v3 `transform:` and again via v4 `translate:`, displacing it by twice the dot's half-width (≈ 10 px each axis). That's the "marker renders at the top-left of the click point" symptom: the dot's center is one full radius up-and-left of the click.

Verified in DevTools by clicking at picker centre `(720, 384.59)`: marker centre measured at `(710, 374)` before fix → delta `(−10, −10.59)`; after injecting `.koenig-lexical [class*="translate"]{translate:none}`, marker centre measured at `(720, 384)` → delta `(0, −0.59)` (sub-pixel).

**Fix:** [ghost/admin/app/styles/components/koenig.css](../ghost/admin/app/styles/components/koenig.css) sets `translate: none` on any element inside `.koenig-lexical` whose class name contains "translate". This neutralises the v4 `translate:` leakage and lets only the v3 `transform:` rules apply.

```css
.koenig-lexical [class*="translate"] {
    translate: none;
}
```

**Why not patch the fork or the v4 build?** The v3↔v4 dual-loading is structural (apps/admin uses v4, koenig fork uses v3) and out of scope for this picker. The fork is also used unmodified in upstream Ghost's own admin, where this conflict doesn't exist. Patching the v4 admin pipeline (e.g. scoping its utilities to `.admin-x-base`) would be a much larger refactor. The local CSS reset is bounded, easy to remove if the v4/v3 split is ever resolved upstream, and has no side effects: koenig's own components don't use the v4 `translate:` property (they use `transform:`), so resetting `translate:` on translate-class elements inside `.koenig-lexical` is a no-op for them.

**Scope:** body-image picker only; the feature-image picker (§23) is plain Ember markup with non-Tailwind CSS and is unaffected.

### Resolution — body-image FocalPointPicker drag interception

When the user click-and-drags inside the body-image FocalPointPicker, the gesture also triggers the editor's block-drag-and-drop and scoops up the entire image card. The picker is rendered inside the image card's DOM tree, and the koenig fork dynamically sets `draggable="true"` on the card via a `useEffect` (UMD byte ~1847683) so blocks can be repositioned. A native HTML5 `dragstart` originating inside the picker therefore initiates a card drag.

**Fix:** A capture-phase `dragstart` listener on `document` in [ghost/admin/app/components/gh-koenig-editor-lexical.js](../ghost/admin/app/components/gh-koenig-editor-lexical.js) calls `preventDefault()` and `stopPropagation()` whenever the event originates inside `[data-testid="focal-point-picker"]`. The listener is attached in `registerElement` and removed in `willDestroy`. Capture phase ensures it runs before the koenig fork's drag handlers.

```js
@action
suppressFocalPointPickerDrag(event) {
    if (event.target?.closest?.('[data-testid="focal-point-picker"]')) {
        event.preventDefault();
        event.stopPropagation();
    }
}
```

A complementary CSS rule in [ghost/admin/app/styles/components/koenig.css](../ghost/admin/app/styles/components/koenig.css) sets `pointer-events: none` on the picker image so clicks bubble up to the parent `.cursor-crosshair` div (which has the click handler) and the image cannot itself be a pointer-event target — defence in depth, since the dragstart listener already suppresses the editor's drag.

```css
.koenig-lexical [data-testid="focal-point-picker"] img {
    pointer-events: none;
}
```

Verified end-to-end: synthesising `dragstart` on the picker image or its inner div now sets `defaultPrevented: true`; clicking in the picker continues to update the marker centre to within sub-pixel tolerance.

---

## 22. Feature image focal-point — end-to-end

**Purpose:** Authors can pick a focal point on the post's `feature_image` (and on body image cards via the editor) so that themes and newsletter clients which crop with `object-fit: cover` keep the subject in frame instead of clipping it. Mirrors the contract the `@iliad.dev/koenig-lexical` editor (1.1.4+) already emits for body images: `data-kg-focal-point="X,Y"` on the `<figure>`, inline `style="object-position: X% Y%"` on the `<img>`, with `{x: number, y: number}` percentages stored as JSON. Implicit center `{50, 50}` collapses to `null`; null means "no focal point" and renderers emit no `object-position`.

### Schema and migration

- `ghost/core/core/server/data/schema/schema.js` — added `feature_image_focal_point: {type: 'text', maxlength: 100, nullable: true}` to the `posts_meta` block, immediately after `feature_image_caption`. `text` (rather than a native JSON column type) matches Ghost's mobiledoc/lexical pattern of storing structured values as JSON-stringified strings parsed at the model layer.
- `ghost/core/core/server/data/migrations/versions/6.31/2026-05-07-12-00-00-add-feature-image-focal-point-to-posts-meta.js` — one-line `createAddColumnMigration('posts_meta', 'feature_image_focal_point', {type: 'text', maxlength: 100, nullable: true})`. No backfill — `null` matches today's center-crop behaviour.

### Model — validation, rounding, collapse-to-null

- `ghost/core/core/server/models/posts-meta.js` — extended the existing `formatOnWrite` and `parse` hooks (which already URL-transform `og_image` / `twitter_image`) with a sibling `normalizeFocalPoint(value)` helper. On write: rejects non-object / non-finite / out-of-range values (`@tryghost/errors` `ValidationError`), rounds each coordinate to one decimal, collapses `{50, 50}` → `null`, JSON-stringifies the result. Tolerates an already-stringified value passing through (partial-update round-trips). On read: JSON-parses the stored string back to `{x, y}`; falls back to `null` defensively if the row is malformed.

### Posts API exposure (no serializer changes)

The input serializer `handlePostsMeta()` ([`api/endpoints/utils/serializers/input/posts.js:119-123`](ghost/core/core/server/api/endpoints/utils/serializers/input/posts.js#L119-L123)) derives accepted fields from `_.keys(_.omit(postsMetaSchema, ['id', 'post_id']))`, so adding the schema entry alone is enough to make `feature_image_focal_point: {x, y}` accepted on POST/PUT. The output mapper ([`output/mappers/posts.js:107-116`](ghost/core/core/server/api/endpoints/utils/serializers/output/mappers/posts.js#L107-L116)) flattens posts_meta keys onto the top-level post JSON, so the field is exposed on both Admin and Content API responses with no allowlist edits.

### `admin-api-schema` patch — JSON Schema validation entry

`@tryghost/admin-api-schema@4.7.2` defines the JSON Schema that the Admin API uses to validate `posts.add` / `posts.edit` request bodies. Both endpoints `$ref` into `posts#/definitions/post`, so adding `feature_image_focal_point` once to the shared `posts.json` definitions block covers both. Without this entry the field flows through the validator unrecognised and is only caught by the model-layer `normalizeFocalPoint` (still a clean 422, just one layer deeper and with a less structured error envelope). The schema entry rejects the request at the API boundary instead.

- `patches/@tryghost__admin-api-schema@4.7.2.patch` — adds a `feature_image_focal_point` property to `lib/schemas/posts.json` with `oneOf: [object{x,y in [0,100]}, null]`. `additionalProperties: false` and `required: ["x", "y"]` mirror the contract enforced in `posts-meta.js`.
- Generated via `pnpm patch @tryghost/admin-api-schema@4.7.2` → edit → `pnpm patch-commit`. Registered in `pnpm.patchedDependencies` alongside the other two patches.

### Newsletter email plumbing

- `ghost/core/core/server/services/email-service/email-renderer.js` — passes `feature_image_focal_point` (already parsed to `{x, y}` by the model) into the template data block alongside `feature_image_alt` / `feature_image_caption`. Latest-posts thumbnails fetch `posts_meta` via a new `withRelated: ['posts_meta']` on the `findPage` call and surface `focalPoint` on each `featureImage` / `featureImageMobile` object.
- `ghost/core/core/server/services/email-rendering/partials/email-wrapper.hbs` — conditional `style="object-position: {{x}}% {{y}}%"` on the feature-image `<img>` (alongside existing `width` / `alt` conditionals).
- `ghost/core/core/server/services/email-service/email-templates/partials/latest-posts.hbs` — same conditional style on each latest-posts thumbnail `<img>`.

**Practical effect note:** Ghost emails do not currently apply `object-fit: cover` to the feature-image, so the inline `object-position` is largely a no-op in most email clients today. The attribute is still safe (and free) to emit, and future-proofs the markup if/when emails adopt fixed-aspect-ratio crops.

### Body-image renderer

- `ghost/core/core/server/services/koenig/node-renderers/image-renderer.js` — added a `readFocalPoint(node)` helper (validates `{x, y}` numerics, returns `null` otherwise). When a focal point is set: emits `data-kg-focal-point="X,Y"` on the `<figure>` (alongside the existing `data-kg-max-width`), and merges `object-position: X% Y%` into the inline style on the `<img>` via a small style-builder so the existing `max-width: ...; margin: 0 auto; display: block;` declarations from §14 still coexist. Applied uniformly across both the email and web rendering branches.

### `kg-default-nodes` patch — required for body-image round-trip

The `@iliad.dev/koenig-lexical` editor stores `focalPoint` on its lexical image node, but the upstream `@tryghost/kg-default-nodes@2.0.21` (which ghost-core uses to deserialize lexical state for server-side HTML rendering) only registers 8 known properties on `ImageNode` ([`lib/nodes/image/ImageNode.js`](https://github.com/TryGhost/Ghost/tree/main/ghost/kg-default-nodes/lib/nodes/image/ImageNode.js)). Anything else is silently dropped on the `importJSON` path (see `generateDecoratorNode.importJSON` at [generate-decorator-node.js:148-159](ghost/kg-default-nodes/lib/generate-decorator-node.js#L148-L159) — it iterates only over `properties`).

Without the patch, `focalPoint` is set in the editor but lost the moment Ghost re-renders the post HTML server-side, so neither the public site nor the email ever sees `data-kg-focal-point`.

- `patches/@tryghost__kg-default-nodes@2.0.21.patch` — generated via `pnpm patch @tryghost/kg-default-nodes@2.0.21` → edit → `pnpm patch-commit`. Adds `{name: 'focalPoint', default: null}` to the `properties` array in `ImageNode` (covers `importJSON`/`exportJSON` automatically) and includes `focalPoint` in the `exportJSON` destructure + dataset literal. Patches all three build outputs (`lib/`, `cjs/`, `es/`).
- `package.json` (root) — registered under `pnpm.patchedDependencies` alongside the existing `ghost-storage-cloudinary@3.0.2` patch (§20).

### Theme integration

`feature_image_focal_point` flows through to the theme `post` context via the auto-flatten in the output mapper (no helper needed). Themes that want to honor the focal point write:

```hbs
<img src="{{img_url feature_image}}"
     alt="{{feature_image_alt}}"
     {{#if feature_image_focal_point}}
       style="object-position: {{feature_image_focal_point.x}}% {{feature_image_focal_point.y}}%"
     {{/if}}>
```

No new helper. Themes opt in. The field is available as a parsed object (`{x, y}`) — model `parse()` runs on read.

### Out of scope

- **OG / Twitter / social-card cropping.** Ghost has no server-side crop pipeline ([`og-image.js`](ghost/core/core/frontend/meta/og-image.js) / [`twitter-image.js`](ghost/core/core/frontend/meta/twitter-image.js) return raw URLs; consumers like Twitter/LinkedIn ignore `object-position`). To make focal-point affect OG cards we'd need either a Cloudinary dynamic transform (`g_xy_center,x_<x>,y_<y>` — we use `ghost-storage-cloudinary` per §20) or a server-side rasterised OG generator. Both are meaningful new infrastructure and explicitly **not** part of this work.
- **Admin-side picker UI.** Sibling effort in apps/admin and apps/posts. Backend exposes the field; admin can wire up a picker independently.
- **Upstream PR for `@tryghost/admin-api-schema`** — applied locally as a patch in this fork (see above), but a clean upstream contribution would remove the perpetual patch maintenance burden.

### Upgrade guidance

- The `kg-default-nodes` patch will need regeneration on every upstream bump until upstream registers `focalPoint` themselves. `pnpm patch @tryghost/kg-default-nodes@<new-version>` → re-apply the same diff (`{name: 'focalPoint', default: null}` in properties, `focalPoint` in `exportJSON` destructure + dataset) → `pnpm patch-commit`.
- The `admin-api-schema` patch needs the same treatment on every bump of that package. Re-apply the `feature_image_focal_point` block to `lib/schemas/posts.json` after `feature_image_caption`. If upstream restructures the posts definitions (e.g. splits into a separate `posts-meta.json`), the block may need to move with the relevant `$ref`.
- If upstream eventually registers `focalPoint` on `ImageNode` and adds the schema entry to `admin-api-schema`, drop both patches and their entries in `pnpm.patchedDependencies`.
- The `posts_meta.feature_image_focal_point` column survives upgrades automatically; the migration is in the version-stamped `versions/6.31/` directory and won't re-run.

### Verification

1. Migration: `pnpm dev` and `docker exec ghost-mysql mysql -u root -p<pw> ghost_dev -e 'desc posts_meta' | grep focal` → `feature_image_focal_point | text | YES | NULL`.
2. Round-trip: PUT `{posts:[{feature_image_focal_point:{x:33.3,y:66.7}}]}` to the Admin API → GET returns `{x:33.3,y:66.7}` at top-level. PUT `{x:50,y:50}` → DB `NULL`, GET returns `null`. PUT `{x:150,y:50}` → 422 ValidationError. PUT `{x:33.34,y:66.78}` → response stores `{x:33.3,y:66.8}` (rounded).
3. Body image: open the editor (`@iliad.dev/koenig-lexical@1.1.4`), insert an image, set focal point, save. Public site page HTML → `<figure data-kg-focal-point="X,Y">` and `<img style="...; object-position: X% Y%;">`. Send as newsletter → same attributes survive in the email HTML (Mailpit `http://localhost:8025`). Without the §22 `kg-default-nodes` patch this would silently regress to no focal-point on the rendered HTML.
4. Feature image: until the admin picker exists, set via Admin API directly. Send as newsletter → email HTML has `style="object-position: X% Y%"` on the feature image `<img>`. Render in a theme that opts in → public HTML carries the same style.
5. Default-state preservation: post with no focal point → DB `NULL`, API `null`, no `style` attribute emitted, no `data-kg-focal-point` on `<figure>`.

---

## 23. Feature image focal-point — admin UI picker

**Purpose:** Author-facing picker for the `feature_image_focal_point` field added in §22. Until this exists, authors had to PUT the field via the Admin API by hand. UI is Ember-side (the post editor's feature-image preview is still classic `gh-editor-feature-image`), and visually mirrors the body-image `FocalPointPicker` from the `@iliad.dev/koenig-lexical` fork — same coordinate math, same Atlas-purple accent, same `{50, 50}` collapse-to-null. Entry point is a third overlay button (crosshair icon) alongside the existing trash + KoenigImageEditor buttons; activating it puts the live preview into "picking" mode where click + drag places a marker, with Reset and Done swapped into the action stack until exit.

### Model — Ember Data attribute

- `ghost/admin/app/models/post.js` — added `featureImageFocalPoint: attr()` (no transform; the API serializer returns `{x, y}` already parsed). Sits beside the existing `featureImage` / `featureImageAlt` / `featureImageCaption` attrs. Save round-trips automatically via Ember Data — no manual API call.

### Controller — setter + clear

- `ghost/admin/app/controllers/lexical-editor.js` —
  - New `setFeatureImageFocalPoint(value)` `@action` mirroring the existing `setFeatureImageAlt` shape: sets the model attr, kicks `autosaveTask` if the post is a draft.
  - `clearFeatureImage` extended to also null `featureImageFocalPoint` so deleting the image clears the focal point in lockstep with caption / alt / URL. Avoids a stale focal-point bleeding onto a subsequently uploaded image.

### Prop wiring (route template → editor → feature-image)

- `ghost/admin/app/templates/lexical-editor.hbs` — passes `@featureImageFocalPoint={{this.post.featureImageFocalPoint}}` and `@setFeatureImageFocalPoint={{this.setFeatureImageFocalPoint}}` into `GhKoenigEditorLexical`.
- `ghost/admin/app/components/gh-koenig-editor-lexical.hbs` — re-passes them as `@focalPoint` / `@updateFocalPoint` into `GhEditorFeatureImage`.

### Picker component — `gh-editor-feature-image`

- `ghost/admin/app/components/gh-editor-feature-image.js` —
  - New tracked state: `isPickingFocalPoint`, `localFocalPoint` (in-progress drag value, distinct from the model so we can update fluidly without per-frame autosaves), `isDragging`. `imageElement` DOM ref captured via `did-insert this.registerImageElement`.
  - `displayFocalPoint` getter resolves to: in-progress drag value → committed model value → `{50, 50}` muted-centre during picking with no choice yet → `null`. `isFocalMarkerMuted` flags the third case for CSS.
  - `startPicking` / `stopPicking` / `resetFocalPoint` actions. `Escape` while picking ⇒ `stopPicking`. Entering picker mode also exits alt-editing (and vice-versa) so the two tracked-state modes are mutually exclusive.
  - `onPickerPointerDown` captures `clientX/Y` against `imageElement.getBoundingClientRect()`, `clamp(0, 100)`, rounds to one decimal, attaches `pointermove` / `pointerup` to `window`. On `pointerup` commits to the model via `args.updateFocalPoint`, with a `collapseCenter` helper that turns exact `{50, 50}` → `null` so the GET response after save matches the visible state with no flicker. Clicks on the Reset / Done overlay buttons are filtered out via `event.target.closest('.image-action')` so they don't double as focal-point placements.
  - `willDestroy` cleans up the global pointer + keydown listeners so navigation while picking doesn't leak handlers.
- `ghost/admin/app/components/gh-editor-feature-image.hbs` —
  - The image wrapper gets an `is-picking` class and a `pointerdown` handler when picking. `<img>` registers itself as `imageElement` for the bounding-rect math.
  - When `displayFocalPoint` is set, a `<span class="gh-editor-feature-image-focal-marker">` renders at `left: X%; top: Y%;` (relative to the wrapper, which is exactly the image size — no padding/border on the wrapper).
  - When `isPickingFocalPoint`, the trash + KoenigImageEditor + focal-point-entry buttons are swapped for Reset (`close` icon) + Done (`check` icon) in the same top-right action stack. When not picking, the entry button gets `.is-active` purple tint if a focal point is set.

### Icon

- `ghost/admin/public/assets/icons/koenig/kg-focal-point.svg` — new 24×24 viewBox crosshair (four cardinal tick marks + outer circle + filled centre dot), all `currentColor`, matching the visual weight of `kg-trash.svg` and `kg-wand.svg`. Loaded via `{{svg-jar "koenig/kg-focal-point"}}`.

### Styles

- `ghost/admin/app/styles/layouts/editor.css` — extended the existing `.gh-editor-feature-image` block:
  - **Action-stack ordering**: `.image-focal-point` gets `margin-right: 8.4rem` so the entry button sits left of the existing `.image-edit` (4.2rem) and `.image-delete` (rightmost). `.image-focal-point-reset` gets `margin-right: 4.2rem` so Reset sits left of Done in picking mode.
  - **`.is-active`** on the entry button → `opacity: 1` (overrides the `.image-action` default of opacity 0 so the active state is glanceable without hovering) + `color: var(--green)` (Atlas purple via `currentColor`-inheriting SVG strokes/fills, dark-mode-aware via §10).
  - **`.is-picking`** on the wrapper → `cursor: crosshair`, `user-select: none`, suppresses the dark hover gradient overlay so the marker is unobstructed.
  - **`.gh-editor-feature-image-focal-marker`** — 1.8rem circle, `var(--green)` fill, white border, double box-shadow for legibility against any image, `transform: translate(-50%, -50%)` to centre on the coordinate, `pointer-events: none`. Default `opacity: 0`, fades in on `.gh-editor-feature-image:hover` (matches the existing `.image-action` hover-fade pattern), always visible while picking. The muted variant `&.is-muted` swaps the fill to white at 50% opacity.

### UX decisions (from spec clarification)

- **Picker controls placement**: Reset + Done replace the trash + edit buttons in the same top-right action stack while picking. No floating toolbar; identical hover-fade visual language.
- **Static marker visibility**: hidden by default, fades in on image hover when a focal point is set. The entry-point button itself carries an `.is-active` purple tint at rest so the "this image has a focal point" state is glanceable without hovering.

### Out of scope

- Translating the picker's tooltip strings — falls under the broader admin i18n sweep.
- React-side picker (the post editor feature-image surface is Ember; switching it to React is unrelated and large).
- OG / Twitter card preview-with-crop — backend doesn't crop those (see §22 Out of scope), so a UI preview would be misleading.
- Body-image picker — already shipped in the `@iliad.dev/koenig-lexical` fork (see §21).

### Upgrade guidance

- All touched files are admin-only. The model attr is additive; merge conflicts on Ghost upgrades are unlikely but two specific places to watch:
  - `ghost/admin/app/controllers/lexical-editor.js` — `setFeatureImage*` block and `clearFeatureImage` evolve upstream as Ghost adds new feature-image-adjacent fields. Reapply the `featureImageFocalPoint` line to whichever shape `clearFeatureImage` ends up in, and keep `setFeatureImageFocalPoint` next to its siblings.
  - `ghost/admin/app/components/gh-editor-feature-image.{js,hbs}` — if upstream Ghost replaces this Ember component with a React equivalent (the long-term direction per CLAUDE.md), the picker has to be re-implemented in React using the same `@focalPoint` / `@updateFocalPoint` prop contract. The model attr and controller setter survive that migration unchanged.
- The new SVG icon and CSS rules don't conflict with anything upstream: file names and class names are all `focal-point` or `focal-marker`-prefixed and don't appear in vanilla Ghost.
- Behaviour is fully gated by the model attr being present on the API response — if upstream removes the §22 backend wiring (it shouldn't, since this is whitelabel-internal), the picker would silently no-op rather than crash.

### Verification

1. `pnpm dev`, open a draft post with a feature image. Hover the image — the new crosshair button appears alongside trash + edit. No marker (no focal point set yet).
2. Click the crosshair → enters picking mode. Trash + edit swap to Reset + Done. Cursor is crosshair over the image.
3. Click off-centre. Atlas-purple marker appears at the click. Drag the marker — it follows live. Release — marker stays at the dropped point.
4. Click Done. Picker exits. Hover the image — marker fades in (subtle hover-fade) at the chosen point. Crosshair entry button at rest now carries the `.is-active` purple tint.
5. Wait for autosave (~2 s), then `curl http://localhost:2368/ghost/api/admin/posts/<id>?formats=html&include=...` (admin auth). Confirm `feature_image_focal_point: { x: NN.N, y: NN.N }` at top level.
6. Reload editor. Marker re-renders at the saved coordinate.
7. Send the post as a newsletter (Mailpit `http://localhost:8025`). View HTML — confirm `style="object-position: NN.N% NN.N%"` on the feature-image `<img>`. (Confirms the §22 backend wire-up is being driven by the new UI.)
8. Re-enter picker, click Reset. Marker disappears. Save. GET → `feature_image_focal_point: null`.
9. Re-enter picker, click as close to dead-centre as possible. If the rounded value is exactly `{x: 50, y: 50}`, save → GET returns `null` (collapse-to-null applied client-side and re-applied server-side).
10. Set `disableWebsiteFeatures=true` (env or config) and reload. Picker entry button is still present and functional (per spec — focal point matters for newsletter emails too).
11. Delete the image (trash). Focal point is cleared in tandem; uploading a new image starts with no focal point.

---

## Upgrade Checklist

When upgrading to a new Ghost version:

1. **Merge/rebase** onto new upstream tag. Use a dedicated branch (`upgrade/vX.Y.Z`).
2. **Check conflicts** in all files listed above — especially:
    - `ghost/admin/app/utils/publish-options.js` (publish flow logic changes frequently)
    - `ghost/admin/app/routes/home.js` (routing changes)
    - `apps/admin/src/layout/app-sidebar/*` (sidebar refactors)
    - `apps/admin-x-settings/src/components/sidebar.tsx` (new nav items added upstream)
    - `apps/admin/src/routes.tsx` (route structure changes)
    - `apps/shade/theme-variables.css` — `--focus-ring` override (both light + dark blocks)
    - `ghost/admin/app/index.html` (postMessage navigation script)
    - `ghost/core/core/built/admin/index.html` (postMessage script in built file — rebuild may overwrite)
    - `patches/` directory — currently `ghost-storage-cloudinary@3.0.2.patch` (§20), `@tryghost__kg-default-nodes@2.0.21.patch` (§22), and `@tryghost__admin-api-schema@4.7.2.patch` (§22). `pnpm install` will fail loudly if a patch no longer applies. The Koenig editor patch moved to the fork (§21) — no longer in `patches/`.
3. **Re-apply domain restriction disable** comment in `JwtSSOAdapter.js` if needed, or re-enable and test.
    - Also verify the email-safe gallery renderer (`ghost/core/core/server/services/koenig/node-renderers/gallery-renderer.js`) still has its `isEmail` table branch, and `card-styles.hbs` still has the `table.kg-gallery-row` / `td.kg-gallery-image` rules (see §12).
4. **Verify `disableWebsiteFeatures` config key** is still in the serializer allowlist (`config.js`).
5. **After `pnpm build`**, re-inject the postMessage script into `ghost/core/core/built/admin/index.html` (§8) since the Ember build regenerates it.
6. **Test SSO flow** end-to-end after upgrade.
7. **Test `disableWebsiteFeatures=true`** mode to ensure no new website-feature UI slipped through.
8. **Test Koenig editor** (§21) — open a post, insert image, confirm the palette is Atlas purple and the toolbar shows the numeric max-width input. The legacy four percentage-preset buttons are gone.
