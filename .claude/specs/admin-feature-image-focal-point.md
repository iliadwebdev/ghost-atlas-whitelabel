# Spec — Admin UI: feature-image focal-point picker

> Hand this whole file to a fresh agent. It tells them to plan-only, then ship.

---

## Context

The Ghost backend in this whitelabel now supports a focal point on the post's `feature_image`. The data is stored as JSON on `posts_meta`, validated via JSON Schema at the Admin API boundary, exposed in API responses, and consumed by the newsletter renderer + body-image renderer + theme-context layer. See `.claude/whitelabel-changes.md` §22 for the full backend writeup.

What's missing: **a picker UI that lets an author actually set the focal point**. Today they would have to PUT it via the Admin API by hand. The target is to mirror the existing focal-point picker the `@iliad.dev/koenig-lexical` editor uses for body image cards (see that fork's `FocalPointPicker.jsx`) — the same interaction model, the same default-state treatment, the same Atlas purple accent — but for the feature image, not for in-body images.

This is a **standalone admin task**. The backend is done. You only have to build UI; you can verify your work by hitting the Admin API and watching the focal-point field round-trip.

---

## Frozen contract — do not redesign

The wire shape and persistence rules are fixed (see backend §22). Your UI must conform.

- API field: `feature_image_focal_point` on the post object, top level. Both Admin API and Content API expose it; the Admin API accepts it on PUT/POST.
- Value: `{ "x": number, "y": number } | null`.
- `x` and `y` are floats in `[0, 100]` (percentages — left-to-right and top-to-bottom of the image).
- One-decimal precision (e.g. `33.3`, `66.7`). The backend rounds; your UI does not need to round, but values you send will be normalized server-side.
- `null` means "no focal point set" — renderers treat as default-center behaviour.
- The implicit center `{x: 50, y: 50}` MUST collapse to `null`. If a user clicks dead-centre, persist `null`. The backend will collapse it for you on save, but your UI should also collapse so the GET response after save matches what the user sees.
- Validation lives at the Admin API. Out-of-range values get a 422 — you should never send them, but if you somehow do, surface the error.

---

## What to build

