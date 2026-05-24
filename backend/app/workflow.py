from __future__ import annotations

import copy
import json
import logging
import operator
import re
import urllib.parse
import uuid
from typing import Annotated, Any, Dict, List, Optional, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_ollama import ChatOllama
from langgraph.graph import END, START, StateGraph
from langgraph.types import Send
from pydantic import BaseModel

from app.config import settings
from app.schemas import (
    BlogContent,
    BlogSection,
    BlogState,
    ChangeEntry,
    ChangeSummary,
    MetaEditOutput,
    Plan,
    QnAOutput,
    RouterDecision,
    SectionOutput,
    Task,
)

logger = logging.getLogger(__name__)

class WorkflowState(TypedDict):
    prompt: str
    session_id: str
    conversation: List[Dict[str, str]]
    current_blog: Optional[Dict[str, Any]]
    mode: Optional[str]
    section_targets: Optional[List[Dict]]
    meta_fields: Optional[List[str]]
    plan: Optional[Plan]
    task_sections: Annotated[list, operator.add]
    final_blog: Optional[Dict[str, Any]]
    chat_response: Optional[str]
    change_summary: Optional[Dict[str, Any]]


def get_llm() -> BaseChatModel:
    """Return the local Ollama chat model."""
    logger.info(
        "Using local Ollama LLM provider (model: %s) at %s",
        settings.ollama_model,
        settings.ollama_base_url,
    )
    return ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=0.7,
    )


def _conv_context(conversation: List[Dict[str, str]], max_turns: int = 6) -> str:
    recent = conversation[-(max_turns * 2):]
    return "\n".join(f"{m['role'].upper()}: {m['content']}" for m in recent) or "(none)"

def _blog_summary(blog: Dict[str, Any]) -> str:
    content = blog.get("content", {})
    sections = content.get("sections", [])
    sec_lines = "\n".join(
        f"  [{i}] ({s.get('type','?')}) {s.get('title') or '(untitled)'}"
        for i, s in enumerate(sections)
    ) or "  (none)"
    return (
        f"Title:    {blog.get('title','')}\n"
        f"Subtitle: {blog.get('subtitle','')}\n"
        f"Category: {blog.get('category','')}  Tags: {', '.join(blog.get('tags',[]))}\n"
        f"Sections ({len(sections)}):\n{sec_lines}"
    )

def _snip(text: str, n: int = 120) -> str:
    return (text[:n] + "...") if len(text) > n else text

def _change_paragraph(changes: List[ChangeEntry]) -> str:
    if not changes:
        return "No changes were made."
    return "Changes applied: " + "; ".join(c.description for c in changes) + "."


# ── 7-A ROUTER ───────────────────────────────────────────────────────────────

ROUTER_SYSTEM = """\
You are the master router for an AI Blog Generator.

Classify the user's latest message into ONE mode:
  generate       – completely new blog on a new topic
  edit_section   – modify/rewrite/add/remove specific section(s):
                   introduction, conclusion, or body sections by index/keyword
  edit_meta      – change metadata only: title, subtitle, excerpt, tags, category, image
  qna            – question about the current blog's content
  chat            – off-topic / casual

For edit_section → populate section_targets[] precisely.
For edit_meta    → populate meta_fields[] with only the fields to update.

Examples:
  "change the title to X"              → edit_meta, meta_fields=["title"]
  "make the intro more casual"         → edit_section, target=introduction
  "rewrite section 2"                  → edit_section, target=section_by_index, index=2
  "update the React hooks section"     → edit_section, target=section_by_keyword, keyword="React hooks"
  "add a new section about testing"    → edit_section, target=section_by_keyword (not found → new)
  "what does the blog say about X?"   → qna
  "hello"                              → chat
"""

