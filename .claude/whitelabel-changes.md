# Ghost Atlas Whitelabel — Custom Changes Catalogue

This file catalogues all custom changes made on top of upstream Ghost for the Atlas CMS whitelabel fork.
**Update this file whenever new changes are made so upgrades are easier.**

Last updated: 2026-04-21 (catalogued against 6.32.0 base)

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
- `ghost-cloudinary-store@^3.3.0` is still a direct dep of `ghost/core/package.json` (added 2026-02-27; not in upstream) and must survive future merges.

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

#### Koenig-lexical bundle (v1.7.30+) — 38 hardcoded `#30cf43` → `#4945ff` replacements

Koenig's CSS bundle hardcodes the brand green in selection outlines, focus rings, hover/active backgrounds, and the `--green` custom property — all bypassing our shade `--color-green` override. These were missed in the initial v6.32.0 upgrade (selection outlines on images in the editor stayed green).

Handled as additional hunks in `patches/@tryghost__koenig-lexical@1.7.30.patch`:

- `dist/style.css` — 15 occurrences across `border-color:#30cf4333`, `background-color:#30cf431a/33/b3`, `outline-color:#30cf43`, `--green:#30cf43`, and `shadow-[0_0_0_*px_#30cf43]` Tailwind arbitrary-value classes.
- `dist/koenig-lexical.umd.js` — 19 occurrences in the inlined CSS (Ember admin loads the UMD, which bundles its stylesheet at the top).
- `dist/koenig-lexical.js` — 4 occurrences in the ESM (JSX className strings with hardcoded shadow colors).

All alpha-suffixed variants are preserved (`1a`, `33`, `40`, `b3`). Regenerate with `sed -E 's/30cf43/4945ff/gi'` across all three dist files before `pnpm patch-commit`.

After `pnpm patch-commit`, copy the patched UMD into the three built locations (`ghost/admin/dist/...`, `ghost/core/core/built/admin/assets/...`, `apps/admin/dist/assets/...`) since Ember's admin caches the file during its build.

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
   const aspectRatios = row.map(image => (image.width && image.height) ? (image.width / image.height) : 1);
   const aspectSum = aspectRatios.reduce((sum, r) => sum + r, 0) || row.length;
   ```
4. **Branched image-cell creation** inside `row.forEach`:
   - If `isEmail`: create a `<td class="kg-gallery-image">` with `width="${pct.toFixed(2)}%"` (pct = `aspectRatios[colIdx] / aspectSum * 100`), `valign="top"`, and inline `style="padding:0 4px;vertical-align:top;"`.
   - Else: create the original `<div class="kg-gallery-image">`.
   - Renamed the variable from `imgDiv` → `imgCell` throughout so it works for both branches.
5. **Added inline `<img>` style for email** at the end of the existing `if (options.target === 'email')` block (just after the Unsplash URL branch):
   ```js
   img.setAttribute('style', 'display:block;width:100%;height:auto;max-width:100%;');
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

## 14. Image Width Percentages in Koenig Editor

**Purpose:** Adds four percentage-based width options (25%, 33%, 50%, 75%) to the image card toolbar, on top of upstream's Regular / Wide / Full presets. The primary target is email newsletters where writers want more granular control over image sizing.

**Mechanism (as of v6.32.0):** Pnpm-native `patchedDependencies` patch of the compiled `@tryghost/koenig-lexical` bundle, plus in-repo changes to the email image renderer and email CSS. Was `patch-package` + `"postinstall": "patch-package"` on yarn; migrated to `pnpm patch` / `pnpm patch-commit` when Ghost moved to pnpm 10 in v6.29.0.

### Chosen `cardWidth` values

| Setting       | `cardWidth` value | Email width |
| ------------- | ----------------- | ----------- |
| Quarter       | `quarter`         | 150px       |
| Third         | `third`           | 200px       |
| Half          | `half`            | 300px       |
| Three-quarter | `threequarters`   | 450px       |

