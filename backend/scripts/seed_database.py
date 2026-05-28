"""Seed Blogermenia MongoDB collections from the backend.

Usage:
    uv run python scripts/seed_database.py
    uv run python scripts/seed_database.py --reset

The script reads MONGODB_URI and MONGODB_DB through app.config.Settings.
It upserts deterministic seeded records, so running it repeatedly is safe.
"""
from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone
import hashlib
from pathlib import Path
import sys
from typing import Any

import bcrypt
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import PyMongoError

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.config import settings  # noqa: E402

SEED_MARKER = "python_seed_v1"
BLOG_IMAGE = "https://storage.googleapis.com/gweb-cloudblog-publish/original_images/cloud_network_map.png"
BLOG_CONTENT = {
    "introduction": (
        "Google Cloud Platform provides infrastructure, managed data services, "
        "and AI tooling for modern applications. This practical guide explains "
        "the core building blocks and how they fit together."
    ),
    "sections": [
        {
            "type": "text",
            "title": "What makes GCP useful?",
            "content": (
                "GCP combines global networking, managed compute, cloud storage, "
                "analytics, and Kubernetes-based deployment tools in one platform."
            ),
        },
        {
            "type": "bullets",
            "title": "Core services",
            "items": [
                "Compute Engine for virtual machines",
                "Cloud Storage for files and media",
                "Cloud Run for serverless containers",
                "GKE for orchestrated workloads",
            ],
        },
        {
            "type": "code",
            "title": "Select a Google Cloud project",
            "language": "bash",
            "content": "gcloud auth login\ngcloud config set project your-project-id",
        },
        {
            "type": "links",
            "title": "Reference",
            "links": [
                {
                    "text": "Google Cloud documentation",
                    "url": "https://cloud.google.com/docs",
                    "description": "Official documentation for Google Cloud services.",
                }
            ],
        },
    ],
    "conclusion": (
        "Start with managed services and a clear security model, then expand "
        "the architecture as traffic and operational needs grow."
    ),
}


def seed_id(kind: str, number: int = 0) -> ObjectId:
    value = f"blogermenia:{SEED_MARKER}:{kind}:{number}"
    return ObjectId(hashlib.sha256(value.encode("utf-8")).hexdigest()[:24])


def password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_documents() -> dict[str, list[dict[str, Any]]]:
    now = datetime.now(timezone.utc)
    category_id = seed_id("category", 1)

    categories = [{
        "_id": category_id,
        "_seed_marker": SEED_MARKER,
        "name": "Technology",
        "slug": "technology",
        "createdAt": now,
        "updatedAt": now,
    }]

    users = []
    for number in range(1, 11):
        users.append({
            "_id": seed_id("user", number),
            "_seed_marker": SEED_MARKER,
            "email": f"user{number}@example.com",
            "password": password_hash(f"password{number}"),
            "full_name": f"Architect User {number}",
            "username": f"user_{number}",
            "headline": f"Senior System Architect {number}",
            "description": "I am a system architect specializing in large scale systems.",
            "bio": f"Detailed bio for Architect User {number} covering years of experience in various technologies.",
            "profile_image": f"https://ui-avatars.com/api/?name=Architect+User+{number}&background=0D8ABC&color=fff",
            "role": "Admin" if number == 1 else "User",
            "is_active": True,
            "blog_count": 5,
            "total_views": 1000 - number * 41,
            "total_likes": 400 - number * 17,
            "createdAt": now,
            "updatedAt": now,
        })

    blogs = []
    for number in range(1, 51):
        author_number = ((number - 1) % 10) + 1
        blogs.append({
            "_id": seed_id("blog", number),
            "_seed_marker": SEED_MARKER,
            "title": f"Mastering Google Cloud Platform: A Complete Guide Part {number}",
            "subtitle": "Core Google Cloud services and practical deployment patterns",
            "slug": f"mastering-google-cloud-platform-guide-part-{number}",
            "excerpt": "Learn how to build scalable applications with Google Cloud services.",
            "thumbnail": BLOG_IMAGE,
            "image": BLOG_IMAGE,
            "content": BLOG_CONTENT,
            "author": seed_id("user", author_number),
            "category": category_id,
            "category_name": "Technology",
            "tags": ["gcp", "cloud computing", "google cloud", "devops"],
            "featured": number <= 5,
            "is_published": True,
            "views": 100 + number * 13,
            "likes": 20 + number * 3,
            "publishedDate": now,
            "createdAt": now,
            "updatedAt": now,
        })

    playlists = []
    for number in range(1, 21):
        selected_blogs = [seed_id("blog", ((number * 3 + offset - 1) % 50) + 1) for offset in range(3)]
        playlists.append({
            "_id": seed_id("playlist", number),
            "_seed_marker": SEED_MARKER,
            "name": f"Master Playlist {number}",
            "slug": f"master-playlist-{number}",
            "description": f"A master collection of system engineering topics {number}.",
            "cover_image": BLOG_IMAGE,
            "owner": seed_id("user", ((number - 1) % 10) + 1),
            "is_public": True,
            "blogs": selected_blogs,
            "blog_count": len(selected_blogs),
            "total_views": 200 + number * 17,
            "total_likes": 30 + number * 4,
            "createdAt": now,
            "updatedAt": now,
        })

    questions = [
        ("How do I start writing technical blogs?", "Sign up, open New Blog, and begin drafting your article."),
        ("What is Blogermenia?", "Blogermenia is an AI-powered technical publishing platform."),
        ("Can I monetize my blogs?", "Monetization features can be added for creator programs."),
        ("Is there a limit to how many blogs can I write?", "No, you can publish as many blogs as you need."),
        ("How does AI help in writing?", "AI helps build structure, excerpts, and draft content."),
    ]
    faqs = [{
        "_id": seed_id("faq", number),
        "_seed_marker": SEED_MARKER,
        "question": question,
        "answer": answer,
        "is_active": True,
        "order": number,
        "createdAt": now,
        "updatedAt": now,
    } for number, (question, answer) in enumerate(questions, start=1)]

    roles = ["System Architect", "Senior Developer", "DevOps Engineer", "CTO", "Frontend Engineer"]
    testimonials = [{
        "_id": seed_id("testimonial", number),
        "_seed_marker": SEED_MARKER,
        "name": f"Tech Leader {number}",
        "role": roles[(number - 1) % len(roles)],
        "content": "Blogermenia has transformed how our engineering team shares technical knowledge.",
        "rating": 5,
        "is_approved": True,
        "user": seed_id("user", ((number - 1) % 10) + 1),
        "createdAt": now,
        "updatedAt": now,
    } for number in range(1, 9)]

    return {
        "categories": categories,
        "users": users,
        "blogs": blogs,
        "playlists": playlists,
        "faqs": faqs,
        "testimonials": testimonials,
    }


