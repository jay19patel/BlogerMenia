# Blogermenia

Blogermenia is a full-stack blogging platform built with a Next.js frontend and a FastAPI backend. The backend includes a reusable framework layer called `Backbone`, designed to help developers build APIs, admin panels, authentication flows, and content systems quickly on top of MongoDB and Redis.

This repository currently contains two things:

- the Blogermenia application
- the evolving `Backbone` framework that powers the backend

## Stack

### Frontend

- Next.js 15
- React 19
- Tailwind CSS 4
- TanStack Query

### Backend

- FastAPI
- Beanie ODM
- MongoDB
- Redis
- Pydantic v2
- Uvicorn

## Repository Structure

```text
.
├── backend/
│   ├── api/                  # App-specific API routers
│   ├── backbone/             # Reusable framework layer
│   ├── schemas/              # App-specific Beanie models
│   ├── test/                 # API/manual test assets
│   ├── main.py               # FastAPI app entrypoint
│   ├── pyproject.toml
│   └── README.md             # Backbone framework guide
├── frontend/
│   ├── app/                  # Next.js app router pages
│   ├── components/           # UI components
│   ├── contexts/
│   ├── lib/
│   └── package.json
└── README.md
```

## What The System Already Supports

### Application features

- user registration and login
- Google login flow
- blog CRUD APIs
- category APIs
- playlists
- creator and user listing flows
- likes and view-tracking support
- media upload handling
- admin dashboard pages for model management

### Framework features through Backbone

- class-based generic CRUD views
- repository abstraction for Beanie documents
- permission system with object-level checks
- admin site registry
- session-based auth support
- Redis-backed cache service
- Redis-backed background task queue
- signal/event hooks
- rate limiting
- attachment/media model support

## Current State

The backend is functional and the framework direction is strong, but the framework is still in the middle of becoming production-grade. The main improvement areas identified during the audit are:

- framework and app code need clearer boundaries
- repository return types should be standardized
- silent exception handling should be reduced
- auth and admin flows need more production hardening
- observability and tests need to be expanded
- documentation needed to be corrected from old Django wording

A detailed architecture review is available at [backend/BACKBONE_ARCHITECTURE_AUDIT.md](/Users/jaypatel/Desktop/Development/Jay/Blogermenia-Djnago/backend/BACKBONE_ARCHITECTURE_AUDIT.md).

## Local Development

### Prerequisites

- Python 3.13+
- Node.js 20+
- MongoDB
- Redis
- `uv` recommended for Python environment management

### Standalone MongoDB and Redis Docker services

The root [docker-compose.yml](/Users/jaypatel/Desktop/Development/Jay/Blogermenia-Djnago/docker-compose.yml)
runs only MongoDB and Redis. Frontend and backend still run separately and
continue using their own two env files.

```bash
docker compose up -d
docker compose ps
```

By default the containers match the existing application env files:

```text
MongoDB: mongodb://admin:password@127.0.0.1:27017/blogermenia?authSource=admin
Redis:   redis://127.0.0.1:6379
```

MongoDB and Redis are exposed only on `127.0.0.1`, so they are usable by apps
running on the same VM without publishing database ports to the internet.

To set a stronger MongoDB password without creating a third env file:

```bash
MONGO_PASSWORD='replace-with-a-long-password' docker compose up -d
```

Use the same password in the `MONGODB_URI` values inside `backend/.env` and
`frontend/.env.local`. MongoDB initialization variables apply when the
`mongo_data` volume is first created; they do not reset an existing database
user's password.

### GCP VM and local MongoDB Compass access

On your local machine, keep this terminal command running:

```bash
gcloud compute ssh VM_NAME \
  --project=PROJECT_ID \
  --zone=ZONE \
  -- -N -L 27018:127.0.0.1:27017
```

Then connect from MongoDB Compass on your local machine using the username,
password, and database configured in the application env files:

```text
mongodb://admin:<MONGO_PASSWORD>@127.0.0.1:27018/blogermenia?authSource=admin
```