def _heuristic_router(state: WorkflowState) -> Optional[dict]:
    prompt = state["prompt"].strip()
    text = prompt.lower()
    has_blog = bool(state.get("current_blog"))

    if text in {"hi", "hello", "hey", "hii", "hy", "kem cho", "namaste"}:
        return {"mode": "chat", "section_targets": [], "meta_fields": []}

    if any(word in text for word in ["write", "generate", "create", "make"]) and any(
        word in text for word in ["blog", "article", "post"]
    ):
        return {"mode": "generate", "section_targets": [], "meta_fields": []}

    meta_fields = [
        field
        for field in ["title", "subtitle", "excerpt", "tags", "category", "image"]
        if field in text
    ]
    if any(word in text for word in ["change", "update", "edit", "set", "rename"]) and meta_fields:
        return {"mode": "edit_meta", "section_targets": [], "meta_fields": meta_fields}

    if any(word in text for word in ["intro", "introduction"]):
        return {
            "mode": "edit_section",
            "section_targets": [{"target": "introduction", "instruction": prompt}],
            "meta_fields": [],
        }

    if "conclusion" in text:
        return {
            "mode": "edit_section",
            "section_targets": [{"target": "conclusion", "instruction": prompt}],
            "meta_fields": [],
        }

    section_match = re.search(r"section\s+(\d+)", text)
    if section_match and any(word in text for word in ["change", "update", "edit", "rewrite"]):
        return {
            "mode": "edit_section",
            "section_targets": [
                {
                    "target": "section_by_index",
                    "index": int(section_match.group(1)),
                    "instruction": prompt,
                }
            ],
            "meta_fields": [],
        }

    if has_blog and text.endswith("?"):
        return {"mode": "qna", "section_targets": [], "meta_fields": []}

    return None


def router_node(state: WorkflowState) -> dict:
    heuristic = _heuristic_router(state)
    if heuristic:
        return heuristic

    blog_ctx = (
        f"\n\nCurrent blog:\n{_blog_summary(state['current_blog'])}"
        if state.get("current_blog") else "\n\n(No blog in session yet)"
    )
    decider = get_llm().with_structured_output(RouterDecision)
    decision: RouterDecision = decider.invoke([
        SystemMessage(content=ROUTER_SYSTEM + blog_ctx),
        HumanMessage(content=(
            f"Conversation:\n{_conv_context(state.get('conversation', []))}\n\n"
            f"Latest message: {state['prompt']}"
        )),
    ])
    return {
        "mode": decision.mode,
        "section_targets": [t.model_dump() for t in (decision.section_targets or [])],
        "meta_fields": decision.meta_fields or [],
    }

def route_next(state: WorkflowState) -> str:
    return {
        "generate":     "orchestrator",
        "edit_section": "section_editor",
        "edit_meta":    "meta_editor",
        "qna":          "qna_node",
        "chat":         "chatter",
    }.get(state.get("mode") or "generate", "orchestrator")


# ── 7-B CHATTER ──────────────────────────────────────────────────────────────

def chatter_node(state: WorkflowState) -> dict:
    result = get_llm().invoke([
        SystemMessage(content="You are a friendly AI Blog Generator assistant. Respond warmly and briefly. Gently steer toward blog writing if appropriate."),
        HumanMessage(content=state["prompt"]),
    ])
    return {"chat_response": result.content, "change_summary": None}


# ── 7-C QnA ──────────────────────────────────────────────────────────────────

def qna_node(state: WorkflowState) -> dict:
    blog = state.get("current_blog")
    if not blog:
        return {"chat_response": "No blog exists yet. Please generate one first!", "change_summary": None}

    qna_llm = get_llm().with_structured_output(QnAOutput)
    result: QnAOutput = qna_llm.invoke([
        SystemMessage(content="You are an expert assistant answering questions about a blog. Cite section indices when relevant. Be concise."),
        HumanMessage(content=(
            f"Blog JSON:\n{json.dumps(blog, indent=2)}\n\n"
            f"Conversation:\n{_conv_context(state.get('conversation', []))}\n\n"
            f"Question: {state['prompt']}"
        )),
    ])

    sections = blog.get("content", {}).get("sections", [])
    cited = [
        f"section[{i}] '{sections[i].get('title') or sections[i].get('type')}'"
        for i in result.relevant_sections if 0 <= i < len(sections)
    ]
    answer = result.answer + (f"\n\n*(Based on: {', '.join(cited)})*" if cited else "")

    return {"chat_response": answer, "change_summary": None, "final_blog": blog}


# ── 7-D META EDITOR ──────────────────────────────────────────────────────────

