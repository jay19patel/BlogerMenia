from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class BlogContentSection(BaseModel):
    id: Optional[Union[int, str]] = None
    type: str = Field(description="Type of section: text, bullets, note, code, etc.")
    title: Optional[str] = None
    content: Optional[str] = None
    items: Optional[List[str]] = None
    language: Optional[str] = None

class BlogContent(BaseModel):
    introduction: str
    sections: List[Dict[str, Any]] # Using Dict to be flexible, or Union[BlogContentSection]
    conclusion: str

class BlogCreate(BaseModel):
    title: str = Field(description="The title of the blog post")
    subtitle: Optional[str] = Field(None, description="A subtitle or tagline")
    slug: Optional[str] = Field(None, description="SEO friendly URL slug")
    excerpt: str = Field(description="A short summary for previews")
    image: Optional[str] = Field(None, description="Unsplash image URL")
    category: str = Field(description="Category of the blog")
    
    # Content fields at top level for generation
    # Content fields at top level for generation
    introduction: str = Field(default="", description="Introduction paragraphs")
    sections: List[BlogContentSection] = Field(default_factory=list, description="List of content sections")
    conclusion: str = Field(default="", description="Concluding thoughts")