Use local port `27018` so this tunnel does not conflict with any MongoDB
already running locally. The GCP firewall only needs SSH access for this
workflow; do not create a public ingress rule for TCP port `27017`.

To test the tunnel from a local shell with MongoDB Shell installed:

```bash
mongosh "mongodb://admin:<MONGO_PASSWORD>@127.0.0.1:27018/blogermenia?authSource=admin"
```

### Backend setup

```bash
cd backend
uv sync
uv run uvicorn main:app --reload
```

Configure `backend/.env` with MongoDB, Redis, auth, Ollama, and GCS settings.
For GCS uploads, put the service-account JSON directly in the env file instead
of relying on a local JSON key path:

```env
ENVIRONMENT="production"
GCS_BUCKET_NAME="blogermenia"
GCS_CREDENTIALS_JSON='{"type":"service_account","project_id":"..."}'
```

### Backend deployment on Vercel

Create the Vercel project with `backend/` as the project root. The backend has
an `index.py` entrypoint for Vercel's FastAPI auto-detection, so no custom build
or start command is required.

Set these environment variables in Vercel:

```env
ENVIRONMENT="production"
MONGODB_URI="mongodb+srv://..."
MONGODB_DB="blogermenia"
REDIS_URL="rediss://..."
NEXTAUTH_SECRET="..."
NEXT_PUBLIC_API_URL="https://your-backend.vercel.app"
GCS_BUCKET_NAME="blogermenia"
GCS_CREDENTIALS_JSON='{"type":"service_account","project_id":"..."}'
```

`REDIS_URL` can be omitted or left unreachable if you want caching disabled,
but `MONGODB_URI` must point to a publicly reachable MongoDB deployment.

### Database seeding

Seed data is defined directly in one Python backend script; there is no
separate JSON seed-data directory or JavaScript seed project. With MongoDB
running and `backend/.env` configured:

```bash
cd backend
uv run python scripts/seed_database.py
```

The seeder creates or updates categories, users, blogs, playlists, FAQs and
testimonials using stable records and proper MongoDB references. It is safe to
run repeatedly and includes a login user:

```text
user1@example.com / password1
```

To refresh only records managed by this Python seeder before inserting them:

```bash
uv run python scripts/seed_database.py --reset
```

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

### Environment ownership

`frontend/.env.local` contains only the variables used by the Next.js app:

- MongoDB connection, NextAuth, Google OAuth and backend public URL
- shared `NEXTAUTH_SECRET` used by NextAuth and legacy auth routes

`backend/.env` contains only the variables consumed by FastAPI:

- MongoDB and Redis connection settings
- shared `NEXTAUTH_SECRET` token verification setting
- Ollama model settings
- environment, API upload URL, GCS bucket and GCS credential-file setting

Only these two application env files are used. `NEXTAUTH_SECRET` must match in
both files, and both `MONGODB_URI` values must point to the same database.

## Backend Entry Points

- app entry: [`backend/main.py`](/Users/jaypatel/Desktop/Development/Jay/Blogermenia-Djnago/backend/main.py)
- framework package: [`backend/backbone/__init__.py`](/Users/jaypatel/Desktop/Development/Jay/Blogermenia-Djnago/backend/backbone/__init__.py)
- framework guide: [`backend/README.md`](/Users/jaypatel/Desktop/Development/Jay/Blogermenia-Djnago/backend/README.md)

## Recommended Next Work

The next implementation phase should focus on framework maturity instead of adding more app-specific features first.

1. Clean the framework and app boundaries.
2. Standardize repository and service return contracts.
3. Introduce a proper app factory and plugin-style registration model.
4. Extract business logic from routers into services.
5. Harden auth, admin auth, configuration, and background jobs.
6. Add framework-level tests and operational documentation.

## Notes For Developers

- This project is not Django-based anymore. The current backend is FastAPI + Beanie.
- `Backbone` is the most important reusable layer in the backend and should be treated as a framework package, not just app code.
- New features should prefer clean extension points over putting more logic directly into routers.