def meta_editor_node(state: WorkflowState) -> dict:
    blog = state["current_blog"]
    meta_fields = state.get("meta_fields") or []

    editor_llm = get_llm().with_structured_output(MetaEditOutput)
    result: MetaEditOutput = editor_llm.invoke([
        SystemMessage(content="You are a precise metadata editor. Output ONLY new values for requested fields. Leave all others null."),
        HumanMessage(content=(
            f"Current metadata:\n{json.dumps({k: blog.get(k) for k in ['title','subtitle','excerpt','category','tags','image']}, indent=2)}\n\n"
            f"Fields to change: {', '.join(meta_fields)}\n\n"
            f"Instruction: {state['prompt']}"
        )),
    ])

    updated = blog.copy()
    changes: List[ChangeEntry] = []

    field_map = [
        ("title",    result.title),
        ("subtitle", result.subtitle),
        ("excerpt",  result.excerpt),
        ("category", result.category),
        ("tags",     result.tags),
        ("image",    result.image),
    ]
    for field, new_val in field_map:
        if new_val is not None and field in meta_fields:
            old_val = blog.get(field)
            updated[field] = new_val
            changes.append(ChangeEntry(
                field=field, change_type="modified",
                before=old_val, after=new_val,
                description=f"'{field}' changed from {repr(old_val)} → {repr(new_val)}"
            ))

    summary = ChangeSummary(
        total_changes=len(changes),
        changes=changes,
        summary=_change_paragraph(changes),
    )
    return {"final_blog": updated, "change_summary": summary.model_dump(), "chat_response": None}


# ── 7-E SECTION EDITOR ───────────────────────────────────────────────────────

SECTION_EDITOR_SYSTEM = """\
You are a surgical blog section editor.
Receive ONE section's current JSON + an instruction.
Return replacement section(s) as a list (you may expand 1 section into many if needed).

Allowed types:
  text      { "type":"text",      "title":"...", "content":"..." }
  bullets   { "type":"bullets",   "title":"...", "items":["..."] }
  code      { "type":"code",      "title":"...", "language":"...", "content":"..." }
  note      { "type":"note",      "title":"...", "content":"..." }
  table     { "type":"table",     "title":"...", "headers":["..."], "rows":[["..."]] }
  flowchart { "type":"flowchart", "title":"...", "steps":[{"id":"","title":"","description":"","color":"","branches":[]}] }
  links     { "type":"links",     "title":"...", "items":[{"label":"","url":""}] }

Rules: always include "type"; never use "image"; never empty content.
"""

class _IntroOut(BaseModel):
    introduction: str

class _ConcOut(BaseModel):
    conclusion: str

def _resolve_idx(blog: Dict, target: Dict) -> Optional[int]:
    sections = blog.get("content", {}).get("sections", [])
    t = target.get("target")
    if t == "section_by_index":
        idx = target.get("index")
        return idx if idx is not None and 0 <= idx < len(sections) else None
    if t == "section_by_keyword":
        kw = (target.get("keyword") or "").lower()
        for i, s in enumerate(sections):
            if kw in (s.get("title") or "").lower():
                return i
        return None
    return None

