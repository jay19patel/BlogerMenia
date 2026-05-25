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

### GCP VM Docker deployment and local MongoDB Compass access

MongoDB is intentionally bound to `127.0.0.1:27017` on the VM. The backend
and frontend reach it over the Docker network, while a local computer reaches
it through an SSH tunnel. This avoids opening the database port to the internet.

On the GCP VM:

```bash
cp .env.gcp.example .env
# Edit .env and set strong MONGO_PASSWORD and NEXTAUTH_SECRET values.
docker compose up -d
docker compose ps
```

For a new VM this creates the MongoDB root user from `.env`. If `mongo_data`
already contains an initialized database, changing `MONGO_PASSWORD` alone does
not change that existing user's password.

On your local machine, keep this terminal command running:

```bash
gcloud compute ssh VM_NAME \
  --project=PROJECT_ID \
  --zone=ZONE \
  -- -N -L 27018:127.0.0.1:27017
```

Then connect from MongoDB Compass on your local machine using the username,
password, and database configured in the VM's `.env`:

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

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

### Suggested environment variables for backend

Create `backend/.env`:

```env
SECRET_KEY=replace_with_a_real_secret
ENVIRONMENT=develop
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=backbone_app
CACHE_ENABLED=true
REDIS_URL=redis://localhost:6379/0
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CLOUDINARY_URL=
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

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