Existing `regular` / `wide` / `full` remain untouched for back-compat.

### Infrastructure (pnpm-native patch workflow as of v6.32.0)
- `package.json` — `pnpm.patchedDependencies` registers the patch file. `pnpm patch-commit` writes it automatically when the patch is committed.
- `patches/` — tracked in git. Current file: `patches/@tryghost__koenig-lexical@1.7.30.patch`.
- To regenerate: `pnpm patch '@tryghost/koenig-lexical@1.7.30'` → edit the copy it prints → `pnpm patch-commit <path>`.

### Patch
- `patches/@tryghost__koenig-lexical@1.7.30.patch` (v6.32.0) — three files patched in node_modules:

**Icon strategy (v6.32.0 update):** Rather than define 4 distinct inline SVG icons (which the v1.7.28 patch did with bespoke outline-rect-plus-filled-bar glyphs), the v1.7.30 patch reuses the existing `imgFull` component (`me` in ESM, `P` in UMD) for all four new widths. Button tooltips ("Quarter width", "Third width", etc.) differentiate them. This trades visual distinction in the toolbar for a much simpler, more upgrade-resilient patch.
  - **`dist/koenig-lexical.js`** (ESM build, 3 hunks):
    - Extends the internal `JW` allowlist in `src/utils/image-card-widths.js` with `quarter`, `third`, `half`, `threequarters`.
    - Adds four inline SVG icon components to the `UF` icon map in `src/components/ui/ToolbarMenu.jsx` (`imgQuarter` / `imgThird` / `imgHalf` / `imgThreeQuarters`). Icons are 24×24 viewBox with an outline rectangle + a centered filled bar whose width visually represents the percentage.
    - Adds four toolbar buttons after the "Full width" button. Each auto-hides if `cardConfig.image.allowedWidths` is set and does not include the value.
  - **`dist/koenig-lexical.umd.js`** (UMD build, 3 hunks) — **critical: this is the bundle actually served to the browser.** Ghost's Ember admin imports the UMD via `app.import('node_modules/@tryghost/koenig-lexical/dist/koenig-lexical.umd.js', ...)` at `ghost/admin/ember-cli-build.js:271` and Vite's admin dev server serves the same file. The UMD has **different minified variable names** and uses **backtick string literals** (not quoted), so the ESM patch doesn't apply to it automatically.
    - UMD variable mapping at the time of this patch: allowlist `KW` (was `JW`), icon map `Gae` (was `UF`), toolbar-button component `KF` (was `GF`), separator `qF` (was `KF`), setWidth callback `P` (was `ee`), current-width state `_` (was `y`), allowed-widths array `O` (was `A`).
    - Patches the `KW` allowlist, the `cardWidth:W.default.oneOf([...])` PropTypes check, the icon map to add the 4 inline SVG icons (now using `(0,n.jsx)` / `(0,n.jsxs)` calls instead of `p` / `m`), and the toolbar-button JSX.
    - Also patches the **inlined CSS string** at the top of the UMD — style.css is bundled inside the UMD and injected at runtime, so our 4 WYSIWYG rules must be added there too, not just to `dist/style.css`.
  - **`dist/style.css`** (1 hunk, appended):
    - Adds WYSIWYG width rules scoped to `.koenig-lexical figure[data-kg-card-width=...]` so the editor preview visually resizes when a new width is selected. Rules use `width: 25% / 33.333% / 50% / 75%` with `margin: 0 auto; display: block;` — no `max-width` cap so the image scales with the editor's column width (unlike email, which caps at the 600px content column). Only affects consumers that load the standalone CSS file; the Ember admin runtime uses the copy inlined into the UMD above.

