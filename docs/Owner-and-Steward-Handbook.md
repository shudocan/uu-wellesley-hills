% UU Wellesley Hills Website — Owner & Steward Handbook
% For the church's website stewards

---

## Who this is for

This handbook is for the church's **website stewards** — the volunteers who *own and look after* the website. It assumes no special technical background. If you can follow steps and copy-paste, you can be a steward.

**The Golden Rule: there are always THREE stewards.** Never let it drop below three. When a steward steps down or becomes unavailable, recruit and add a replacement promptly. Three means the website is never dependent on any one person. The editor will remind you if the count falls below three.

**Current stewards** are listed in the editor under **Stewards** (and in `data/stewards.json`). Keep that list up to date.

---

## What a steward does

A steward:

- Holds **owner access** to the church's GitHub organization (where the website lives).
- **Issues and revokes access codes** so the church office (and others) can edit content.
- Helps manage the **domain** (uuwellesleyhills.org).
- Handles **bigger changes** — using Claude Code (an AI assistant) or any web developer.
- Keeps the **stewards list** current and ensures there are always three.

Day-to-day *content* editing (events, news, text, photos) is done by the office through the simple **Website Editor** — stewards don't need to be involved in that.

---

## Where everything lives (the church's accounts & assets)

| Thing | Where | Who needs access |
|---|---|---|
| **Website code + hosting** | GitHub organization **`uuwellesleyhills`**, repository **`uu-wellesley-hills`**, served free by **GitHub Pages** | All stewards (as org **owners**) |
| **The address (domain)** | `uuwellesleyhills.org` — registered at **Bluehost** (the registrar). DNS currently runs through Wix. | A steward + the church office |
| **Giving & member directory** | **Breeze** (the church's existing system) — linked from the site, not part of the website code | Church office / Breeze admins |
| **Rental inquiry form** | **Formspree** (emails the office) — set up under a church email | A steward |
| **AI "Build a page" helper** | **Puter.js** — a free service, no account or key needed | (nobody) |

Nothing here is proprietary or locked to an individual. The website is plain files anyone can read, edit, and host.

---

## Adding or removing a steward

A steward is two things: an **owner** of the GitHub organization, and an entry in the **Stewards** list.

**To add a steward:**
1. The new person creates a free personal **GitHub account** (if they don't have one) and tells you their username.
2. An existing steward signs in to GitHub → the **`uuwellesleyhills`** organization → **People** → **Invite member** → add them, then set their role to **Owner**.
3. In the Website Editor, open **Stewards**, click **+ Add**, fill in their name, role, and GitHub username, and **Publish**.

**To remove a steward:** reverse it — remove them as an org owner in GitHub, and remove their entry from the **Stewards** list. **Then make sure you're back to three** (recruit if needed).

---

## Issuing an editor access code (so someone can edit content)

Editors (like the church office) sign in to the Website Editor with a personal **access code**. A steward creates it:

1. Go to **https://github.com/settings/personal-access-tokens/new** (signed in to a steward account that owns the org).
2. **Token name:** `UUWH editor — [person's name]`
3. **Expiration:** e.g. 1 year.
4. **Resource owner:** select the **`uuwellesleyhills`** organization.
5. **Repository access:** **Only select repositories** → `uu-wellesley-hills`.
6. **Permissions:** **Repository permissions → Contents → Read and write**.
7. **Generate token**, copy the `github_pat_…` code, and hand it to the editor in person (not by email).

The editor enters it once on their computer (account: `uuwellesleyhills`, repo: `uu-wellesley-hills`, branch: `main`).

**Notes:**
- One code per person (so you can revoke individuals). The same code is re-entered on each computer/browser that person uses — you don't need a separate code per device.
- **To revoke:** delete that token on the same GitHub tokens page. The person is immediately locked out; no one else is affected.

---

## Recovery & rollback — no developer needed

Almost nothing can go permanently wrong. In order of simplicity:

1. **Undo last change.** In the Website Editor, scroll to **Recent changes** → **Undo last change**. This puts the whole site back to how it was before the last edit. Safe to use anytime.
2. **Restore an older version.** Every change is saved forever in GitHub. A steward can go to the repository → **Commits**, find a good earlier version, and revert to it (GitHub has a "Revert" button on each change). 
3. **If the site looks broken or blank:** wait two minutes (changes take ~a minute to appear), then hard-refresh (hold Shift and reload). If still broken, use **Undo last change**, or revert the most recent commit in GitHub. 
4. **Worst case:** the entire website is plain files in the repository. **Any** web developer — or **Claude Code** (below) — can fix or rebuild it from there. You are never dependent on one specific person.

---

## Making bigger changes (new features, redesigns, fixes)

The **✨ Build a page** tool in the editor handles simple new pages. For anything bigger — a redesign, an online form, event registration, restructuring menus, or fixing something — connect a more powerful AI or a developer:

**Claude Code (recommended):**
1. Go to **claude.com/code** and sign in.
2. Connect it to the repository **`uuwellesleyhills/uu-wellesley-hills`**.
3. Paste the **website summary** below, then describe what you want in plain English.
4. Review and publish (or have it open the change for review).

**Website summary — paste this into any AI:**

```
This is the UU Wellesley Hills church website. Key facts for editing it:

- It is a hand-built STATIC website — plain HTML, CSS, and a little vanilla JavaScript. No CMS, no framework, no build step, no backend/server.
- Hosted on GitHub Pages from the church-owned repo: uuwellesleyhills/uu-wellesley-hills (branch: main). Committing to main publishes the live site in about a minute.
- Pages are layout-only HTML files at the repo root. They fetch shared header/footer from /partials/ and fill content from /data/*.json via /assets/js/render.js (bindings: data-bind, data-bind-src, data-list).
- Editable content lives in /data/*.json and blog posts in /data/posts/*.md. Styling: /assets/css/theme.css (light/dark + skins via CSS variables), styles.css, animations.css.
- A browser-based admin at /admin/ lets non-technical staff edit content and commit via the GitHub API. Keep it working.
- Third-party features are embeds/links only (no backend): Breeze ChMS (giving, member login/directory), YouTube, Google Calendar, Zoom. The rental form posts to Formspree.

Please follow existing patterns, keep the admin and theming intact, and preview before publishing.
```

---

## The domain (uuwellesleyhills.org)

- It is registered at **Bluehost**. Someone at the church set it up — **find who holds the Bluehost login** (likely the office). Record it where stewards can reach it.
- DNS currently points to **Wix** (the old site). **Going live** with the new site means logging into Bluehost and pointing the domain at GitHub Pages:
  - `A` records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
  - `CNAME` for `www` → `uuwellesleyhills.github.io`
  - Then in GitHub → repo → **Settings → Pages**, set the custom domain to `uuwellesleyhills.org` and enable **Enforce HTTPS**.
- Keep the Bluehost domain **renewed** so the address never lapses.

---

## One-time handover checklist

- [ ] A steward creates the free GitHub organization **`uuwellesleyhills`** (github.com/account/organizations/new → Free plan).
- [ ] Transfer the repository into the org (the current owner can do this in seconds).
- [ ] Re-enable **GitHub Pages** under the org.
- [ ] Add **Timothy Fulham** and a **third steward** as org **owners**, and to the **Stewards** list. (You start with Andrew Weaver + Timothy Fulham — recruit one more to reach three.)
- [ ] Track down the **Bluehost** domain login (church office).
- [ ] Set up **Formspree** for the rental form under a church email.
- [ ] When ready, do the **DNS cutover** so the live site is at uuwellesleyhills.org.
- [ ] Give the office editor their **access code** and the **Website Editor guide**.

Once these are done, the website is **fully owned and operated by the church** — no outside individual required.
