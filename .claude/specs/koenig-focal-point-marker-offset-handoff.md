# Handoff — koenig-lexical body-image FocalPointPicker marker offset

> Read this whole file before touching anything. The previous agent (me) burned a round on a wrong hypothesis. Don't repeat the mistake — verify with browser DevTools before changing code.

---

## The bug, precisely

In the **body-image focal-point picker** (the one inside the Koenig editor, opened from the image-card toolbar — *not* the feature-image picker on `gh-editor-feature-image`), the picker's marker dot renders at the **top-left of the click point** instead of being centred on it.

The marker is rendered by `@iliad.dev/koenig-lexical@1.1.4` (aliased into the repo as `@tryghost/koenig-lexical` via `pnpm.overrides` — see `.claude/whitelabel-changes.md` §21 for the alias setup). Its DOM, captured by the user from a running editor:

```html
<div class="relative m-0 flex flex-col items-stretch gap-2 rounded-lg bg-white p-2 font-sans text-md font-normal text-black shadow-md dark:bg-grey-950 dark:text-grey-200" data-testid="focal-point-picker">
  <div class="relative max-w-[280px] cursor-crosshair select-none overflow-hidden rounded">
    <img alt="" class="block h-auto w-full" draggable="false" src="...">
    <div aria-hidden="true"
         class="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-green shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
         data-testid="focal-point-marker"
         style="left: 82.5%; top: 7.4%; opacity: 1;">
    </div>
    ...
  </div>
  ...
</div>
```

The marker has `class="… -translate-x-1/2 -translate-y-1/2 …"`. Those are Tailwind v3 utilities. Their compiled rule (verified, see §"What we know" below):

```css
.koenig-lexical .-translate-x-1\/2 {
  --tw-translate-x: -50%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y))
             rotate(var(--tw-rotate))
             skewX(var(--tw-skew-x))
             skewY(var(--tw-skew-y))
             scaleX(var(--tw-scale-x))
             scaleY(var(--tw-scale-y));
}
```

The chained `transform` only resolves to `translate(-50%, -50%) rotate(0) skewX(0) skewY(0) scaleX(1) scaleY(1)` when **all seven** variables are set. If any one is `unset`, CSS spec says the property's value is "guaranteed-invalid" → the property falls back to its initial value (`none`). At which point the marker uses raw `left: X%; top: Y%;` and renders at its top-left corner — exactly the symptom the user reports.

The user confirmed in DevTools that **`transform: none` (overriding to remove the translate) makes the marker render at the click point** (well, top-left of click — they accept this as visually "correct"). That tells us the `transform` is in fact resolving to *something* visually displacing the dot — but only because the picked-up percentages and the (-50%, -50%) translate combine to put the dot's centre at the click point, which on a small dot looks like "top-left of cursor's bounding box". With `transform: none`, the dot's *top-left* sits at the click coords, which the user reads as correct. (This is a slightly subtle perception thing — don't get hung up on whether centred or top-left is "correct"; the bug is "the picker doesn't behave the way the fork intended".)

**Important:** the user *also* reported a similar symptom on the *feature-image* picker built in this work cycle, but that picker uses non-Tailwind CSS and was probably misattributed during testing. Treat the feature-image picker as out of scope — focus on the body-image picker only.

---

## What we know (confirmed, not speculated)

1. **The fork's compiled `dist/style.css` *does* include the universal Tailwind preflight** that initialises the seven transform vars to defaults:
   ```css
   *,:before,:after,::backdrop {
     --tw-border-spacing-x:0; --tw-border-spacing-y:0;
     --tw-translate-x:0; --tw-translate-y:0;
     --tw-rotate:0; --tw-skew-x:0; --tw-skew-y:0;
     --tw-scale-x:1; --tw-scale-y:1;
     /* ...plus pan, gradient, ring, shadow, filter, backdrop, contain defaults */
   }
   ```
   Verified with: `dd if=node_modules/.pnpm/@iliad.dev+koenig-lexical@1.1.4/node_modules/@iliad.dev/koenig-lexical/dist/style.css bs=1 skip=3500 count=2000` — the block starts at byte 3616-ish.

2. **The same block is also embedded in `dist/koenig-lexical.umd.js`** (the file Ghost admin actually loads) — the UMD self-injects its CSS via `document.createElement('style'); a.textContent = '…'` at module-evaluation time. Verified at byte 4066 of the UMD via `grep -boP "translate-x:0;--tw-translate-y:0" node_modules/.pnpm/@iliad.dev+koenig-lexical@1.1.4/node_modules/@iliad.dev/koenig-lexical/dist/koenig-lexical.umd.js`.

