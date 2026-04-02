# Ghost Atlas Whitelabel — Custom Changes Catalogue

This file catalogues all custom changes made on top of upstream Ghost for the Atlas CMS whitelabel fork.
**Update this file whenever new changes are made so upgrades are easier.**

Last updated: 2026-04-01 (catalogued against 6.25.1 base)

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

## 7. `yarn.lock`
- Added `bluebird@3.5.4` and `cloudinary@~1.14.0` (pulled in by a dependency, not a direct install).

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

#### Hardcoded RGBA replacements (`rgba(48,207,67,...)` → `rgba(73,69,255,...)`):
- `apps/shade/src/components/ui/input.tsx` — focus ring
- `apps/shade/src/components/ui/textarea.tsx` — focus ring
- `apps/shade/src/components/ui/input-group.tsx` — focus ring
- `apps/admin-x-settings/src/components/sidebar.tsx` — search input focus
- `apps/admin-x-settings/src/components/settings/advanced/integrations.tsx` — "Active" badge bg
- `apps/admin-x-settings/src/components/settings/growth/offers/offers-index.tsx` — "Active" badge bg (2 instances)
- `apps/admin-x-design-system/src/global/form/color-picker.tsx` — focus ring
- `apps/admin-x-design-system/src/global/form/text-field.tsx` — focus ring
- `apps/admin-x-design-system/src/global/form/text-area.tsx` — focus ring
- `apps/activitypub/src/views/preferences/components/edit-profile.tsx` — handle input focus
- `apps/posts/src/components/label-picker/label-picker.tsx` — focus ring

#### Other hardcoded color replacements:
- `apps/admin-x-design-system/styles.base.css` — `.gh-prose-links a` color
- `apps/admin/src/layout/app-sidebar/shared-views.ts` — `green` in colorMap

---

## 11. Docker Build Fix — Shade `glob` Dependency

**Purpose:** Fix Docker build failure caused by undeclared `glob` dependency in shade's vite config, which broke after the v6.25.1 upgrade due to yarn hoisting resolving an incompatible `brace-expansion` version.

### `apps/shade/vite.config.ts`
- Replaced `import {glob} from 'glob'` with `import {readdirSync} from 'node:fs'`.
- Entry file discovery now uses Node's built-in `readdirSync({recursive: true})` instead of the undeclared `glob` package.
- No functional change to build output — same set of entry files is resolved.

---

## Upgrade Checklist

When upgrading to a new Ghost version:

1. **Merge/rebase** onto new upstream tag.
2. **Check conflicts** in all files listed above — especially:
   - `ghost/admin/app/utils/publish-options.js` (publish flow logic changes frequently)
   - `ghost/admin/app/routes/home.js` (routing changes)
   - `apps/admin/src/layout/app-sidebar/*` (sidebar refactors)
   - `apps/admin-x-settings/src/components/sidebar.tsx` (new nav items added upstream)
   - `apps/admin/src/routes.tsx` (route structure changes)
   - `ghost/admin/app/index.html` (postMessage navigation script)
   - `ghost/core/core/built/admin/index.html` (postMessage script in built file — rebuild may overwrite)
3. **Re-apply domain restriction disable** comment in `JwtSSOAdapter.js` if needed, or re-enable and test.
4. **Verify `disableWebsiteFeatures` config key** is still in the serializer allowlist (`config.js`).
5. **Test SSO flow** end-to-end after upgrade.
6. **Test `disableWebsiteFeatures=true`** mode to ensure no new website-feature UI slipped through.
