"""
State management for blog generation conversation
"""
from typing import TypedDict, List, Optional, Dict, Any
from datetime import datetime


class Message(TypedDict):
    """Message structure"""
    role: str  # "user" or "assistant"
    content: str
    timestamp: str


class BlogState(TypedDict):
    """Blog generation state"""
    # Current blog being generated/edited
    slug: Optional[str]
    title: Optional[str]
    subtitle: Optional[str]
    excerpt: Optional[str]
    image: Optional[str]
    category: Optional[str]
    featured: bool
    tags: List[str]
    content: Optional[Dict[str, Any]]
    
    # Conversation state
    messages: List[Message]
    current_action: Optional[str]  # "generate", "update", "save", None
    pending_save: bool
    
    # Metadata
    user_id: Optional[str]
    username: Optional[str]
    session_id: str
    created_at: str
    updated_at: str


def create_empty_blog_state(session_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> BlogState:
    """Create an empty blog state"""
    now = datetime.now().isoformat()
    return BlogState(
        slug=None,
        title=None,
        subtitle=None,
        excerpt=None,
        image=None,
        category=None,
        featured=False,
        tags=[],
        content=None,
        messages=[],
        current_action=None,
        pending_save=False,
        user_id=user_id,
        username=username,
        session_id=session_id,
        created_at=now,
        updated_at=now
    )


def update_blog_state(state: BlogState, updates: Dict[str, Any]) -> BlogState:
    """Update blog state with new values"""
    state.update(updates)
    state["updated_at"] = datetime.now().isoformat()
    return state