3. **Ghost admin (Ember) loads only the UMD JS, not `style.css` directly.** [`ghost/admin/ember-cli-build.js:271`](ghost/admin/ember-cli-build.js) imports `node_modules/@tryghost/koenig-lexical/dist/koenig-lexical.umd.js`. The UMD itself is what creates the `<style>` element at runtime. The `style.css` file *is* copied to `ghost/core/core/built/admin/assets/koenig-lexical/style.css` by `ghost/admin/lib/asset-delivery/index.js` but **is not referenced from `index.html`** (only `vendor.css` and `ghost.css` are).

4. **`apps/admin` (Vite/React side) imports the ESM module differently** — see `apps/admin/src/utils/fetch-koenig-lexical.ts`. It does `await import('@tryghost/koenig-lexical')` and lets Vite's bundler handle CSS deduplication. **Important:** the post editor we care about is rendered by the Ember admin (`ghost/admin`), not the React `apps/admin`. Don't get confused which side is in play.

5. **The fork maintainer pushed back on the "preflight missing" hypothesis** with valid reasoning: every long-standing transform usage in the editor (Tooltip, ActionToolbar, CallToActionCard's rotate-45, DropdownContainer's translate-y-full, Toggle's peer-checked translate) would be visibly broken in upstream Ghost if the preflight were missing or non-functional. They aren't, and haven't been since 2022. So the bug is *not* "the fork doesn't ship the preflight."

6. **A scoped duplicate of the preflight (`ghost/admin/app/styles/components/koenig.css`, scoped to `.koenig-lexical *, .koenig-lexical ::before, .koenig-lexical ::after`) appeared to fix the symptom in the user's local environment** — but this was reverted because (a) it duplicates a rule that's already there, and (b) if it changes behaviour the right answer is to figure out what's stripping or overriding the original, not to layer a redundant copy. The shim is gone; do not re-add without diagnosing first.

7. **Ghost admin's own compiled `ghost.css` does *not* contain a `--tw-translate-x:0` initialiser** (other than the briefly-added shim that was reverted). Verified with `grep -c "\-\-tw\-translate" ghost/core/core/built/admin/assets/ghost.css` returning nothing relevant in the un-shimmed state. So if anything overwrites the koenig vars from the admin side, it's not Ghost admin's main bundle as built today.

8. **The `apps/admin` (Vite) build uses Tailwind v4** (per `CLAUDE.md` — "Ghost Admin uses TailwindCSS v4 via the `@tailwindcss/vite` plugin"). v4 has a different transform-utility model that does *not* rely on the v3-style `--tw-translate-x`, etc. variables. So if `apps/admin`'s built CSS happens to leak universal selectors that *unset* or *redefine* those vars, it could clash with the Koenig v3-shaped utilities. **This is a hypothesis, not confirmed.**

9. The `koenig-lexical.umd.js` bundles its own React. The Ember admin side accepts that; the Vite/React side has explicit comments about deduping React (`apps/admin/src/utils/fetch-koenig-lexical.ts`). Not directly relevant to the CSS bug but useful context for how this package gets loaded.

---

## What we've ruled out (don't waste time here)

- **"The fork's CSS is missing the preflight"** — false. See #1, #2.
- **"My (the agent's) feature-image picker is broken because of Tailwind"** — false. That picker doesn't use Tailwind utilities at all. The user mis-attributed some of the symptoms across the two pickers in earlier testing.
- **"Adding a duplicate preflight rule scoped to `.koenig-lexical *` is the right fix"** — at best a workaround. The maintainer is right that we shouldn't paper over the symptom in this repo when we can't reproduce it from a clean install of the fork. Diagnose first.
- **`pnpm.overrides` aliasing** — works correctly. `pnpm-lock.yaml` resolves `@tryghost/koenig-lexical` to the iliad tarball; the on-disk `node_modules/@tryghost/koenig-lexical` directory contains the fork's files. Confirmed via `find … -type d -name "koenig-lexical"`.

---

## Diagnostics to run (in this order)

These all need a running `pnpm dev` and a browser DevTools console with the body-image picker open (insert an image into a post body, click the focal-point button on its toolbar). Replace `<post-id>` with whatever post you opened.

### 1. Is the runtime CSS injection actually present?

In DevTools console:
```js
[...document.querySelectorAll('style')]
  .map(s => s.textContent)
  .filter(t => t.includes('--tw-translate-x'))
  .map(t => t.match(/[*,:][^{]{0,80}\{--tw-translate-x:[^}]{0,200}\}/g));
```
Expect to see the unscoped `*,:before,:after,::backdrop{--tw-translate-x:0;…}` block from the fork's UMD-injected style. **If empty / not seen, the UMD didn't inject its CSS** — that would be the actual bug, and we need to look at why (CSP? race? stale build? the UMD entrypoint changed in a fork update?).

### 2. What's the *computed* value of the variables on the marker?

```js
const m = document.querySelector('[data-testid="focal-point-marker"]');
const cs = getComputedStyle(m);
['--tw-translate-x','--tw-translate-y','--tw-rotate','--tw-skew-x','--tw-skew-y','--tw-scale-x','--tw-scale-y']
  .map(v => [v, cs.getPropertyValue(v)]);
```
Expected (if utilities are working as the fork intends):
- `--tw-translate-x: -50%`
- `--tw-translate-y: -50%`
- `--tw-rotate: 0`
- `--tw-skew-x: 0`, `--tw-skew-y: 0`
- `--tw-scale-x: 1`, `--tw-scale-y: 1`

If anything is the **empty string**, that's the cause of the broken transform — *something is unsetting it*. Track what.

If everything is set as expected but the marker still visually offsets, the bug is elsewhere — clipping ancestor, competing transform on a parent, layout-engine quirk, etc.

### 3. What's the computed `transform` on the marker?

```js
getComputedStyle(document.querySelector('[data-testid="focal-point-marker"]')).transform;
```
Expected: a matrix() value equivalent to `translate(-50%, -50%)`. (Browsers serialise to `matrix(1, 0, 0, 1, tx, ty)`.)
- If `none`, the transform isn't resolving (matches symptom; cross-check #2).
- If a matrix but the dot still looks displaced, look at parents.

### 4. Are there parent transforms or clipping ancestors?

```js
let el = document.querySelector('[data-testid="focal-point-marker"]');
while (el) {
  const cs = getComputedStyle(el);
  if (cs.transform !== 'none' || cs.overflow !== 'visible' || cs.clipPath !== 'none')
    console.log(el, {transform: cs.transform, overflow: cs.overflow, clipPath: cs.clipPath});
  el = el.parentElement;
}
```
A transform on an ancestor establishes a containing block for `position: fixed` descendants and can affect visual placement of `position: absolute` ones. An `overflow: hidden` ancestor can clip the marker. Both have caused similar bugs.

### 5. Confirm the loaded version

In DevTools Network tab, filter for `koenig-lexical`. Check the actual loaded URL and response body — confirm it's coming from `assets/koenig-lexical/koenig-lexical.umd.js` and (if you can grep it in DevTools) check it's the 1.1.4 build. Cross-reference against `pnpm-lock.yaml`:
```bash
grep -A 2 "koenig-lexical" /Users/owenr/Documents/GitHub/ghost-atlas-whitelabel/pnpm-lock.yaml | head -20
```

### 6. Is anything in the admin pipeline scoping or stripping universal selectors?

Look at:
- **Ember side**: `ghost/admin/ember-cli-build.js`, the `asset-delivery` addon (`ghost/admin/lib/asset-delivery/index.js`), and any PostCSS pipeline. The Ember build uses `ember-cli-postcss` typically — check `ghost/admin/lib/asset-delivery/package.json` and the `ember-cli-build.js` for postcss plugins.
- **Vite side** (`apps/admin/vite.config.ts`): Tailwind v4 via `@tailwindcss/vite`. This builds CSS for the React admin which is bundled separately into `apps/admin/dist/`. Worth checking whether anything in that pipeline could be touching the koenig UMD's runtime-injected CSS (probably not, since it's runtime-injected, but verify).
- Any `cssnano`, `postcss-prefixwrap`, `postcss-prefix-selector` style plugin would be a smoking gun.

