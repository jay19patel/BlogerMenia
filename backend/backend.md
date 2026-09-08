# Backend architecture & conventions

The rules this backend actually follows. Two apps used to agree on the layered
layout, a third had its own shape, and nothing was written down — so this file
is the reference. If you add an app, it looks like the ones below.

---

## 1. Stack

| Concern | Choice |
| --- | --- |
| Runtime | Python 3.13, dependencies via `uv` (`pyproject.toml` + `uv.lock`) |
| Framework | Django 6.x — **API only**, no server-rendered pages |
| API | Django REST Framework 3.18, JWT via `djangorestframework-simplejwt` |
| Schema | `drf-spectacular` → OpenAPI at `/api/schema/`, Swagger UI at `/api/docs/` |
| Filtering | `django-filter` + DRF `OrderingFilter` / `SearchFilter` |
| Queue | Celery 5 on Redis (broker DB 2, results DB 3, cache DB 4) |
| Vectors | Milvus Lite (`search/milvus.db`), embeddings from Gemini via LangChain |
| Database | SQLite in WAL mode. Move to Postgres before read volume demands it. |
| Frontend | A separate Next.js app. Django renders no blog pages — see §6. |

---

## 2. Naming rule

**DRF views live in `api.py`, or in an `api/` package. Never `views.py` or
`views/`.** These are API endpoints, not Django template views, and the
filename should say so.

```text
search/api.py                # a single module of endpoints
blog/api/blogs.py            # a package, one module per resource
blog/api/playlists.py
accounts/api/users_api.py
```

**One documented exception:** `linkedin_oidc/views.py`. django-allauth resolves
a provider's OAuth views by importing the literal path
`<package>.views.oauth2_login`, so renaming the module breaks social login at
import time. Those are also not DRF views — they are the OAuth2 redirect
endpoints allauth drives. The file carries a comment saying so.

---

## 3. Layout

```text
backend/
├── .env.example              # every variable, documented. `.env` is gitignored
├── manage.py
├── pyproject.toml            # prod deps; dev tools in [dependency-groups]
│
├── config/
│   ├── settings/
│   │   ├── __init__.py       # picks dev or prod from DJANGO_ENV
│   │   ├── base.py           # everything common. No `if DEBUG` in here
│   │   ├── dev.py            # DEBUG, locmem cache, eager tasks, console email
│   │   └── prod.py           # refuses to boot without SECRET_KEY / ALLOWED_HOSTS
│   ├── urls.py               # /api/v1/ mounted as a namespace, + schema + admin
│   ├── celery.py
│   ├── asgi.py
│   └── wsgi.py
│
├── core/                     # shared by every app. No models, no domain logic
│   ├── api.py                # /api/v1/health/
│   ├── cache.py              # version-keyed cache keys + bump()
│   ├── fields.py             # JSONListField, BooleanField (multipart-correct)
│   ├── mixins.py             # OptimisticLockMixin, Conflict (409)
│   ├── pagination.py         # PageNumberPagination with page_size_query_param
│   ├── permissions.py        # IsAuthorOrReadOnly, IsOwnerOrReadOnly
│   ├── sanitize.py           # clean_html, clean_svg, clean_text
│   ├── slugs.py              # unique_slug + SlugModelMixin (race-safe)
│   ├── tasks.py              # RETRY_POLICY, TransientError, PermanentError
│   ├── text.py               # blog_text / section_text — one implementation
│   └── validators.py         # validate_image (size, extension, content type)
│
├── blog/
│   ├── models/               # Blog, Playlist, Category, Like, ContactEntry
│   ├── serializers/
│   ├── api/                  # blogs.py, playlists.py, contact.py
│   ├── selectors.py          # annotated read querysets — see §4
│   ├── filters.py            # BlogFilter, PlaylistFilter
│   ├── services/             # ai_service (Gemini excerpt + tags)
│   ├── tasks.py              # + enqueue(), which survives a broker outage
│   ├── signals.py            # metadata generation, cache invalidation
│   ├── urls.py
│   └── tests/                # test_models.py, test_api.py
│
├── accounts/
│   ├── models/               # CustomUser
│   ├── serializers/          # user_serializers.py, auth_serializers.py
│   ├── api/                  # auth_api.py, users_api.py
│   ├── permissions.py        # re-exports from core
│   ├── services/             # LinkedInService
│   ├── tasks.py              # post_to_linkedin_task, queue_linkedin_post
│   ├── urls/                 # auth.py, users.py
│   └── tests.py
│
├── search/
│   ├── api.py                # the one search endpoint (cached + throttled)
│   ├── models/               # intentionally empty — see the module docstring
│   ├── services/             # search_service, embedding_service, indexing
│   ├── constants.py          # KIND_BLOG / doc_id()
│   ├── tasks.py, signals.py, urls.py, tests.py
│
└── linkedin_oidc/            # allauth provider (see §2)
```