### Backend
- `ghost/core/core/server/services/koenig/node-renderers/image-renderer.js`
  - Added `PERCENT_BY_CARD_WIDTH` map at module top.
  - Email output path now computes target width from percentage (`Math.round(600 * percent)`) rather than a fixed 600px cap. Non-percentage widths (`regular` / `wide` / `full` / undefined) fall through to the original 600px behavior.
  - Retina-src logic (`srcWidth >= 1200`) unchanged — higher-resolution source files are still used even when display width is smaller.
  - Web rendering is already free — the existing `kg-width-${node.cardWidth}` class emission at lines 34-36 handles any string, so `kg-width-half` etc. land on the figure automatically.

### Email Styles
- `ghost/core/core/server/services/email-rendering/partials/card-styles.hbs` — added `.kg-image-card.kg-width-{quarter,third,half,threequarters}` rules with `width: X% !important`, matching `max-width: {150,200,300,450}px`, centered, `display: block`. Class rules are belt-and-braces alongside the `width` attribute set by the renderer, since some email clients honor one but not the other.

### Site Frontend Styles
- `ghost/core/core/frontend/src/cards/css/image.css` (**new file**) — adds the four `.kg-image-card.kg-width-{quarter,third,half,threequarters}` rules to Ghost's bundled card CSS. Rules use plain `width: X%; margin: 0 auto; display: block;` (no `!important`, no `max-width`) so themes can override if they want different sizing.
- **Delivery:** Ghost bundles `ghost/core/core/frontend/src/cards/css/*.css` into `cards.min.css` (see `ghost/core/core/frontend/services/assets-minification/card-assets.js`). Themes opt in via `"card_assets": true` in their `package.json`; if a theme uses an explicit `include` list, it must add `"image"` to pick these rules up. Ghost's default Casper/Source themes use `card_assets: true`.
- **Upstream coordination risk:** Ghost does not currently ship an `image.css` — image card widths have always been theme responsibility. If upstream ever adds their own `image.css` with conflicting rules (e.g. for `.kg-width-full`), expect a file-add conflict on merge; favor concatenating their rules after ours so upstream's `regular`/`wide`/`full` styling wins while our percentage rules remain.

### Upgrade guidance

When bumping `@tryghost/koenig-lexical`, the patch will almost certainly not apply cleanly — the minified variable names it targets change on every build, and the ESM and UMD builds have different names. Workflow:

1. Delete `patches/@tryghost+koenig-lexical+*.patch`.
2. Run `yarn install` to pull the new version.
3. **`dist/koenig-lexical.js`** (ESM) — find three positions by grepping stable strings:
   - Allowlist: `grep -n '"regular",' node_modules/@tryghost/koenig-lexical/dist/koenig-lexical.js` — find the `[...,"wide","full"]` array.
   - Icon map: `grep -n 'imgRegular:' node_modules/@tryghost/koenig-lexical/dist/koenig-lexical.js` — the identifier letter after the colon is the runtime icon component.
   - Toolbar buttons: `grep -n '"Full width"' node_modules/@tryghost/koenig-lexical/dist/koenig-lexical.js` — the `p(GF, {...})` block insertion point is directly after.
4. **`dist/koenig-lexical.umd.js`** (UMD — **this is the one the browser actually loads**) — find three positions using backtick literals:
   - Allowlist: `grep -oE 'var [A-Z]+=\[\`regular\`,\`wide\`,\`full\`\]' node_modules/@tryghost/koenig-lexical/dist/koenig-lexical.umd.js` — the letters between `var` and `=[` is the allowlist variable name.
   - Icon map: `grep -oE 'imgRegular:[a-zA-Z_$]+,imgWide:[a-zA-Z_$]+,imgFull:[a-zA-Z_$]+,imgReplace:[a-zA-Z_$]+' node_modules/@tryghost/koenig-lexical/dist/koenig-lexical.umd.js` — insertion point is between `imgFull:X` and `,imgReplace:Y`.
   - Toolbar buttons: `perl -ne 'while(/icon:\`imgFull\`.{0,400}/g){print "$&\n"}' node_modules/@tryghost/koenig-lexical/dist/koenig-lexical.umd.js` — shows the Full button + following separator so you can map the UMD's KF-equivalent component name and the setWidth callback name (`P` in this patch's version).
   - **Inlined CSS:** `grep -oE '\.koenig-lexical \.CodeMirror \.cm-spell-error[^{]{1,100}\{[^}]{1,60}\}' node_modules/@tryghost/koenig-lexical/dist/koenig-lexical.umd.js` — if this anchor rule is still the end of the bundled stylesheet, append the four `.koenig-lexical figure[data-kg-card-width=...] img{...}` rules right after it. If upstream adds new CSS rules after `.cm-spell-error`, pick a new anchor — grep the bundle for where the `.koenig-lexical` selectors end.