def section_editor_node(state: WorkflowState) -> dict:
    blog = state["current_blog"]
    targets = state.get("section_targets") or []

    updated = copy.deepcopy(blog)
    content = updated.setdefault("content", {})
    changes: List[ChangeEntry] = []
    editor_llm = get_llm().with_structured_output(SectionOutput)

    for target in targets:
        t_type = target.get("target")
        instruction = target.get("instruction") or state["prompt"]

        if t_type == "introduction":
            old = content.get("introduction", "")
            llm = get_llm().with_structured_output(_IntroOut)
            res = llm.invoke([
                SystemMessage(content="Rewrite only the blog introduction paragraph as instructed. Return JSON {introduction: str}."),
                HumanMessage(content=f"Current:\n{old}\n\nInstruction: {instruction}"),
            ])
            content["introduction"] = res.introduction
            changes.append(ChangeEntry(field="content.introduction", change_type="modified",
                before=_snip(old), after=_snip(res.introduction),
                description="Introduction rewritten"))

        elif t_type == "conclusion":
            old = content.get("conclusion", "")
            llm = get_llm().with_structured_output(_ConcOut)
            res = llm.invoke([
                SystemMessage(content="Rewrite only the blog conclusion paragraph as instructed. Return JSON {conclusion: str}."),
                HumanMessage(content=f"Current:\n{old}\n\nInstruction: {instruction}"),
            ])
            content["conclusion"] = res.conclusion
            changes.append(ChangeEntry(field="content.conclusion", change_type="modified",
                before=_snip(old), after=_snip(res.conclusion),
                description="Conclusion rewritten"))

        elif t_type == "all":
            secs = content.get("sections", [])
            for i, sec in enumerate(list(secs)):
                out = editor_llm.invoke([
                    SystemMessage(content=SECTION_EDITOR_SYSTEM),
                    HumanMessage(content=f"Section [{i}]:\n{json.dumps(sec, indent=2)}\n\nApply globally: {instruction}"),
                ])
                content["sections"][i:i+1] = [s.model_dump() for s in out.sections]
            changes.append(ChangeEntry(field="content.sections[*]", change_type="modified",
                description=f"All {len(secs)} sections updated: {instruction}"))

        else:
            idx = _resolve_idx(blog, target)
            if idx is None:
                # Section not found → append new
                out = editor_llm.invoke([
                    SystemMessage(content=SECTION_EDITOR_SYSTEM),
                    HumanMessage(content=f"Blog title: {blog.get('title')}\nCreate a new section: {instruction}"),
                ])
                new_secs = [s.model_dump() for s in out.sections]
                content.setdefault("sections", []).extend(new_secs)
                changes.append(ChangeEntry(field="content.sections[new]", change_type="added",
                    after=[s.get("title") for s in new_secs],
                    description=f"New section(s) appended: {instruction}"))
            else:
                old_sec = content["sections"][idx]
                out = editor_llm.invoke([
                    SystemMessage(content=SECTION_EDITOR_SYSTEM),
                    HumanMessage(content=f"Section [{idx}]:\n{json.dumps(old_sec, indent=2)}\n\nInstruction: {instruction}"),
                ])
                new_secs = [s.model_dump() for s in out.sections]
                content["sections"][idx:idx+1] = new_secs
                changes.append(ChangeEntry(
                    field=f"content.sections[{idx}]", change_type="modified",
                    before={"title": old_sec.get("title"), "type": old_sec.get("type")},
                    after=[{"title": s.get("title"), "type": s.get("type")} for s in new_secs],
                    description=(
                        f"Section [{idx}] '{old_sec.get('title') or old_sec.get('type')}'"
                        f" → {len(new_secs)} section(s): {instruction[:60]}"
                    )
                ))

    summary = ChangeSummary(
        total_changes=len(changes),
        changes=changes,
        summary=_change_paragraph(changes),
    )
    return {"final_blog": updated, "change_summary": summary.model_dump(), "chat_response": None}


# ── 7-F ORCHESTRATOR (new blog) ──────────────────────────────────────────────

def orchestrator_node(state: WorkflowState) -> dict:
    planner = get_llm().with_structured_output(Plan)
    plan: Plan = planner.invoke([
        SystemMessage(content="You are a senior developer advocate planning a concise technical blog. Output title, subtitle, excerpt, category, tags, introduction, conclusion, and exactly 2 short tasks."),
        HumanMessage(content=(
            f"Conversation:\n{_conv_context(state.get('conversation', []))}\n\n"
            f"Prompt: {state['prompt']}"
        )),
    ])
    return {"plan": plan}

def fanout(state: WorkflowState):
    plan = state.get("plan")
    if not plan:
        return []
    return [
        Send("worker", {"task": t.model_dump(), "plan_context": {"title": plan.title, "category": plan.category}})
        for t in plan.tasks
    ]

WORKER_SYSTEM = """\
You are a technical writer generating ONE blog task block.
Return exactly ONE concise, fully-filled BlogSection JSON object inside the sections list.
Prefer type "text" unless a table is clearly useful. Never use 'image'. Always include "type".

Schemas:
  text      { "type":"text",      "title":"...", "content":"..." }
  bullets   { "type":"bullets",   "title":"...", "items":["..."] }
  code      { "type":"code",      "title":"...", "language":"...", "content":"..." }
  note      { "type":"note",      "title":"...", "content":"..." }
  table     { "type":"table",     "title":"...", "headers":["..."], "rows":[["..."]] }
  flowchart { "type":"flowchart", "title":"...", "steps":[{"id":"","title":"","description":"","color":"","branches":[]}] }
"""