A focal-point picker integrated into the existing feature-image editing UI. Visually and interactively it should mirror `FocalPointPicker.jsx` from `@iliad.dev/koenig-lexical` (the fork — see `node_modules/@tryghost/koenig-lexical/` after `pnpm install`, that's where the `FocalPointPicker` source lives via the pnpm alias override).

### Where it lives

The Ghost admin is hybrid Ember + React. The post-editor feature-image UI today is **Ember**: [`ghost/admin/app/components/gh-editor-feature-image.hbs`](ghost/admin/app/components/gh-editor-feature-image.hbs) and [`gh-editor-feature-image.js`](ghost/admin/app/components/gh-editor-feature-image.js). It already renders the `<img>` preview, the alt-text input, the caption input, the trash button, and the `KoenigImageEditor` overlay. The focal-point picker should slot into that surface, alongside (or as a new overlay layer over) the existing `<img>` preview.

The component receives `@image`, `@alt`, `@caption`, etc. from `gh-koenig-editor-lexical.hbs:11-23`, which itself is given props by the post controller. You'll need to thread two new props: `@focalPoint` (the object from `post.feature_image_focal_point`) and `@updateFocalPoint` (a setter that updates the post model).

### Visual / interaction reference

Source of truth is `FocalPointPicker.jsx` in the fork. Match these behaviours:

1. **Click anywhere on the image preview** → set focal point to that coordinate (converted to percentages of the displayed image).
2. **Drag-handle the marker** → continuous update of the focal point as the user drags. Update should be live (cursor follow), commit on `mouseup` / `pointerup`.
3. **Crosshair marker** rendered at `(x%, y%)` of the image. Use a small circular dot with a ring or crosshair lines.
4. **Default state** (no focal point set, value is `null`): show the marker at center but **muted** (lower opacity, no accent colour). Communicates "centre is the default; click to choose".
5. **Active state** (focal point set, value is `{x, y}`): marker rendered at the chosen point in **Atlas purple** (`#4945FF`, the accent already wired up in §10 — use `var(--green)` in Ember CSS or the corresponding shade token in React; both resolve to Atlas purple in this fork).
6. **Reset** action: a button that clears the focal point back to `null`. Wire this to whatever idiomatic affordance the rest of the editor uses (a small "Reset" link, a clear-X badge near the marker, or a popover button — match what `FocalPointPicker.jsx` does in the fork).
7. **Done / dismiss** action: when the picker is presented as a modal/popover state, allow the user to close it; a click outside should also dismiss.

### Picker affordance — entry point

The existing UI already has overlay buttons over the feature image (the trash button at `gh-editor-feature-image.hbs:49-51`, the `KoenigImageEditor` button at line 45-48). Add a third overlay button — a "set focal point" / crosshair icon — that toggles the picker active. While the picker is active, the image preview becomes the click target for placing the focal point and the rest of the chrome (trash, edit) is muted or hidden. When the picker is inactive, the marker (if a focal point is set) shows as a small static indicator.

If the existing Koenig fork picker uses a different entry pattern (e.g. always-visible marker with click-to-move, no toggle), prefer that — the goal is consistency with body-image focal-point UX.

### Wiring through to the post model

The post model in Ember is `ghost/admin/app/models/post.js`. The current pattern for `feature_image_alt` / `feature_image_caption` is:

```js
@attr feature_image_alt;
@attr feature_image_caption;
```

The model attribute for focal-point will be similar (add it once you locate the model file):

```js
@attr feature_image_focal_point;
```

Setters are wired through `gh-koenig-editor-lexical.hbs:16,18` (`@setFeatureImageAlt`, `@setFeatureImageCaption`) into `editor-route.js` / `editor.js` (the editor controller). Find the existing setter wiring and add a parallel `setFeatureImageFocalPoint(value)` action.

Save is automatic via Ember Data — the model attr change will be PUTted on the next save tick. No manual API call needed.

### Read on load

`feature_image_focal_point` will already be on the post model from the API response (the backend is wired up). Just access it via `@featureImageFocalPoint` (or whatever prop name you choose, mirroring `@featureImageAlt`).

---

## Style requirements

- **Atlas purple accent**: `#4945FF`. Available as `var(--green)` in Ember CSS (per §10 — Ghost's "green" was overridden to purple in this fork) and via the shade theme tokens in React. Use the existing token, don't hardcode the hex.
- **Default-state muted marker**: lower opacity (e.g. 50%) and a neutral colour (white or grey, not the accent). Communicates "this is the implicit centre, not a chosen point".
- **Active-state marker**: full opacity, Atlas purple fill or border. The whole point of the feature is visual — make the marker feel intentional.
- **No new dependencies**. Use the design system (Ember CSS / shade tokens) already in this fork. Don't pull in `react-image-focal-point` or similar — the FocalPointPicker.jsx in the koenig fork was hand-rolled, mirror its size and approach.

---

## Out of scope

- Backend changes — they're done. If you find yourself editing `ghost/core/`, stop and check why.
- Body-image focal-point UI — already in the koenig editor (this is the picker you're mirroring).
- Storing the focal-point anywhere other than `feature_image_focal_point` (e.g. on the image URL itself, on a separate cropping table). Backend contract is fixed.
- OG / Twitter card preview UI showing the focal-point cropped result. The backend does not crop OG cards (see §22 Out of scope), so the preview can't show a meaningful crop result.
- Translating the picker chrome strings (until other admin strings get translated, which is a separate sweep).

---

## Plan-then-build workflow

1. **Plan only at first**. Don't edit anything except your plan file. Read the existing feature-image components, locate `FocalPointPicker.jsx` in the koenig fork, sketch out the prop wiring + the marker math + the click/drag handlers. Identify open questions and ask the user via `AskUserQuestion` before finalising.
2. **Critical files to read before planning**:
   - [`ghost/admin/app/components/gh-editor-feature-image.hbs`](ghost/admin/app/components/gh-editor-feature-image.hbs) — current feature-image editing UI
   - [`ghost/admin/app/components/gh-editor-feature-image.js`](ghost/admin/app/components/gh-editor-feature-image.js) — controller/component class
   - [`ghost/admin/app/components/gh-koenig-editor-lexical.hbs`](ghost/admin/app/components/gh-koenig-editor-lexical.hbs) lines 11-23 — prop wiring above
   - `ghost/admin/app/models/post.js` — Ember Data model definition
   - `node_modules/@tryghost/koenig-lexical/...` — the fork. Find `FocalPointPicker` (search `grep -rln "FocalPointPicker\|focal-point" node_modules/@tryghost/koenig-lexical/`). The fork is `@iliad.dev/koenig-lexical@1.1.4` aliased to `@tryghost/koenig-lexical` per `pnpm.overrides`.
   - `.claude/whitelabel-changes.md` §22 — what the backend does, the contract, the field shape
   - `.claude/whitelabel-changes.md` §10 — Atlas purple colour wiring (Ember + React)
   - `.claude/whitelabel-changes.md` §1 — `disableWebsiteFeatures` flag handling. The picker should NOT be hidden when `disableWebsiteFeatures` is true — focal-point matters for newsletter emails too, and emails are the only thing showing when website features are disabled.
3. **Once plan is approved**, build it. Mark `feature_image_focal_point` on the post model so save round-trips. Add the picker UI. Wire props through `gh-koenig-editor-lexical` and the editor controller. Style with existing tokens. Test end-to-end against a running `pnpm dev`.

---

## Verification

End-to-end smoke test:

1. `pnpm dev` and open a post in the editor with a feature image.
2. Click the focal-point entry-point control on the image preview. Picker activates.
3. Click somewhere off-centre on the image. Marker moves there in Atlas purple.
4. Save the post (or wait for autosave).
5. Reload the page. Marker should re-render at the same coordinate (data round-trips through API).
6. Open Mailpit (`http://localhost:8025`), send the post as a newsletter email. View HTML on the email and confirm `style="object-position: X% Y%"` is on the feature-image `<img>`. (Confirms the backend wire-up is being driven by your UI.)
7. Click the Reset control. Marker fades back to muted-centre. Save.
8. GET `/ghost/api/admin/posts/<id>` and confirm `feature_image_focal_point: null`.
9. Click dead-centre (`x=50, y=50`). Save. GET should also return `null` (collapse-to-null applied on the backend).
10. Set `disableWebsiteFeatures=true` (env var or config) and reload the editor. Picker is still present; site-only chrome around it (View post button etc.) is hidden, but the picker isn't.

---

## Notes from the backend implementation

- The backend pipeline that consumes the focal point: model `parse()` returns `{x, y}` as a parsed object (not the raw JSON string). API response shape matches what your UI sends.
- If you send `{x: 33.34, y: 66.78}`, the GET response will return `{x: 33.3, y: 66.8}` (rounded). Your UI should not be surprised by this — re-render from the response.
- Out-of-range coordinates are rejected by `admin-api-schema` at the validator layer (returns 422). The picker UI shouldn't be able to produce these (your math should clamp at `[0, 100]`), but defensively handle the 422 if it ever happens.
- The post model also includes `feature_image_alt`, `feature_image_caption`, `feature_image` (URL). All are top-level on the post object since the backend's output mapper auto-flattens `posts_meta` keys.

---

## Document the change

When done, append a section to `.claude/whitelabel-changes.md` describing the admin UI work — match the format of §22's "End-to-end" structure (Files touched, Behaviours, Verification, Upgrade guidance). The backend half is documented; the UI half should sit alongside it so the catalogue stays the source of truth.