---

## 4. Layer responsibilities

**Models** own invariants, indexes and constraints. Reusable behaviour comes
from a mixin in `core/` (`SlugModelMixin`), not from a copied `save()`.

**Selectors** (`app/selectors.py`) build read querysets, and they annotate
whatever the serializers read. This is the rule that keeps list endpoints fast:

```python
# blog/selectors.py
queryset.annotate(like_count_annotated=Count('likes', distinct=True))
```

```python
# blog/serializers/ — reads the annotation, falls back only off the hot path
def get_like_count(self, obj) -> int:
    annotated = getattr(obj, 'like_count_annotated', None)
    return annotated if annotated is not None else obj.likes.count()
```

A `SerializerMethodField` that queries unconditionally is an N+1 per row. The
serializer and the selector are changed together or not at all.

**Services** (`app/services/`) own writes with side-effects and every call to a
third party (Gemini, LinkedIn, Milvus). Views never talk to an external API.

**API views** stay thin: a queryset from a selector, a serializer, permission
classes, a throttle scope. Anything longer belongs in a service.

**Tasks** are thin too — they load a row, call a service, and record the
outcome. Retry policy comes from `core.tasks.RETRY_POLICY`; a task raises
`TransientError` for something worth retrying and `PermanentError` for
something that will fail identically forever.

---

## 5. Rules that are easy to get wrong

**Every writable detail view needs an object permission.**
`IsAuthenticatedOrReadOnly` only asks whether the caller is signed in, not
whether the object is theirs.

```python
permission_classes = [IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
```

**Never dispatch a task with a bare `.delay()` from a signal.** These run inside
`transaction.on_commit`, so an exception fires *after* the row is committed: the
user gets a 500 for a save that succeeded, retries, and creates a duplicate.
Use the app's `enqueue()` helper, which logs and returns `False`; the beat sweep
picks the work up later.

**Booleans and JSON columns need `core.fields` over multipart.** DRF stores a
multipart JSON string verbatim, and treats an absent boolean as `False` (the
unchecked-checkbox convention). Use `JSONListField` and `core.fields.BooleanField`.

**Author-supplied markup is sanitised on write.** `content` through
`clean_html`, Excalidraw `svgData` through `clean_svg`. The frontend sanitises
again on render; neither layer is enough alone.

**Task-owned state is `read_only` in the serializer.** `posted_on_linkedin` is
the idempotency key of `post_to_linkedin_task` — a client that could set it
would permanently suppress sharing for that post.

**Filter the detail queryset.** `Model.objects.all()` on a `Retrieve…` view
publishes drafts to anyone who can guess a slug, and slugs come from titles.

---

## 6. Django serves no pages

There are no blog templates and no context processors. `Blog.get_absolute_url()`
returns a URL on the Next.js frontend, built from `FRONTEND_URL` — reversing a
Django route there raises `NoReverseMatch`, because no such route exists.

`/accounts/` is the exception: allauth's own view tree, kept because the OAuth
redirect dance has to terminate on Django. The Next.js app proxies to it.

---

## 7. Environment & running

`DJANGO_SETTINGS_MODULE` is always `config.settings`. The environment is chosen
by `DJANGO_ENV` (`dev` by default), so manage.py, gunicorn, the worker and beat
can never disagree about which settings they loaded.

```bash
# everything at once: Redis check, worker, beat, Flower, runserver
uv run python manage.py dev

# or just Django (tasks run eagerly in dev — Milvus Lite holds a file lock,
# so the worker and the web process cannot both open the index)
uv run python manage.py runserver

# production
DJANGO_ENV=prod uv run gunicorn config.wsgi:application
```

Copy `.env.example` to `.env`. `config/settings/prod.py` raises
`ImproperlyConfigured` at import if a required secret is missing — a
misconfigured deploy fails at boot rather than running insecure.

---

## 8. Testing

`APITestCase` per endpoint, covering the contract *and* who is allowed to use
it. There were no API tests before, which is how a missing object permission
and a corrupted JSON column both reached production-readiness review.

```bash
uv run python manage.py test           # all
uv run python manage.py test blog      # one app
uv run python manage.py check --deploy # must be clean under DJANGO_ENV=prod
```