### 7. Tailwind v4 conflict (the most plausible remaining hypothesis)

Per `CLAUDE.md` the React admin uses Tailwind v4. Check whether any `*` selector in the v4-built CSS sets `--tw-translate-*` vars to *undefined* or to v4-shape variables (v4 uses `--tw-translate-*` in a different way). The CSS load order matters — if v4's reset loads *after* the koenig UMD's runtime injection, it could overwrite the v3-shape vars.

```bash
grep -oP "\*[^{]{0,80}\{[^}]{0,500}--tw-translate" ghost/core/core/built/admin/assets/ghost.css
grep -oP "\*[^{]{0,80}\{[^}]{0,500}--tw-translate" apps/admin/dist/assets/*.css 2>/dev/null
```

If either finds a `*`-matching rule with `--tw-translate-*` declarations, walk through what they set and at what specificity. Compare load order (Ember bundles → admin index.html `<link>` → koenig UMD runtime injection → Vite bundles for embedded React apps).

### 8. Shadow DOM / iframe?

Lexical uses `createPortal` for decorator nodes (verified at byte 2749741 of `koenig-lexical.umd.js`). The portal target is a DOM node *inside* `.koenig-lexical` (it's the lexical-managed editor canvas — not document.body, not a separate document). So shadow-DOM/iframe shouldn't apply, but worth confirming with:
```js
document.querySelector('[data-testid="focal-point-marker"]').getRootNode() === document
```
Should be `true`. If `false`, something exotic is happening.

---

## Files and locations of interest

| What | Path |
|---|---|
| Fork package on disk | `/Users/owenr/Documents/GitHub/ghost-atlas-whitelabel/node_modules/.pnpm/@iliad.dev+koenig-lexical@1.1.4/node_modules/@iliad.dev/koenig-lexical/` |
| Fork's compiled CSS (not loaded directly by admin) | `…/dist/style.css` — preflight at byte ~3616 |
| Fork's UMD bundle (what Ember admin loads) | `…/dist/koenig-lexical.umd.js` — preflight inside `<style>`-injected text at byte ~4066, picker JSX at byte ~2369883 |
| pnpm alias declaration | [`package.json`](package.json) `pnpm.overrides` |
| Ember-side koenig loader | [`ghost/admin/app/utils/fetch-koenig-lexical.js`](ghost/admin/app/utils/fetch-koenig-lexical.js) |
| Asset-delivery addon (copies dist into built admin) | [`ghost/admin/lib/asset-delivery/index.js`](ghost/admin/lib/asset-delivery/index.js) |
| Ember admin build config | [`ghost/admin/ember-cli-build.js`](ghost/admin/ember-cli-build.js) (line 271 for koenig UMD app.import) |
| Vite/React admin build config | [`apps/admin/vite.config.ts`](apps/admin/vite.config.ts) |
| Built admin CSS (final output) | `ghost/core/core/built/admin/assets/ghost.css`, `vendor.css` |
| Built koenig dist (copied) | `ghost/core/core/built/admin/assets/koenig-lexical/style.css`, `koenig-lexical.umd.js` |
| Built admin index.html | `ghost/core/core/built/admin/index.html` |
| Whitelabel catalogue, koenig section | [`.claude/whitelabel-changes.md`](.claude/whitelabel-changes.md) §21 |
| Whitelabel catalogue, the focal-point work | [`.claude/whitelabel-changes.md`](.claude/whitelabel-changes.md) §22 (backend) and §23 (admin UI) |

---

## Communication context

The fork maintainer at `@iliad.dev/koenig-lexical` was looped in (out-of-band — see the chat preceding this handoff) and pushed back, correctly, on the "preflight missing" hypothesis. They asked us to:

> Could you check, in your deployed app:
> 1. `getComputedStyle(document.querySelector('[data-testid="focal-point-marker"]')).getPropertyValue('--tw-translate-x')` — empty string means something is stripping the var; -50% means the vars are fine and the bug is elsewhere (clipping ancestor, competing transform, etc).
> 2. Whether your bundler runs any PostCSS plugin that scopes/prefixes vendored CSS, or hands it through a "scope to component" transform.
> 3. The actually-loaded version (network tab or `import.meta`).
>
> Happy to co-debug once we have those readings. I'd rather not paper over the symptom in our package, since I can't repro it from a clean install of @iliad.dev/koenig-lexical@1.1.4.

The maintainer was right and is willing to co-debug once we provide the readings. **Run the diagnostics in §"Diagnostics to run" before talking to them again, and ideally before changing any code.**

---

## What "done" looks like

One of:
- A clean diagnosis (a specific rule or pipeline transform that's stripping/overriding the koenig vars), with a localised fix in this repo *or* a confirmed report back to the maintainer to fix in the fork.
- A confirmation that the user's earlier observation was unrepeatable (e.g. it was hot-reload state or a stale tab) and the bug doesn't exist in fresh installs — at which point we close it as not-reproducible.

In either case, update `.claude/whitelabel-changes.md` §21's "Open issue" subsection to reflect the resolution, and remove that subsection if the issue is closed.

---

## Things not to do

- Don't add the scoped Tailwind preflight shim back without first confirming via diagnostic #1 and #2 that the fork's runtime injection really is missing or being overridden in the user's environment.
- Don't change the feature-image picker (`gh-editor-feature-image.{js,hbs}` and the focal-point CSS in `editor.css` lines ~718-790). It's working and it's not what the user is reporting now.
- Don't patch `@iliad.dev/koenig-lexical` until you've confirmed (with the maintainer) that the bug is actually in the fork. Patching is a real maintenance cost on every fork bump (see §22's `kg-default-nodes` patch upgrade guidance for the pattern).
- Don't update `apps/admin` Tailwind v3/v4 setup to match the fork. That's a larger refactor and almost certainly not the right scope here.