def worker_node(payload: dict) -> dict:
    task = Task(**payload["task"])
    worker_llm = get_llm().with_structured_output(SectionOutput)
    out: SectionOutput = worker_llm.invoke([
        SystemMessage(content=WORKER_SYSTEM),
        HumanMessage(content=(
            f"Blog: {payload['plan_context']['title']}\n"
            f"Task: {task.title}\nGoal: {task.goal}\n"
            f"Points:\n- " + "\n- ".join(task.bullets)
        )),
    ])
    return {"task_sections": [(task.id, out.sections)]}

def reducer_node(state: WorkflowState) -> dict:
    plan = state["plan"]
    flat: List[BlogSection] = []
    for _, secs in sorted(state.get("task_sections", []), key=lambda x: x[0]):
        flat.extend(secs)

    seed = urllib.parse.quote(plan.title.replace(" ", "")[:15] or str(uuid.uuid4())[:8])
    cover = f"https://picsum.photos/seed/{seed}/1280/720"

    blog_dict = BlogState(
        title=plan.title, subtitle=plan.subtitle, excerpt=plan.excerpt,
        category=plan.category, tags=plan.tags, image=cover,
        content=BlogContent(introduction=plan.introduction, sections=flat, conclusion=plan.conclusion).model_dump(),
    ).model_dump()

    changes = [ChangeEntry(field="blog", change_type="added",
        description=f"New blog '{plan.title}' generated with {len(flat)} sections.")]
    summary = ChangeSummary(total_changes=1, changes=changes, summary=changes[0].description)

    return {"final_blog": blog_dict, "change_summary": summary.model_dump(), "chat_response": None}


_g = StateGraph(WorkflowState)
_g.add_node("router",         router_node)
_g.add_node("chatter",        chatter_node)
_g.add_node("qna_node",       qna_node)
_g.add_node("meta_editor",    meta_editor_node)
_g.add_node("section_editor", section_editor_node)
_g.add_node("orchestrator",   orchestrator_node)
_g.add_node("worker",         worker_node)
_g.add_node("reducer",        reducer_node)

_g.add_edge(START, "router")
_g.add_conditional_edges("router", route_next, {
    "orchestrator": "orchestrator", "section_editor": "section_editor",
    "meta_editor": "meta_editor",   "qna_node": "qna_node",
    "chatter": "chatter",
})
_g.add_edge("chatter",        END)
_g.add_edge("qna_node",       END)
_g.add_edge("meta_editor",    END)
_g.add_edge("section_editor", END)
_g.add_conditional_edges("orchestrator", fanout, ["worker"])
_g.add_edge("worker",  "reducer")
_g.add_edge("reducer", END)

ai_blog_graph = _g.compile()


class RunResult:
    def __init__(self, blog, chat_response, change_summary, mode):
        self.blog           = blog
        self.chat_response  = chat_response
        self.change_summary = change_summary
        self.mode           = mode

def run_blog_graph(
    prompt: str, session_id: str,
    conversation: List[Dict[str, str]],
    current_blog: Optional[Dict[str, Any]] = None,
) -> RunResult:
    result = ai_blog_graph.invoke({
        "prompt": prompt, "session_id": session_id,
        "conversation": conversation, "current_blog": current_blog,
        "plan": None, "task_sections": [], "mode": None,
        "section_targets": [], "meta_fields": [],
        "final_blog": None, "chat_response": None, "change_summary": None,
    })

    mode     = result.get("mode") or "unknown"
    raw_blog = result.get("final_blog") or current_blog
    blog     = BlogState(**raw_blog) if raw_blog else None

    raw_sum  = result.get("change_summary")
    summary  = ChangeSummary(**raw_sum) if raw_sum else None

    return RunResult(blog=blog, chat_response=result.get("chat_response"),
                     change_summary=summary, mode=mode)
