from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field

class BlogSectionText(BaseModel):
    type: Literal["text"] = "text"
    title: Optional[str] = None
    content: str

class BlogSectionBullets(BaseModel):
    type: Literal["bullets"] = "bullets"
    title: Optional[str] = None
    items: List[str]

class BlogSectionCode(BaseModel):
    type: Literal["code"] = "code"
    title: Optional[str] = None
    language: str = "python"
    content: str

class BlogSectionNote(BaseModel):
    type: Literal["note"] = "note"
    title: Optional[str] = None
    content: str

class BlogSectionTable(BaseModel):
    type: Literal["table"] = "table"
    title: Optional[str] = None
    headers: List[str]
    rows: List[List[str]]

class BlogSectionFlowchartStep(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    color: Optional[str] = None
    branches: List[str] = []

class BlogSectionFlowchart(BaseModel):
    type: Literal["flowchart"] = "flowchart"
    title: Optional[str] = None
    steps: List[BlogSectionFlowchartStep]

class BlogSectionLinks(BaseModel):
    type: Literal["links"] = "links"
    title: Optional[str] = None
    items: List[Dict[str, str]]

class BlogSectionYoutube(BaseModel):
    type: Literal["youtube"] = "youtube"
    title: Optional[str] = None
    url: str

BlogSection = Union[
    BlogSectionText, BlogSectionBullets, BlogSectionCode, BlogSectionNote,
    BlogSectionTable, BlogSectionFlowchart, BlogSectionLinks, BlogSectionYoutube,
]

class BlogContent(BaseModel):
    introduction: str
    sections: List[BlogSection]
    conclusion: str

class BlogState(BaseModel):
    title: str
    subtitle: Optional[str] = None
    excerpt: Optional[str] = None
    image: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    content: Dict[str, Any] = {}


# ═══════════════════════════════════════════════════════════════════════════════
#  3. CHANGE TRACKING SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class ChangeEntry(BaseModel):
    field: str
    change_type: Literal["added", "modified", "removed", "reordered"]
    before: Optional[Any] = None
    after: Optional[Any] = None
    description: str

class ChangeSummary(BaseModel):
    total_changes: int
    changes: List[ChangeEntry]
    summary: str


# ═══════════════════════════════════════════════════════════════════════════════
#  4. INTERNAL AI / WORKFLOW SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class SectionTarget(BaseModel):
    target: Literal["introduction", "conclusion", "section_by_index", "section_by_keyword", "all"]
    index: Optional[int] = None
    keyword: Optional[str] = None
    instruction: str

class RouterDecision(BaseModel):
    mode: Literal["generate", "edit_section", "edit_meta", "qna", "chat"]
    reason: str
    section_targets: Optional[List[SectionTarget]] = None
    meta_fields: Optional[List[str]] = None

class Task(BaseModel):
    id: int
    title: str
    goal: str = Field(..., description="One sentence: what reader learns.")
    bullets: List[str] = Field(..., min_length=3, max_length=6)
    tags: List[str] = Field(default_factory=list)

class Plan(BaseModel):
    title: str
    subtitle: str
    excerpt: str
    category: str
    tags: List[str]
    introduction: str
    conclusion: str
    tasks: List[Task] = Field(..., description="3-7 tasks")

class SectionOutput(BaseModel):
    sections: List[BlogSection]

class MetaEditOutput(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    excerpt: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    image: Optional[str] = None

class QnAOutput(BaseModel):
    answer: str
    relevant_sections: List[int] = Field(default_factory=list)

