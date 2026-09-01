# BlogerMenia — Next.js frontend

A rebuild of the [BlogerMenia](https://github.com/jay19patel/BlogerMenia) Django
site's frontend on the Next.js App Router. Every Django template has an
equivalent page or component, rendered from local JSON fixtures today and from a
Django REST Framework backend the moment you flip one environment variable.

```
npm install
cp .env.example .env.local
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

**Signing in:** any password works while `API_MODE=mock`; the email picks which
seeded account you get. Try `jaypatel@blogermenia.dev`.

---

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Server Components keep the data layer off the client |
| Styling | Tailwind CSS v4 | required by Untitled UI; migrated from v3 with the official codemod |
| Components | [Untitled UI React](https://www.untitledui.com/react) + React Aria | accessible primitives; see [Untitled UI](#untitled-ui) below |
| Server state | TanStack Query | session, search and mutations |
| Validation | Zod | one schema validates the API response *and* the form |
| Forms | React Hook Form | replaces hand-rolled `useState` form handling |
| Auth | SimpleJWT-shaped tokens in httpOnly cookies | tokens unreadable from JavaScript |
| Class names | `clsx` + `tailwind-merge` via `cn()` | also fixes a real Tailwind v4 scanner hazard |

---

## Architecture

```
 Server Components ────────────┐
 Route handlers (app/api/*) ───┤          the browser only ever calls these
                               ▼
                    lib/api/resources/*.ts
                               ▼
                    lib/api/client.ts   ◄── the single swap point
                          │        │
              API_MODE=mock        API_MODE=live
                    ▼                    ▼
            lib/api/mock/*        Django REST Framework
            (data/*.json)
```

Server Components call the data layer directly, so pages are still statically
generated and the fixtures, DiceBear and the API host never reach the browser
bundle. Client components talk only to the Next.js route handlers in `app/api/`,
which attach the cookie-held token server-side.

**→ [docs/BACKEND-INTEGRATION.md](docs/BACKEND-INTEGRATION.md)** is the full
guide to pointing this at Django: endpoint table, expected serializer shapes,
required settings, and a checklist.

---

## Security

- Access and refresh tokens live in `httpOnly`, `SameSite=Lax`, `Secure`
  cookies. `document.cookie` cannot see them — verified by an end-to-end test.
- Every mutating route handler compares `Origin` to `Host` on top of SameSite.
- `proxy.ts` keeps signed-out visitors out of the editors; pages re-check
  authoritatively with `getViewer()`.
- Responses are parsed by Zod at the transport boundary, so a malformed or
  hostile payload fails there rather than deep in a component.
- The only `dangerouslySetInnerHTML` calls are: DiceBear avatars and Excalidraw
  exports (both generated locally from fixture data), highlight.js output, and
  the legacy `content` field — which is sanitised with DOMPurify first.
- No secrets in the client bundle: `lib/api/**` is marked `server-only`, so an
  accidental client import fails the build.

---

## SEO

- Per-page `metadata` with canonical URLs, Open Graph and Twitter cards
  (`lib/seo.ts`).
- JSON-LD: `WebSite` + `SearchAction`, `BlogPosting`, `BreadcrumbList`,
  `ProfilePage`, `CollectionPage`, `ItemList` (`components/json-ld.tsx`).
- `app/sitemap.ts` and `app/robots.ts`, generated from the same data layer.
- Editors, delete confirmations, PDF views and the account flows are
  `noindex` and disallowed in robots.txt.
- 109 routes prerendered at build; article pages are static HTML with the full
  body in the initial response.

---

## Untitled UI

`components/base/` and `components/application/` are Untitled UI React source,
added with `npx untitledui@latest add <component>`. Its components reference
Untitled UI's own semantic tokens (`bg-brand-solid`, `text-secondary`,
`ring-primary`, …) — roughly 34 of them for the button alone — which normally
arrive with an 830-line theme that also carries a purple brand ramp and its own
type scale.

Importing that wholesale would have replaced BlogerMenia's look. Instead
[`app/untitled-ui-tokens.css`](app/untitled-ui-tokens.css) declares just the
tokens its components use and maps them onto this site's palette — `brand` is
the indigo ramp, the neutral roles resolve to Slate. An Untitled UI component
therefore drops in already wearing this site's colours.

Currently used for the Excalidraw Studio overlay, which gains a focus trap,
Escape handling and scroll locking that the original hand-rolled `div` never
had. Adding another component may need a token that is not in the bridge yet —
the file says how to spot and add it.

---

## Project structure

```
frontend/
├── app/
│   ├── layout.tsx                          base.html — fonts, providers, footer
│   ├── globals.css                         base.html <style> + .article-body rules
│   ├── page.tsx                            blog/home.html                     →  /
│   ├── not-found.tsx                       404.html
│   ├── global-error.tsx                    500.html
│   ├── contact/page.tsx                    blog/contact.html                  →  /contact/
│   ├── accounts-list/page.tsx              blog/user_list.html                →  /accounts-list/
│   ├── blogs/
│   │   ├── page.tsx                        blog/blog_list.html                →  /blogs/
│   │   ├── blog-form.css                   blog_form.html <style>
│   │   ├── create/page.tsx                 blog/blog_form.html                →  /blogs/create/
│   │   └── [slug]/
│   │       ├── page.tsx                    blog/blog_detail.html              →  /blogs/<slug>/
│   │       ├── update/page.tsx             blog/blog_form.html                →  /blogs/<slug>/update/
│   │       ├── delete/page.tsx             blog/blog_confirm_delete.html      →  /blogs/<slug>/delete/
│   │       └── pdf/                        blog/pdf_template.html             →  /blogs/<slug>/pdf/
│   ├── playlists/
│   │   ├── page.tsx                        blog/playlist_list.html            →  /playlists/
│   │   ├── playlist-form.css               playlist_form.html <style>
│   │   ├── create/page.tsx                 blog/playlist_form.html            →  /playlists/create/
│   │   └── [slug]/
│   │       ├── page.tsx                    blog/playlist_detail.html          →  /playlists/<slug>/
│   │       ├── update/page.tsx             blog/playlist_form.html            →  /playlists/<slug>/update/
│   │       └── delete/page.tsx             blog/playlist_confirm_delete.html  →  /playlists/<slug>/delete/
│   ├── profile/[username]/
│   │   ├── page.tsx                        blog/profile.html                  →  /profile/<username>/
│   │   └── edit/                           blog/profile_edit.html             →  /profile/<username>/edit/
│   └── accounts/                           django-allauth templates (see table below)
│   ├── api/                                the BFF the browser talks to
│   │   ├── auth/{login,signup,logout,session}/
│   │   ├── blogs/[slug]/{like,save}/
│   │   ├── search/  contact/
│   ├── sitemap.ts  robots.ts               generated from the data layer
│   ├── untitled-ui-tokens.css              Untitled UI tokens → this site's palette
│   └── globals.css                         base.html <style> + .article-body rules
├── components/
│   ├── base/  application/                 Untitled UI React source
│   └── …                                   partials/ + reusable card & form pieces
├── lib/
│   ├── api/
│   │   ├── client.ts                       ★ mock ⇄ live swap point
│   │   ├── schemas.ts                      the DRF contract (zod)
│   │   ├── endpoints.ts                    every path, in one table
│   │   ├── resources/                      typed calls per resource
│   │   └── mock/                           delete this when you go live
│   ├── auth/                               cookies, server session, CSRF guard
│   ├── query/                              TanStack Query setup + browser fetcher
│   ├── models.ts                           wire DTO → view model
│   ├── seo.ts                              canonical/OG metadata builder
│   └── …                                   Django template-filter ports
├── data/                                   the dummy JSON fixtures
├── docs/BACKEND-INTEGRATION.md             how to point this at Django
├── proxy.ts                                route protection (Next 16 middleware)
└── public/media/                           images migrated from Django MEDIA_ROOT
```

---

## Route map

### `blog/urls.py`

| Django URL | View | Template | Next.js page |
| --- | --- | --- | --- |
| `/` | `HomeView` | `blog/home.html` | `app/page.tsx` |
| `/contact/` | `ContactView` | `blog/contact.html` | `app/contact/page.tsx` |
| `/blogs/` | `BlogListView` | `blog/blog_list.html` | `app/blogs/page.tsx` |
| `/blogs/create/` | `BlogCreateView` | `blog/blog_form.html` | `app/blogs/create/page.tsx` |
| `/blogs/<slug>/` | `BlogDetailView` | `blog/blog_detail.html` | `app/blogs/[slug]/page.tsx` |
| `/blogs/<slug>/update/` | `BlogUpdateView` | `blog/blog_form.html` | `app/blogs/[slug]/update/page.tsx` |
| `/blogs/<slug>/delete/` | `BlogDeleteView` | `blog/blog_confirm_delete.html` | `app/blogs/[slug]/delete/page.tsx` |
| `/blogs/<slug>/like/` | `BlogLikeView` | *(JSON endpoint)* | like button in `components/blog-actions.tsx` |
| `/blogs/<slug>/save/` | `BlogSaveView` | *(JSON endpoint)* | save button in `components/blog-actions.tsx` |
| `/blogs/<slug>/share-linkedin/` | `BlogShareLinkedInView` | *(redirect)* | share button in `components/blog-actions.tsx` |
| `/blogs/<slug>/pdf-generate/` … `/pdf-download/` | `GeneratePDFView` … | `blog/pdf_template.html` | `app/blogs/[slug]/pdf/page.tsx` (print view) |
| `/playlists/` | `PlaylistListView` | `blog/playlist_list.html` | `app/playlists/page.tsx` |
| `/playlists/create/` | `PlaylistCreateView` | `blog/playlist_form.html` | `app/playlists/create/page.tsx` |
| `/playlists/<slug>/` | `PlaylistDetailView` | `blog/playlist_detail.html` | `app/playlists/[slug]/page.tsx` |
| `/playlists/<slug>/update/` | `PlaylistUpdateView` | `blog/playlist_form.html` | `app/playlists/[slug]/update/page.tsx` |
| `/playlists/<slug>/delete/` | `PlaylistDeleteView` | `blog/playlist_confirm_delete.html` | `app/playlists/[slug]/delete/page.tsx` |
| `/accounts-list/` | `UserListView` | `blog/user_list.html` | `app/accounts-list/page.tsx` |
| `/profile/<username>/` | `UserProfileView` | `blog/profile.html` | `app/profile/[username]/page.tsx` |
| `/profile/<username>/edit/` | `ProfileUpdateView` | `blog/profile_edit.html` | `app/profile/[username]/edit/page.tsx` |

### `search/urls.py` and error pages

| Django URL | Template | Next.js equivalent |
| --- | --- | --- |
| `/search/api/` | *(JSON endpoint)* | client-side filter in `components/site-header.tsx` |
| 404 handler | `404.html` | `app/not-found.tsx` |
| 500 handler | `500.html` | `app/global-error.tsx` |

### `accounts/` (django-allauth template overrides)

| Django URL | Template | Next.js page |
| --- | --- | --- |
| `/accounts/login/` | `account/login.html` | `app/accounts/login/page.tsx` |
| `/accounts/signup/` | `account/signup.html` | `app/accounts/signup/page.tsx` |
| `/accounts/logout/` | `account/logout.html` | `app/accounts/logout/page.tsx` |
| `/accounts/password/reset/` | `account/password_reset.html` | `app/accounts/password/reset/page.tsx` |
| `/accounts/password/reset/done/` | `account/password_reset_done.html` | `app/accounts/password/reset/done/page.tsx` |
| `/accounts/password/reset/key/<key>/` | `account/password_reset_from_key.html` | `app/accounts/password/reset/key/[key]/page.tsx` |
| `/accounts/password/reset/key/done/` | `account/password_reset_from_key_done.html` | `app/accounts/password/reset/key/done/page.tsx` |
| `/accounts/password/change/` | `account/password_change.html` | `app/accounts/password/change/page.tsx` |
| `/accounts/email/` | `account/email.html` | `app/accounts/email/page.tsx` |
| `/accounts/confirm-email/` | `account/verification_sent.html` | `app/accounts/confirm-email/page.tsx` |
| `/accounts/confirm-email/<key>/` | `account/email_confirm.html` | `app/accounts/confirm-email/[key]/page.tsx` |
| `/accounts/inactive/` | `account/account_inactive.html` | `app/accounts/inactive/page.tsx` |
| `/accounts/social/connections/` | `socialaccount/connections.html` | `app/accounts/social/connections/page.tsx` |
| `/accounts/social/signup/` | `socialaccount/signup.html` | `app/accounts/social/signup/page.tsx` |

### Partials → components

| Django partial | Component |
| --- | --- |
| `partials/header.html` | `components/site-header.tsx` (+ `page-header.tsx` wrapper) |
| `partials/sidebar.html` | `components/site-sidebar.tsx`, `components/sidebar-account.tsx` |
| `partials/sidebar_detail.html` | `components/detail-sidebar.tsx` |
| `partials/footer.html` | `components/site-footer.tsx` |
| `blog/_blog_body.html` | `components/blog-body.tsx`, `components/code-block.tsx` |
| `base.html` messages block | `components/messages-provider.tsx` |
| the shared allauth card chrome | `components/auth-shell.tsx` |

---

## Dummy data

`data/` mirrors the Django models field-for-field, so the fixtures read like a
`dumpdata` export. `lib/data.ts` joins them at module load — the static
equivalent of the `select_related` / `annotate` calls in `blog/views/`.

| File | Model | Records |
| --- | --- | --- |
| `data/blogs.json` | `blog.Blog` | 12 (11 published + 1 draft) |
| `data/users.json` | `accounts.CustomUser` | 7 |
| `data/categories.json` | `blog.Category` | 6 |
| `data/playlists.json` | `blog.Playlist` | 7 (one deliberately empty) |

The set is arranged to exercise every branch in the templates: a featured card
plus a second page of pagination (`paginate_by = 10`), posts with and without a
cover image, with and without a category, all ten structured section types, one
legacy `content`-only post, an empty playlist, a draft, a user with no name and
no bio, and the "no results" state of every list.

Everything is a plain `import` — there is no `fetch`, no `axios`, and no data
loader anywhere in the project.

---

## Fidelity notes

**Tailwind v4, migrated from v3.** The Django page loads the Tailwind Play CDN,
which is v3; Untitled UI requires v4.3. The migration ran through the official
`@tailwindcss/upgrade` codemod, and every page was pixel-diffed against a v3
baseline afterwards. Three v4 behaviours needed compatibility work:

- **Font-size line-heights became unitless ratios**, so an 11px child inside a
  `text-sm` parent inherited `1.4286` instead of `20px` and came out 4.3px
  shorter. `app/globals.css` pins the v3 scale's absolute line-heights.
- **`space-y-*` moved the gap** from a top margin on the following sibling to a
  bottom margin on the preceding one, which collided with `!mb-0` and with the
  unlayered `.article-body li` rule. The list rule is now scoped away from lists
  that manage their own rhythm.
- **Unlayered CSS now outranks every utility** regardless of specificity, which
  changed which rule won inside `.article-body`.

Four differences from the Django rendering are deliberate and were verified one
at a time — everything else diffs to zero pixels:

| Page | Change | Why |
| --- | --- | --- |
| Profile | Cover gradient is now visible | `from-brand-400` was never defined upstream, so the gradient was invalid and the banner rendered blank. The five declared brand shades are Tailwind's Indigo ramp, so the gaps are filled from the same ramp and the markup renders as written. |
| Home | `<h1>` +11.5px, hero `<p>` +13.5px | v3 emitted responsive `text-*` after `leading-*`, so `leading-[1.08]` and `leading-relaxed` were silently overridden. v4's `--tw-leading` custom property makes them apply as authored. |
| Blog list | Card heading +2px | Same cause — `leading-snug` under `sm:text-2xl`. |
| Playlists | Hero +9px | Same cause — `leading-[1.08]` under `sm:text-6xl`. |

Reverting these would mean deliberately re-introducing a v3 ordering bug.

**Fonts.** Plus Jakarta Sans, Newsreader and JetBrains Mono are loaded through
`next/font/google` with the same weights and styles as the `<link>` in
`base.html`, exposed as the CSS variables the Tailwind theme reads.

**Avatars.** `blog.utils.generate_avatar` uses DiceBear server-side; the same
library generates the same seeded SVGs here at build time (`lib/avatar.ts`), so
`avatar_svg` is a plain string on the model objects and no avatar code reaches
the browser.

**Syntax highlighting.** `blog_detail.html` loads highlight.js from a CDN and
calls `highlightAll()`; here the same library runs at build time, so there is no
unhighlighted flash. The hover "Copy" button is the only client-side part.

**Page-scoped CSS.** Several templates put bare element selectors
(`input[type="text"] { … }`) in `{% block head %}`. Those are page-scoped in
Django, but a stylesheet loaded during a client-side navigation in Next.js would
leak into later pages, so each of those blocks is namespaced under a form class
(`.auth-fields`, `.legacy-fields`, `.playlist-form`, `.profile-edit-form`). The
computed styles are unchanged.

**Table of contents.** The original builds the article TOC in the browser by
walking the rendered `<h2>`s and assigning `section-<n>` to any without an id —
which collides when a post has untitled sections. `lib/blog.ts#buildToc` derives
the same list from the post data instead, so every anchor is unique. The
scroll-spy highlight behaves exactly as before.

**Raw SVG injection.** DiceBear avatars, Excalidraw exports and the legacy
`content` field are injected as HTML, as the Django templates do with `|safe`.
The first two are generated locally from fixture data; the legacy body is passed
through DOMPurify first. Everything else is rendered as real React elements —
including `|linebreaks`, which becomes `components/linebreaks.tsx` so React does
the escaping Django's autoescaping did.

**Excalidraw.** `blog_form.html` pulls React 18 and the Excalidraw UMD bundle
from unpkg. Here `@excalidraw/excalidraw` is a real dependency, `dynamic()`-
imported so it stays out of the initial bundle.

---

## The signed-in state

Django renders two variants of almost every page — one for anonymous visitors
and one for the signed-in author — so a static rebuild needs *some* notion of
who is looking, or half the UI is unreachable.

`components/session-provider.tsx` reads it from `GET /api/auth/session/`, which
resolves the httpOnly cookie server-side and refreshes a stale access token on
the way. Pages render their signed-out variant on the server — that is what
search engines and the static build see — and the authenticated parts fill in
once the session resolves.

Signing in from `/accounts/login/` picks the fixture account whose e-mail
matches — **any password works** while `API_MODE=mock`, and any unknown address
falls back to the first account — after which the author-only UI appears:

- the WRITE section of the sidebar, the header avatar, "Write an article"
- like and save buttons, optimistic through TanStack Query, posting to the BFF
- Edit / Delete / Share on your own posts and playlists, the Saved Blogs tab

The fixture accounts are `jaypatel`, `sanamehra`, `rohankapoor`, `priyanair`,
`arjunsingh`, `meeraiyer` and `devkumar` (`<username>@blogermenia.dev`).

### What the forms do

Forms are React Hook Form + Zod, validated against the same schemas the API
layer uses for request bodies, and they surface DRF-style field errors
(`{"field": ["message"]}`) on the right inputs.

While `API_MODE=mock` the writes reach the mock backend and come back `503` with
an explanatory message, which the UI shows through the app's own
`django.contrib.messages` toast system. That is deliberate — it keeps "this did
not persist" visible instead of silently pretending. Likes and saves are the
exception: those are optimistic and stick for the session.

Two states have no data source to branch on and are reachable by query string:
`/accounts/confirm-email/<key>/?state=taken` and `?state=expired`. The
password-reset link renders its `token_fail` branch for any key that is not
shaped like allauth's `<uidb36>-<key>`.

### PDF download

`GeneratePDFView` queued a Celery task that rendered `pdf_template.html` with
wkhtmltopdf. The download button here opens `/blogs/<slug>/pdf/` — the same
document, with the same print stylesheet — and hands it to the browser's own
"Save as PDF".
