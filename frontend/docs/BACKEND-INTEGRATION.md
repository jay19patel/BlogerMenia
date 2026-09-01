# Switching to Django REST Framework

Everything above the transport is already written against a real HTTP API. Going
live is a configuration change plus a directory deletion — no component, page or
hook needs editing.

---

## The short version

```bash
# .env.local
API_MODE=live
API_BASE_URL=https://your-django-host/api
NEXT_PUBLIC_SITE_URL=https://your-frontend-host
```

```bash
rm -rf lib/api/mock          # the fixtures and their router
```

Then delete the one `mockRequest` import at the top of
[`lib/api/client.ts`](../lib/api/client.ts). That file is the only place in the
codebase that knows where data comes from.

---

## Where the seam is

```
 Server Components ────────────┐
 Route handlers (app/api/*) ───┤
                               ▼
                    lib/api/resources/*.ts        typed calls: blogs.getBlog(slug)
                               │
                               ▼
                    lib/api/client.ts   ◄── ★ THE SWAP POINT
                          │        │
              API_MODE=mock        API_MODE=live
                    │                    │
                    ▼                    ▼
            lib/api/mock/*        fetch(API_BASE_URL + path)
            (data/*.json)          Django REST Framework
```

The browser never talks to Django. It calls the Next.js route handlers in
`app/api/`, which hold the tokens in httpOnly cookies and forward the request
server-side. **That means no CORS configuration is needed on Django**, and no
access token is ever exposed to JavaScript.

---

## What Django has to provide

### 1. Endpoints

Paths live in one table — [`lib/api/endpoints.ts`](../lib/api/endpoints.ts).
Change them there if your router names things differently.

| Method | Path | Django equivalent |
| --- | --- | --- |
| `POST` | `/token/` | `TokenObtainPairView` (SimpleJWT) |
| `POST` | `/token/refresh/` | `TokenRefreshView` |
| `POST` | `/auth/register/` | your registration view → returns a token pair |
| `GET` | `/users/me/` | current user + `saved_blog_ids`, `liked_blog_ids` |
| `GET` | `/users/`, `/users/{username}/` | `UserListView`, `UserProfileView` |
| `GET` | `/users/{username}/blogs/`, `/playlists/` | the profile page's two lists |
| `GET` | `/categories/` | the `global_context` context processor |
| `GET` | `/blogs/` | `BlogListView` — supports `?page`, `?page_size`, `?category`, `?author`, `?ordering=-read_count`, `?featured`, `?exclude` |
| `GET/PATCH/DELETE` | `/blogs/{slug}/` | `BlogDetailView`, `BlogUpdateView`, `BlogDeleteView` |
| `POST` | `/blogs/{slug}/like/`, `/save/`, `/share-linkedin/` | `BlogLikeView`, `BlogSaveView`, `BlogShareLinkedInView` |
| `GET/POST/PATCH/DELETE` | `/playlists/`, `/playlists/{slug}/` | the `Playlist*View` set |
| `GET` | `/search/?q=` | `search.views.search_api` |
| `POST` | `/contact/` | `ContactView` |

### 2. Response shapes

Every response is parsed by a zod schema in
[`lib/api/schemas.ts`](../lib/api/schemas.ts) before it reaches a component, so a
serializer that drifts fails loudly at the boundary with the offending field
named — rather than rendering blanks three components deep.

Lists use DRF's `PageNumberPagination` envelope:

```json
{ "count": 11, "next": "/blogs/?page=2", "previous": null, "results": [ … ] }
```

Detail responses are the object itself, `snake_case`, with `author` and
`category` nested (not ids), and ISO-8601 datetimes.

Two fields are worth calling out because they already exist on your models:

- `avatar_svg` — expose the existing `Blog.avatar_svg` / `Playlist.avatar_svg` /
  `CustomUser.avatar_svg` properties on the serializer.
- `blog_count` / `playlist_count` / `like_count` — the `annotate()` values the
  Django views already compute.

If you would rather not add those to the serializers, drop them from the schema
and compute them in `lib/models.ts` instead; that file is the only consumer.

### 3. Settings

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),   # matches ACCESS_TOKEN_TTL
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),      # matches REFRESH_TOKEN_TTL
}
```

The lifetimes only need to match the cookie `maxAge` values in
[`lib/auth/cookies.ts`](../lib/auth/cookies.ts); adjust either side.

---

## How auth works

```
  browser                Next.js (BFF)                     Django
     │  POST /api/auth/login/  │                              │
     ├────────────────────────►│  POST /token/                │
     │                         ├─────────────────────────────►│
     │                         │◄──── { access, refresh } ────┤
     │◄── { user }  +          │                              │
     │    Set-Cookie: httpOnly │                              │
     │                         │                              │
     │  GET /api/auth/session/ │  GET /users/me/              │
     ├────────────────────────►├──── Authorization: Bearer ──►│
```

- Tokens live in `bm_access` and `bm_refresh` — `httpOnly`, `SameSite=Lax`,
  `Secure` in production. An XSS cannot read them; `document.cookie` returns
  nothing (there is a test for this).
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

### While in mock mode

`lib/api/mock/jwt.ts` mints genuine HS256 JWTs with SimpleJWT's claim names, so
expiry, refresh and the cookie plumbing are all exercised for real. The fixtures
carry no password hashes, so **any password is accepted** and the email address
selects which seeded account you sign in as
(`jaypatel@blogermenia.dev`, `sanamehra@…`, and so on).

Writes are validated and then rejected with `503` and an explanatory message,
which the UI surfaces through the app's own toast system. That is deliberate:
it keeps "this did not persist" visible rather than silently pretending.

---

## Checklist

- [ ] `API_MODE=live` and `API_BASE_URL` set
- [ ] `lib/api/mock/` deleted and its import removed from `lib/api/client.ts`
- [ ] Endpoint paths in `lib/api/endpoints.ts` match your router
- [ ] Serializers match `lib/api/schemas.ts` (or the schemas adjusted to match)
- [ ] SimpleJWT installed, token lifetimes aligned with `lib/auth/cookies.ts`
- [ ] `MOCK_JWT_SECRET` removed from the environment — it is now unused
- [ ] `npm run build` passes; the schemas will tell you about any mismatch
