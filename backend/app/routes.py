from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import functools
from pathlib import Path
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import settings
from app.database.mongo import get_client
from app.schemas import BlogState, ChangeSummary
from app.workflow import RunResult, run_blog_graph

_sessions:    Dict[str, List[Dict[str, str]]] = {}
_blog_states: Dict[str, BlogState]            = {}


router = APIRouter()
BASE_DIR = Path(__file__).resolve().parent.parent


def _check_ollama() -> Dict[str, Any]:
    return {
        "ok": True,
        "model": settings.ollama_model,
        "base_url": settings.ollama_base_url,
        "provider": "ollama",
    }


def _chat_collection():
    return get_client()[settings.mongodb_db]["chat_sessions"]


async def _load_session(session_id: str) -> tuple[List[Dict[str, str]], Optional[BlogState]]:
    doc = await _chat_collection().find_one({"session_id": session_id}, {"_id": 0})
    if not doc:
        return _sessions.get(session_id, []), _blog_states.get(session_id)

    conversation = doc.get("conversation", [])
    blog_data = doc.get("blog_state")
    blog = BlogState.model_validate(blog_data) if blog_data else None
    _sessions[session_id] = conversation
    if blog:
        _blog_states[session_id] = blog
    else:
        _blog_states.pop(session_id, None)
    return conversation, blog


async def _save_session(session_id: str, conversation: List[Dict[str, str]], blog: Optional[BlogState]) -> None:
    now = datetime.now(timezone.utc)
    doc = {
        "session_id": session_id,
        "conversation": jsonable_encoder(conversation),
        "blog_state": jsonable_encoder(blog) if blog else None,
        "updated_at": now,
    }
    await _chat_collection().update_one(
        {"session_id": session_id},
        {"$set": doc, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )

# ── API models ────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    session_id:     str
    mode:           str
    conversation:   List[Dict[str, str]]
    message:        str
    blog_state:     Optional[BlogState]     = None
    change_summary: Optional[ChangeSummary] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/")
async def index():
    return FileResponse(BASE_DIR / "index.html")

@router.get("/health/")
async def health():
    return {"status": "ok", "llm": _check_ollama(), "storage": "mongodb"}


@router.get("/chat/")
async def chat_help():
    return {
        "status": "ok",
        "message": "Use POST /chat/ with JSON body: {\"message\": \"hello\"}",
        "docs": "/docs",
        "llm": _check_ollama(),
        "storage": "mongodb",
    }

@router.post("/chat/", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Universal chat endpoint. Examples:
      "write a blog about async Python"            → generate
      "change the title to 'Async Mastery'"        → edit_meta
      "make the intro more casual"                 → edit_section (introduction)
      "rewrite section 2 with a comparison table"  → edit_section (by index)
      "update the React hooks section"             → edit_section (by keyword)
      "add a new section about testing"            → edit_section (append new)
      "what does section 3 say about GIL?"        → qna
      "hello"                                      → chat
    """
    session_id = request.session_id or str(uuid.uuid4())
    conversation, prev_blog = await _load_session(session_id)
    conversation.append({"role": "user", "content": request.message})
    _sessions[session_id] = conversation


    try:
        loop = asyncio.get_event_loop()
        run: RunResult = await loop.run_in_executor(
            None,
            functools.partial(
                run_blog_graph,
                prompt=request.message,
                session_id=session_id,
                conversation=conversation,
                current_blog=prev_blog.model_dump() if prev_blog else None,
            ),
        )
        if run.blog:
            _blog_states[session_id] = run.blog

        if run.chat_response:
            assistant_text = run.chat_response
        elif run.change_summary:
            assistant_text = run.change_summary.summary
        else:
            b = run.blog
            assistant_text = f"Done! Blog '{b.title}' is ready." if b else "Done."

    except Exception as exc:
        run = RunResult(blog=prev_blog, chat_response=None, change_summary=None, mode="error")
        assistant_text = f"An error occurred: {exc}"

    conversation.append({"role": "assistant", "content": assistant_text})
    await _save_session(session_id, conversation, run.blog)

    return ChatResponse(
        session_id=session_id,
        mode=run.mode,
        conversation=conversation,
        message=assistant_text,
        blog_state=run.blog,
        change_summary=run.change_summary,
    )


@router.get("/session/{session_id}/", response_model=ChatResponse)
async def get_session(session_id: str) -> ChatResponse:
    """Retrieve conversation + blog state for a session."""
    conversation, blog = await _load_session(session_id)
    if not conversation and not blog:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatResponse(session_id=session_id, mode="retrieve",
                        conversation=conversation, message="Session retrieved.",
                        blog_state=blog, change_summary=None)


@router.delete("/session/{session_id}/")
async def delete_session(session_id: str):
    """Delete session conversation and blog state."""
    _sessions.pop(session_id, None)
    _blog_states.pop(session_id, None)
    await _chat_collection().delete_one({"session_id": session_id})
    return {"status": "deleted", "session_id": session_id}


@router.get("/sessions/")
async def list_sessions():
    """List all active sessions."""
    docs = await _chat_collection().find(
        {},
        {"_id": 0, "session_id": 1, "conversation": 1, "blog_state": 1, "updated_at": 1},
    ).sort("updated_at", -1).to_list(length=200)
    if docs:
        return {
            "sessions": [
                {
                    "session_id": doc["session_id"],
                    "turns": len(doc.get("conversation", [])),
                    "has_blog": bool(doc.get("blog_state")),
                    "blog_title": (doc.get("blog_state") or {}).get("title"),
                    "preview": (doc.get("conversation") or [{}])[-1].get("content", ""),
                    "updated_at": doc.get("updated_at"),
                }
                for doc in docs
            ]
        }
    return {
        "sessions": [
            {"session_id": sid, "turns": len(_sessions.get(sid, [])),
             "has_blog": sid in _blog_states,
             "blog_title": _blog_states[sid].title if sid in _blog_states else None}
            for sid in _sessions
        ]
    }


@router.post("/session/{session_id}/blog/")
async def upsert_blog(session_id: str, blog: BlogState):
    """Manually push/sync a blog state into a session (frontend → backend sync)."""
    _sessions.setdefault(session_id, [])
    _blog_states[session_id] = blog
    await _save_session(session_id, _sessions[session_id], blog)
    return {"status": "saved", "session_id": session_id}
