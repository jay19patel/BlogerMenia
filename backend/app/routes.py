from __future__ import annotations

import asyncio
import functools
import json
from pathlib import Path
import urllib.request
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import settings
from app.schemas import BlogState, ChangeSummary
from app.workflow import RunResult, run_blog_graph

_sessions:    Dict[str, List[Dict[str, str]]] = {}
_blog_states: Dict[str, BlogState]            = {}


router = APIRouter()
BASE_DIR = Path(__file__).resolve().parent.parent


def _check_gemini() -> Dict[str, Any]:
    return {
        "ok": bool(settings.google_api_key),
        "model": settings.gemini_model,
        "provider": "google-ai",
    }

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
    return {"status": "ok", "gemini": _check_gemini()}


@router.get("/chat/")
async def chat_help():
    return {
        "status": "ok",
        "message": "Use POST /chat/ with JSON body: {\"message\": \"hello\"}",
        "docs": "/docs",
        "gemini": _check_gemini(),
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
    _sessions.setdefault(session_id, [])
    _sessions[session_id].append({"role": "user", "content": request.message})

    prev_blog = _blog_states.get(session_id)

    try:
        loop = asyncio.get_event_loop()
        run: RunResult = await loop.run_in_executor(
            None,
            functools.partial(
                run_blog_graph,
                prompt=request.message,
                session_id=session_id,
                conversation=_sessions[session_id],
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

    _sessions[session_id].append({"role": "assistant", "content": assistant_text})

    return ChatResponse(
        session_id=session_id,
        mode=run.mode,
        conversation=_sessions[session_id],
        message=assistant_text,
        blog_state=run.blog,
        change_summary=run.change_summary,
    )


@router.get("/session/{session_id}/", response_model=ChatResponse)
async def get_session(session_id: str) -> ChatResponse:
    """Retrieve conversation + blog state for a session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    blog = _blog_states.get(session_id)
    return ChatResponse(session_id=session_id, mode="retrieve",
                        conversation=_sessions[session_id], message="Session retrieved.",
                        blog_state=blog, change_summary=None)


@router.delete("/session/{session_id}/")
async def delete_session(session_id: str):
    """Delete session conversation and blog state."""
    _sessions.pop(session_id, None)
    _blog_states.pop(session_id, None)
    return {"status": "deleted", "session_id": session_id}


@router.get("/sessions/")
async def list_sessions():
    """List all active sessions."""
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
    return {"status": "saved", "session_id": session_id}
