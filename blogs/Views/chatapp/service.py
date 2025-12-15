"""
Blog Generator Service using LangGraph and Mistral
"""
import json
import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio

from langchain_mistralai import ChatMistralAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from .state import BlogState, create_empty_blog_state, update_blog_state, Message
from .prompts import SYSTEM_PROMPT, BLOG_GENERATION_PROMPT, UPDATE_BLOG_PROMPT
from django.conf import settings
from .schemas import BlogCreate, BlogContent, BlogContentSection

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages user sessions and state.
    Currently uses in-memory storage, but designed to be swappable with Redis.
    """
    def __init__(self):
        self._sessions: Dict[str, BlogState] = {}

    async def get_session(self, session_id: str) -> Optional[BlogState]:
        """Retrieve a session by ID"""
        return self._sessions.get(session_id)

    async def create_session(self, session_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> BlogState:
        """Create a new session"""
        state = create_empty_blog_state(session_id, user_id, username)
        self._sessions[session_id] = state
        return state

    async def save_session(self, session_id: str, state: BlogState) -> None:
        """Save/Update a session"""
        self._sessions[session_id] = state

    async def clear_session_data(self, session_id: str) -> None:
        """Clear blog data from session but keep history"""
        if session_id in self._sessions:
            state = self._sessions[session_id]
            # Reset blog-specific fields
            state.update({
                "slug": None,
                "title": None,
                "subtitle": None,
                "excerpt": None,
                "image": None,
                "category": None,
                "featured": False,
                "tags": [],
                "content": None,
                "pending_save": False,
                "current_action": None
            })
            state["updated_at"] = datetime.now().isoformat()

    async def delete_session(self, session_id: str) -> None:
        """Delete a session completely"""
        if session_id in self._sessions:
            del self._sessions[session_id]


class BlogGeneratorService:
    """AI-powered blog generation and management service (Async)"""
    
    def __init__(self):
        """Initialize the blog generator service"""
        # Get JSON schema for prompts
        self.blog_schema = BlogCreate.model_json_schema()
        self.blog_schema_str = json.dumps(self.blog_schema, indent=2)
        
        # Session Manager
        self.session_manager = SessionManager()
        
        # Initialize LangGraph
        self.graph = self._create_graph()
        
        logger.info("✓ BlogGeneratorService initialized (Async)")

    def _get_llm(self):
        """Get a fresh instance of Mistral LLM"""
        return ChatMistralAI(
            model=getattr(settings, "DEFAULT_MODEL", "mistral-large-latest"),
            temperature=getattr(settings, "TEMPERATURE", 0.7),
            api_key=settings.MISTRAL_API_KEY
        )

    def _get_structured_llm(self):
        """Get a fresh instance of Structured LLM"""
        llm = self._get_llm()
        return llm.with_structured_output(
            BlogCreate,
            method="json_schema",
            include_raw=False
        )
    
    def _create_graph(self) -> StateGraph:
        """Create LangGraph workflow for blog generation"""
        workflow = StateGraph(BlogState)
        
        # Add nodes
        workflow.add_node("analyze_intent", self._analyze_intent)
        workflow.add_node("generate_blog", self._generate_blog)
        workflow.add_node("update_blog", self._update_blog)
        workflow.add_node("prepare_save", self._prepare_save)
        workflow.add_node("chat_response", self._chat_response)
        
        # Set entry point
        workflow.set_entry_point("analyze_intent")
        
        # Add conditional edges based on action
        workflow.add_conditional_edges(
            "analyze_intent",
            self._route_action,
            {
                "generate": "generate_blog",
                "update": "update_blog",
                "save": "prepare_save",
                "chat": "chat_response"
            }
        )
        
        # All nodes end after execution
        workflow.add_edge("generate_blog", END)
        workflow.add_edge("update_blog", END)
        workflow.add_edge("prepare_save", END)
        workflow.add_edge("chat_response", END)
        
        return workflow.compile()
    
    async def _analyze_intent(self, state: BlogState) -> BlogState:
        """Analyze user intent from the latest message"""
        if not state["messages"]:
            return state
        
        latest_message = state["messages"][-1]["content"].lower()
        
        # Detect save intent
        if any(keyword in latest_message for keyword in ["save", "submit", "publish"]):
            state["current_action"] = "save"
        # Detect update intent
        elif any(keyword in latest_message for keyword in ["update", "change", "modify", "edit"]):
            state["current_action"] = "update"
        # Detect generation intent
        elif any(keyword in latest_message for keyword in ["create", "generate", "write", "blog about", "blog for"]):
            state["current_action"] = "generate"
        else:
            state["current_action"] = "chat"
        
        logger.info(f"Intent detected: {state['current_action']}")
        return state
    
    def _route_action(self, state: BlogState) -> str:
        """Route to appropriate node based on current action"""
        # This is a synchronous function used by conditional_edges
        action = state.get("current_action", "chat")
        return action if action else "chat"
    
    async def _generate_blog(self, state: BlogState) -> BlogState:
        """Generate a new blog using LLM with structured output"""
        try:
            user_message = state["messages"][-1]["content"]
            
            # Extract topic from user message
            topic = self._extract_topic_from_message(user_message)
            
            # Check if user wants to use previous blog as reference
            previous_blog_context = ""
            if any(keyword in user_message.lower() for keyword in ["previous", "similar", "like before", "based on"]):
                previous_blog = self._get_previous_blog(state)
                if previous_blog:
                    previous_blog_context = f"\n\nReference from previous blog:\nTitle: {previous_blog.get('title')}\nCategory: {previous_blog.get('category')}\nStructure: {len(previous_blog.get('content', {}).get('sections', []))} sections"
            
            # Create prompt with schema
            prompt = BLOG_GENERATION_PROMPT.format(
                schema=self.blog_schema_str,
                text=topic
            )
            
            if previous_blog_context:
                prompt += previous_blog_context
            
            # Use structured output LLM asynchronously
            structured_llm = self._get_structured_llm()
            blog_create: BlogCreate = await structured_llm.ainvoke(prompt)
            
            # Convert BlogCreate to the format needed for state
            blog_data = self._convert_blog_create_to_dict(blog_create)
            
            # Update state with generated blog
            state.update({
                "slug": blog_data.get("slug"),
                "title": blog_data.get("title"),
                "subtitle": blog_data.get("subtitle"),
                "excerpt": blog_data.get("excerpt"),
                "image": blog_data.get("image", ""),
                "category": blog_data.get("category"),
                "featured": blog_data.get("featured", False),
                "tags": blog_data.get("tags", []),
                "content": blog_data.get("content"),
                "pending_save": True
            })
            
            # Add assistant message
            assistant_message: Message = {
                "role": "assistant",
                "content": f"I've generated a blog post titled '{blog_data.get('title')}'. You can review it, ask me to update any part, or save it to your collection.",
                "timestamp": datetime.now().isoformat()
            }
            state["messages"].append(assistant_message)
            
            logger.info(f"Blog generated: {blog_data.get('title')}")
            return state
            
        except Exception as e:
            logger.error(f"Error generating blog: {e}", exc_info=True)
            error_message: Message = {
                "role": "assistant",
                "content": f"Sorry, I encountered an error while generating the blog: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            state["messages"].append(error_message)
            return state
    
    async def _update_blog(self, state: BlogState) -> BlogState:
        """Update specific fields of the current blog"""
        try:
            user_message = state["messages"][-1]["content"]
            
            # Get current blog data
            current_blog = {
                "slug": state.get("slug"),
                "title": state.get("title"),
                "subtitle": state.get("subtitle"),
                "excerpt": state.get("excerpt"),
                "image": state.get("image"),
                "category": state.get("category"),
                "featured": state.get("featured"),
                "tags": state.get("tags"),
                "content": state.get("content")
            }
            
            # Create prompt for update
            messages = [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=UPDATE_BLOG_PROMPT.format(
                    current_blog=json.dumps(current_blog, indent=2),
                    user_message=user_message
                ))
            ]
            
            # Call LLM asynchronously
            response = await self.llm.ainvoke(messages)
            response_text = response.content
            
            # Parse updated blog data
            updated_blog = self._parse_blog_from_response(response_text, user_message)
            
            # Detect which fields were updated
            updated_fields = []
            for field in ["title", "subtitle", "excerpt", "category", "tags", "content"]:
                if updated_blog.get(field) != current_blog.get(field):
                    state[field] = updated_blog.get(field)
                    updated_fields.append(field)
            
            if "title" in updated_fields:
                state["slug"] = updated_blog.get("slug")
            
            # Add assistant message
            fields_str = ", ".join(updated_fields) if updated_fields else "blog"
            assistant_message: Message = {
                "role": "assistant",
                "content": f"I've updated the {fields_str}. Would you like to make any other changes or save this blog?",
                "timestamp": datetime.now().isoformat()
            }
            state["messages"].append(assistant_message)
            
            logger.info(f"Blog updated: {updated_fields}")
            return state
            
        except Exception as e:
            logger.error(f"Error updating blog: {e}")
            error_message: Message = {
                "role": "assistant",
                "content": f"Sorry, I encountered an error while updating the blog: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            state["messages"].append(error_message)
            return state
    
    def _convert_blog_create_to_dict(self, blog_create: BlogCreate) -> Dict[str, Any]:
        """Convert BlogCreate Pydantic model to dict format with content field"""
        # Convert BlogCreate to dict
        blog_dict = blog_create.model_dump(exclude_none=False)
        
        # Get introduction, sections, conclusion from top level
        introduction = blog_dict.get("introduction") or ""
        sections = blog_dict.get("sections") or []
        conclusion = blog_dict.get("conclusion") or ""
        
        # Create content structure
        content = BlogContent(
            introduction=introduction,
            sections=sections,
            conclusion=conclusion
        )
        
        # Convert content to dict
        blog_dict["content"] = content.model_dump()
        
        # Remove introduction, sections, conclusion from top level
        for key in ["introduction", "sections", "conclusion"]:
            blog_dict.pop(key, None)
        
        return blog_dict
    
    def _extract_topic_from_message(self, message: str) -> str:
        """Extract topic from user message"""
        topic = message.lower()
        for phrase in ["create blog about", "generate blog for", "write about", "blog on", "create a blog about", "generate a blog for"]:
            topic = topic.replace(phrase, "")
        return topic.strip()
    
    async def _prepare_save(self, state: BlogState) -> BlogState:
        """Prepare blog for saving to database"""
        try:
            # Check if there's a blog to save
            if not state.get("title"):
                error_message: Message = {
                    "role": "assistant",
                    "content": "There's no blog to save yet. Please generate a blog first.",
                    "timestamp": datetime.now().isoformat()
                }
                state["messages"].append(error_message)
                return state
            
            # Mark as ready to save
            state["pending_save"] = True
            state["current_action"] = "save"
            
            # Add confirmation message
            assistant_message: Message = {
                "role": "assistant",
                "content": f"Great! I'm ready to save your blog '{state.get('title')}' to the database. The blog will be saved with all its content and will be available in your collection.",
                "timestamp": datetime.now().isoformat()
            }
            state["messages"].append(assistant_message)
            
            logger.info(f"Blog prepared for saving: {state.get('title')}")
            return state
            
        except Exception as e:
            logger.error(f"Error preparing save: {e}")
            error_message: Message = {
                "role": "assistant",
                "content": f"Sorry, I encountered an error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            state["messages"].append(error_message)
            return state
    
    async def _chat_response(self, state: BlogState) -> BlogState:
        """Handle general chat/questions"""
        try:
            user_message = state["messages"][-1]["content"]
            
            # Create context from current blog if exists
            blog_context = ""
            if state.get("title"):
                blog_context = f"\n\nCurrent blog in progress:\nTitle: {state.get('title')}\nCategory: {state.get('category')}"
            
            chat_system_prompt = """You are a helpful blog content assistant. Help users create, update, and manage blog posts.
            
            You can help with:
            - Creating new blogs (e.g., "Generate a blog about the future of AI in healthcare")
            - Updating existing blogs (share the title or topic you'd like to modify)
            - Brainstorming ideas for blog posts
            - Saving drafts or finalizing blogs for publishing
            
            Be conversational, friendly, and helpful. Respond in plain text, not JSON format."""
            
            messages = [
                SystemMessage(content=chat_system_prompt + blog_context),
                HumanMessage(content=user_message)
            ]
            
            # Call LLM asynchronously
            response = await self.llm.ainvoke(messages)
            
            # Extract plain text from response
            response_text = self._extract_plain_text(response.content)
            
            # Add assistant message
            assistant_message: Message = {
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.now().isoformat()
            }
            state["messages"].append(assistant_message)
            
            return state
            
        except Exception as e:
            logger.error(f"Error in chat response: {e}")
            error_message: Message = {
                "role": "assistant",
                "content": "I'm here to help you create and manage blog posts. You can ask me to generate a blog, update specific parts, or save your work.",
                "timestamp": datetime.now().isoformat()
            }
            state["messages"].append(error_message)
            return state
    
    def _parse_blog_from_response(self, response_text: str, user_message: str) -> Dict[str, Any]:
        """Parse blog data from LLM response"""
        try:
            # Remove markdown code blocks if present
            response_text = re.sub(r'```json\s*', '', response_text)
            response_text = re.sub(r'```\s*', '', response_text)
            
            # Try to extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                blog_data = json.loads(json_match.group())
                # Ensure slug exists
                if not blog_data.get("slug") and blog_data.get("title"):
                    blog_data["slug"] = self._generate_slug(blog_data["title"])
                # Validate content structure
                if blog_data.get("content"):
                    content = blog_data["content"]
                    if not isinstance(content, dict):
                        content = {"introduction": str(content), "sections": [], "conclusion": ""}
                    if "sections" not in content:
                        content["sections"] = []
                    if "introduction" not in content:
                        content["introduction"] = ""
                    if "conclusion" not in content:
                        content["conclusion"] = ""
                    blog_data["content"] = content
                return blog_data
        except Exception as e:
            logger.warning(f"Failed to parse JSON from response: {e}")
        
        # Fallback: Return minimal structure if parsing fails
        # This is much simpler than the previous hardcoded fallback
        title = self._extract_title_from_message(user_message)
        return {
            "title": title,
            "slug": self._generate_slug(title),
            "content": {"introduction": "Could not parse content. Please try again.", "sections": [], "conclusion": ""}
        }
    
    def _extract_plain_text(self, text: str) -> str:
        """Extract plain text from response, removing JSON code blocks"""
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)
        
        # Try to extract message from JSON if present
        json_match = re.search(r'\{[\s\S]*?\}', text)
        if json_match:
            try:
                json_data = json.loads(json_match.group())
                if isinstance(json_data, dict) and "message" in json_data:
                    return json_data["message"]
            except:
                pass
        
        return text.strip()
    
    def _generate_slug(self, title: str) -> str:
        """Generate URL-friendly slug from title"""
        slug = title.lower()
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'\s+', '-', slug)
        return slug
    
    def _extract_title_from_message(self, message: str) -> str:
        """Extract title from user message"""
        title = message.lower()
        for phrase in ["create blog about", "generate blog for", "write about", "blog on"]:
            title = title.replace(phrase, "")
        return title.strip().title()
    
    def _get_previous_blog(self, state: BlogState) -> Optional[Dict[str, Any]]:
        """Get previous blog from conversation history"""
        for msg in reversed(state["messages"]):
            if msg["role"] == "assistant" and state.get("title"):
                return {
                    "title": state.get("title"),
                    "category": state.get("category"),
                    "content": state.get("content")
                }
        return None
    
    async def process_message(
        self,
        message: str,
        session_id: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process user message and generate response (Async)
        """
        try:
            # Get or create session state
            state = await self.session_manager.get_session(session_id)
            if not state:
                state = await self.session_manager.create_session(session_id, user_id, username)
            
            # Add user message to state
            user_msg: Message = {
                "role": "user",
                "content": message,
                "timestamp": datetime.now().isoformat()
            }
            state["messages"].append(user_msg)
            
            # Process through graph asynchronously
            # Note: invoke() is sync, ainvoke() is async
            result = await self.graph.ainvoke(state)
            
            # Update session state
            await self.session_manager.save_session(session_id, result)
            
            # Prepare response
            latest_assistant_message = next(
                (msg["content"] for msg in reversed(result["messages"]) if msg["role"] == "assistant"),
                "How can I help you with your blog?"
            )
            
            latest_assistant_message = self._extract_plain_text(latest_assistant_message)
            
            response = {
                "message": latest_assistant_message,
                "action": result.get("current_action"),
                "blog_state": {
                    "slug": result.get("slug"),
                    "title": result.get("title"),
                    "subtitle": result.get("subtitle"),
                    "excerpt": result.get("excerpt"),
                    "image": result.get("image"),
                    "category": result.get("category"),
                    "featured": result.get("featured"),
                    "tags": result.get("tags"),
                    "content": result.get("content")
                },
                "pending_save": result.get("pending_save", False),
                "messages": result["messages"]
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
            return {
                "message": f"Sorry, I encountered an error: {str(e)}",
                "action": "error",
                "blog_state": {},
                "pending_save": False,
                "messages": []
            }
    
    async def clear_blog_state(self, session_id: str) -> None:
        """Clear blog state but keep conversation history"""
        await self.session_manager.clear_session_data(session_id)
        logger.info(f"Blog state cleared for session: {session_id}")
    
    async def get_session_state(self, session_id: str) -> Optional[BlogState]:
        """Get current session state"""
        return await self.session_manager.get_session(session_id)
    
    async def delete_session(self, session_id: str) -> None:
        """Delete session completely"""
        await self.session_manager.delete_session(session_id)
        logger.info(f"Session deleted: {session_id}")
