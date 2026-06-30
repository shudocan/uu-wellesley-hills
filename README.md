# UU Wellesley Hills — Website

A hand-built **static website** for [uuwellesleyhills.org](https://uuwellesleyhills.org) — no CMS, no
server, no build step. Pages are plain HTML that render their content from `data/*.json`, so a non-technical
editor can change text and images through a friendly admin panel while developers (and AI assistants) edit the
files directly in git.

## How it works

- **Pages** (`*.html`) are layout-only templates. On load, a tiny script injects the shared header/footer
  (`partials/`) and fills each page in from its data file via `assets/js/render.js`.
- **Content** lives in `data/*.json` (and blog posts in `data/posts/*.md`). This is the single source of truth
  that both the admin panel and developers edit.
- **Theming** (`assets/css/theme.css`): each visitor can pick light/dark and one of three skins
  (Classic / Modern / Seasonal); the choice is saved in their browser.
- **Third-party features stay as embeds/links** — Breeze (giving, pledges, member login & directory), YouTube
  (livestream/sermons), Google Calendar, Zoom. There is **no backend to run**.

```
index.html, worship.html, music.html, …   ← pages (layout only)
partials/header.html, footer.html          ← shared, injected at runtime
data/*.json, data/posts/*.md               ← all editable content
assets/css/*, assets/js/*                  ← styles + behavior
admin/                                      ← the church editor (see below)
```

## Two ways to edit

### 1. The Website Editor (for the church office)
Open **`/admin`** on the live site. Sign in once, then: pick a page → edit the boxes → **Preview** → **Publish**
(*“live in about a minute”*). **Recent changes → Undo last change** reverts mistakes. No git knowledge needed.
A printable guide lives at `/admin/how-to-edit.html`.

The editor talks to the GitHub API from the browser and commits straight to the live branch; GitHub Pages then
rebuilds automatically.

### 2. Git (for developers / AI assistants)
Edit files and commit/push as usual. Layout, design, and code changes happen here. Both paths write the same
`data/` files, so they never conflict.

## Local preview

```bash
python3 -m http.server 8765      # then open http://localhost:8765
```
(Use a server, not `file://`, so `fetch()` of the data/partials works.)

## Deployment (GitHub Pages)

1. Push this repo to GitHub.
2. **Settings → Pages →** Source: *Deploy from a branch* → `main` / root.
3. The `CNAME` file already points at `uuwellesleyhills.org`. In Pages, set the custom domain and enable
   **Enforce HTTPS**.
4. **Go live = DNS cutover.** The domain currently uses **Wix** nameservers. At the registrar, point the domain
   at GitHub Pages:
   - `A` records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www` → `<your-github-username>.github.io`
   - (If the domain is registered *through* Wix, you may need to transfer it to a registrar like Cloudflare or
     Namecheap first.)
   - Preview on the temporary `https://<user>.github.io/<repo>/` URL until DNS is switched.

## One-time setup for the office editor

The editor signs in with a GitHub **fine-grained Personal Access Token**, scoped to this repo:
- GitHub → Settings → Developer settings → Fine-grained tokens → *Generate new token*
- Repository access: **only this repo**
- Permissions: **Contents → Read and write** (and *Pull requests* is not required)
- Paste the token into the editor's sign-in screen once; it's stored in that browser only.

Do this *with* the secretary during handoff so they never deal with it again.

## Rental inquiry form

Set a [Formspree](https://formspree.io) endpoint (pointed at `info@uuwellesley.org`) in
`assets/js/config.js` → `window.UU_FORM_ENDPOINT`. Until then, the form falls back to opening the visitor's
email app pre-filled.

## Still to verify before launch

Some values in `data/site.json` are best-guess placeholders pending confirmation against the live site:
the Breeze subdomain/links, social URLs, the Google Calendar embed `src`, and the YouTube channel. The
`data/home.json` `values.image` (official UU Shared Values graphic), event images, and post images are not yet
included and will gracefully hide until added (drop them in via the admin or `assets/img/`).