async def create_indexes(database: AsyncIOMotorDatabase) -> None:
    await database["users"].create_index("email", unique=True)
    await database["blogs"].create_index("slug", unique=True)
    await database["categories"].create_index("slug", unique=True)
    await database["playlists"].create_index("slug", unique=True)


async def seed_database(reset: bool) -> None:
    client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    try:
        await client.admin.command("ping")
        database = client[settings.mongodb_db]
        documents = create_documents()

        if reset:
            for collection in documents:
                await database[collection].delete_many({"_seed_marker": SEED_MARKER})

        resolved_ids: dict[ObjectId, ObjectId] = {}
        for collection, records in documents.items():
            for record in records:
                rewrite_references(collection, record, resolved_ids)
                intended_id = record["_id"]
                match = unique_match(collection, record)
                existing = await database[collection].find_one(match, {"_id": 1})
                if existing:
                    record["_id"] = existing["_id"]
                resolved_ids[intended_id] = record["_id"]
                await database[collection].replace_one(match, record, upsert=True)
            print(f"Seeded {len(records):>2} {collection}.")

        await create_indexes(database)
        print(f"Done. MongoDB database '{settings.mongodb_db}' now contains backend-managed seed data.")
        print("Login example: user1@example.com / password1")
    finally:
        client.close()


def unique_match(collection: str, record: dict[str, Any]) -> dict[str, Any]:
    if collection == "users":
        return {"email": record["email"]}
    if collection in {"blogs", "categories", "playlists"}:
        return {"slug": record["slug"]}
    if collection == "faqs":
        return {"question": record["question"]}
    if collection == "testimonials":
        return {"name": record["name"]}
    return {"_id": record["_id"]}


def rewrite_references(
    collection: str, record: dict[str, Any], resolved_ids: dict[ObjectId, ObjectId]
) -> None:
    if collection == "blogs":
        record["author"] = resolved_ids.get(record["author"], record["author"])
        record["category"] = resolved_ids.get(record["category"], record["category"])
    elif collection == "playlists":
        record["owner"] = resolved_ids.get(record["owner"], record["owner"])
        record["blogs"] = [resolved_ids.get(blog_id, blog_id) for blog_id in record["blogs"]]
    elif collection == "testimonials":
        record["user"] = resolved_ids.get(record["user"], record["user"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Blogermenia MongoDB from Python.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete only records previously created by this Python seeder before upserting.",
    )
    args = parser.parse_args()
    try:
        asyncio.run(seed_database(reset=args.reset))
    except PyMongoError as exc:
        raise SystemExit(
            "Could not connect to MongoDB using backend/.env. "
            "Start it with `docker compose up -d` and run the seeder again.\n"
            f"MongoDB error: {exc}"
        ) from exc


if __name__ == "__main__":
    main()
