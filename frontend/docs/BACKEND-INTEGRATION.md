# The data layer

How this app talks to the Django REST Framework backend, and where to look when
a response does not match what a component expects.

This used to be a migration guide from a set of local fixtures to a live API.
That migration is done: the fixtures and the mock transport are gone, and
`lib/api/client.ts` speaks only HTTP.

---

## Where the seam is

```
 Server Components ────────────┐
 Route handlers (app/api/*) ───┤
                               ▼
                    lib/api/resources/*.ts     typed calls: blogs.getBlog(slug)
                               │
                               ▼
                    lib/api/client.ts          the only module that fetches
                               │
                               ▼
                    lib/api/schemas.ts         every response is parsed here
                               │
                               ▼
                       Django REST Framework
```

The browser never talks to Django. It calls the Next.js route handlers in
`app/api/`, which hold the tokens in httpOnly cookies and forward the request
server-side. **No CORS configuration is needed on Django**, and no access token
is ever exposed to JavaScript.

---

## The contract

**The backend publishes it.** `/api/schema/` is an OpenAPI document generated
from the serializers themselves, with Swagger UI at `/api/docs/`. That is the
authority. The zod schemas in [`lib/api/schemas.ts`](../lib/api/schemas.ts) are
a hand-maintained mirror — which is exactly how they drifted from the
serializers before, so check them against the generated schema when changing
either side.

Paths live in one table: [`lib/api/endpoints.ts`](../lib/api/endpoints.ts).

| Method | Path | View |
| --- | --- | --- |
| `POST` | `/auth/login/` | `EmailTokenObtainPairView` — signs in with `{email, password}` |
| `POST` | `/auth/login/refresh/` | `TokenRefreshThrottledView` |
| `POST` | `/auth/register/` | `RegisterView` → `201` + a token pair |
| `GET/PATCH` | `/auth/me/` | `UserProfileView` (`CurrentUserSerializer`) |
| `GET` | `/users/`, `/users/{username}/` | public profiles — **no** email or bookmarks |
| `GET` | `/users/{username}/blogs/`, `/playlists/` | the profile page's two lists |
| `GET` | `/users/me/saved-blogs/` | the viewer's bookmarks |
| `GET` | `/categories/` | **unpaginated** — a plain array, and cached server-side |
| `GET/POST` | `/blogs/` | `?page` `?page_size` `?category` `?author` `?tag` `?ordering` `?featured` `?exclude` `?search` |
| `GET/PATCH/DELETE` | `/blogs/{slug}/` | author only for writes; drafts 404 for everyone else |
| `POST` | `/blogs/{slug}/like/`, `/save/` | toggles |
| `POST` | `/blogs/{slug}/share-linkedin/` | `202` — queues a real share |
| `GET/POST` | `/playlists/`, `/playlists/{slug}/` | list returns summaries, detail includes `blogs` |
| `GET` | `/search/?q=` | semantic search — throttled and cached |
| `POST` | `/contact/` | `201 {"detail": "…"}` |
| `GET` | `/health/` | database + cache (`?deep=1` also opens the vector store) |

### Response shapes

Lists use DRF's `PageNumberPagination` envelope:

```json
{ "count": 11, "next": "…?page=2", "previous": null, "results": [ … ] }
```

`page_size` is honoured but **capped at 100** server-side. Anything that needs
every row has to page — `listAllBlogs()` and `listAllPlaylists()` do. Asking for
1000 rows silently returns one page, which is how the sitemap once covered
twenty posts.

Detail responses are the object itself, `snake_case`, ISO-8601 datetimes, with
`author` and `category` nested rather than as ids.

### Three widths of user

Nesting one wide user serializer everywhere leaked private fields into public
responses and cost four queries per author per row. There are now three:

| Schema | Where | Carries |
| --- | --- | --- |
| `authorSchema` | nested in every blog and playlist | name, avatar, bio, LinkedIn URL |
| `userSchema` | `/users/`, `/users/{username}/` | the above + `about`, `date_joined`, post counts |
| `currentUserSchema` | `/auth/me/`, and your own profile | the above + `email`, `auto_post_to_linkedin`, `saved_blog_ids`, `liked_blog_ids` |

So `blog.author.blog_count` does not exist. A page that needs the count fetches
the profile — the article page does this in parallel with its related-posts
query, for the author bio card.

### Writing a blog

The editor posts `multipart/form-data`, because the request can carry an image.
Three things follow from that:

- `sections` and `tags` are sent as **JSON strings** and decoded by
  `core.fields.JSONListField`. DRF's own `JSONField` would store the string
  verbatim, leaving a `str` in a column every reader treats as a list.
- Booleans are sent **explicitly**. DRF reads an absent boolean in a form body
  as `False` (the unchecked-checkbox convention); `core.fields.BooleanField`
  restores the model default, but sending them is still the honest thing.
- The category is `category_name` (free text — the backend resolves or creates
  it), not `category_id`.

`posted_on_linkedin` and `linkedin_post_url` are **read-only**: they are owned
by the task that does the posting, which uses the flag as its idempotency key.
To share, send `post_to_linkedin: true` or call the share endpoint.

Sending `expected_updated_at` (the `updated_at` the editor loaded) makes the
write conditional — the server answers `409` instead of silently discarding
somebody else's concurrent edit.

---

## How auth works

```
  browser                Next.js (BFF)                     Django
     │  POST /api/auth/login/  │                              │
     ├────────────────────────►│  POST /auth/login/           │
     │                         ├─────────────────────────────►│
     │                         │◄──── { access, refresh } ────┤
     │◄── { user }  +          │                              │
     │    Set-Cookie: httpOnly │                              │
     │                         │                              │
     │  GET /api/auth/session/ │  GET /auth/me/               │
     ├────────────────────────►├──── Authorization: Bearer ──►│
```

- Tokens live in `bm_access` and `bm_refresh` — `httpOnly`, `SameSite=Lax`,
  `Secure` in production. An XSS cannot read them; `document.cookie` returns
  nothing.
- `SameSite=Lax` blocks cross-site POSTs, and every mutating handler also
  compares `Origin` against `Host`
  ([`lib/auth/guards.ts`](../lib/auth/guards.ts)) as a second, independent check.
- `GET /api/auth/session/` refreshes a stale access token using the refresh
  cookie and rewrites the cookie. Server Components cannot set cookies, so this
  is where the session self-heals; the client calls it on mount.
- [`proxy.ts`](../proxy.ts) redirects signed-out visitors away from the editors
  and account pages. It is an **optimistic** check — cookie presence only —
  because the signing secret belongs to the backend. The authoritative check is
  `getViewer()` inside the page.
- `/accounts/*` is rewritten to Django (see [`next.config.ts`](../next.config.ts))
  because the LinkedIn OAuth redirect has to terminate there. The target comes
  from `DJANGO_ORIGIN`, not a hardcoded localhost.

---

## When something does not render

A schema mismatch surfaces as a `502` naming the offending field, from
`lib/api/client.ts`. It is not a mystery blank — read the message, then compare
the field against `/api/docs/`.

Failures are contained: every data route has an `error.tsx` (a retry, not the
full-page 500 screen) and a `loading.tsx` skeleton. Add both when you add a
route that fetches.

## Environment

```bash
API_BASE_URL=http://localhost:8000/api/v1   # required; throws at import if unset
DJANGO_ORIGIN=http://127.0.0.1:8000         # defaults to API_BASE_URL's origin
API_TIMEOUT_MS=10000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