5. **`dist/style.css`** — append the same four WYSIWYG rules at end of file. Single-line minified; use `printf ... >> style.css` rather than Edit.
6. Regenerate: `npx patch-package @tryghost/koenig-lexical`. Verify the patch has hunks for all three files (`grep -E '^(\+\+\+|---)'`).
7. **Copy the patched UMD into the three built locations** (since Ember/Vite builds cache):
   ```
   for dest in ghost/admin/dist/ghost/assets/koenig-lexical \
               ghost/core/core/built/admin/assets/koenig-lexical \
               apps/admin/dist/assets/koenig-lexical; do
     cp node_modules/@tryghost/koenig-lexical/dist/koenig-lexical.umd.js "$dest/"
   done
   ```
   A full admin rebuild also fixes this (asset-delivery at `ghost/admin/lib/asset-delivery/index.js:112-120` copies the dist folder on every admin build), but the manual copy is instant.
8. **Hard-refresh the browser** — the editor URL uses a `?v=HASH` query bust based on the baked-in Ember build hash; if the hash hasn't changed, the browser may serve a cached old UMD.

---

## 15. Docker Build Fix — Copy `patches/` into `ghost-dev` Image

**Purpose:** The koenig-lexical patch in §14 lives in `patches/` and is referenced from `package.json` under `pnpm.patchedDependencies`. When the `ghost-dev` Docker image builds, `pnpm install --frozen-lockfile` runs inside the container; if `patches/` isn't copied in, pnpm fails with `ENOENT: no such file or directory, open '/home/ghost/patches/...'`.

Upstream's Dockerfile doesn't need this because upstream has no patches. Added in this fork to keep `pnpm dev` working.

### `docker/ghost-dev/Dockerfile`
- Added `COPY patches patches` right before the `pnpm install` step (after `.github/scripts` and `.github/hooks` copies).
- No `.dockerignore` exclusion needed — `patches/` isn't in `.dockerignore`.

### Upgrade guidance
On each upgrade, re-confirm this `COPY patches patches` line is still present. Upstream may refactor the Dockerfile's layer ordering at any time.

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
   - `patches/` directory — see §14 upgrade guidance. `pnpm install` will fail loudly if a patch no longer applies.
3. **Re-apply domain restriction disable** comment in `JwtSSOAdapter.js` if needed, or re-enable and test.
   - Also verify the email-safe gallery renderer (`ghost/core/core/server/services/koenig/node-renderers/gallery-renderer.js`) still has its `isEmail` table branch, and `card-styles.hbs` still has the `table.kg-gallery-row` / `td.kg-gallery-image` rules (see §12).
4. **Verify `disableWebsiteFeatures` config key** is still in the serializer allowlist (`config.js`).
5. **After `pnpm build`**, re-inject the postMessage script into `ghost/core/core/built/admin/index.html` (§8) since the Ember build regenerates it.
6. **Test SSO flow** end-to-end after upgrade.
7. **Test `disableWebsiteFeatures=true`** mode to ensure no new website-feature UI slipped through.
8. **Test Koenig image percentage widths** (§14) — open a post, insert image, confirm the four extra toolbar buttons appear.
