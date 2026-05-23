"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, ArrowLeft,
  Type, List, Code, Table, Youtube, FileText, Link as LinkIcon, Image as ImageIcon, Upload, Send, Bot, User, GitBranch, Palette
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import CategorySelect from "@/components/CategorySelect";
import { getImageUrl } from "@/lib/utils";

const SECTION_TYPES = [
  { value: "text", label: "Text", icon: Type },
  { value: "bullets", label: "Bullet Points", icon: List },
  { value: "code", label: "Code Block", icon: Code },
  { value: "table", label: "Table", icon: Table },
  { value: "youtube", label: "YouTube Video", icon: Youtube },
  { value: "note", label: "Note/Callout", icon: FileText },
  { value: "links", label: "Links", icon: LinkIcon },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "flowchart", label: "Flowchart", icon: GitBranch },
];

// Function to convert title to URL-safe slug
const generateSlug = (text) => {
  return text
    .toLowerCase() // Convert to lowercase
    .trim() // Remove whitespace from both ends
    .replace(/[^\w\s-]/g, '') // Remove special characters except words, spaces, and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

const normalizeLinkUrl = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "";

  const duplicatedAbsolute = value.match(/^(https?:\/\/\S+?)(https?:\/\/\S+)$/i);
  if (duplicatedAbsolute && duplicatedAbsolute[1] === duplicatedAbsolute[2]) {
    return duplicatedAbsolute[1];
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
    return value;
  }
  if (value.startsWith("www.")) {
    return `https://${value}`;
  }
  if (value.startsWith("localhost:")) {
    return `http://${value}`;
  }
  return value;
};

export default function BlogEditor({ initialData = null, isEditMode = false, isLoadingData = false, onSave }) {
  const router = useRouter();
  const { user, token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true); // Track if slug is auto-generated

  // Main blog fields
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [category, setCategory] = useState("");     // display name
  const [categoryId, setCategoryId] = useState(null); // resolved mongo ID
  const [tags, setTags] = useState("");
  const [image, setImage] = useState("");
  const [featured, setFeatured] = useState(false);

  // Sections
  const [sections, setSections] = useState([]);

  // Chat states
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom when chat history changes
  useEffect(() => {
    if (chatContainerRef.current && showChat) {
      // Scroll the chat container to bottom
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isGenerating, showChat]);

  // Fetch initial data if in edit mode
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setSlug(initialData.slug || "");
      if (initialData.slug) setAutoSlug(false);
      setSubtitle(initialData.subtitle || "");
      setExcerpt(initialData.excerpt || "");
      setImage(initialData.image || initialData.thumbnail || "");
      
      const catValue = initialData.category;
      if (catValue && typeof catValue === "object" && catValue.name) {
        setCategory(catValue.name);
      } else if (typeof catValue === "string") {
        setCategory(catValue);
      } else {
        setCategory("");
      }
      
      setFeatured(initialData.featured || false);
      if (initialData.tags && Array.isArray(initialData.tags)) {
        setTags(initialData.tags.join(", "));
      }

      setIntroduction(initialData.introduction || initialData.content?.introduction || "");
      setConclusion(initialData.conclusion || initialData.content?.conclusion || "");

      const blogSections = initialData.sections || initialData.content?.sections || [];
      if (Array.isArray(blogSections)) {
        const loadedSections = blogSections.map((section, index) => ({
          id: Date.now() + index,
          ...section
        }));
        setSections(loadedSections);
      }
    }
  }, [initialData]);

  // Auto-generate slug when title changes
  useEffect(() => {
    if (autoSlug && title) {
      setSlug(generateSlug(title));
    }
  }, [title, autoSlug]);

  const handleLoadJSON = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);

        // Handle both single blog object and blogs array
        const blogData = jsonData.blogs ? jsonData.blogs[0] : jsonData;

        // Fill basic fields
        if (blogData.title) setTitle(blogData.title);
        if (blogData.slug) {
          setSlug(blogData.slug);
          setAutoSlug(false);
        }
        if (blogData.subtitle) setSubtitle(blogData.subtitle);
        if (blogData.excerpt) setExcerpt(blogData.excerpt);
        if (blogData.image) setImage(blogData.image);
        if (blogData.category_name) setCategory(blogData.category_name);
        else if (blogData.category) setCategory(blogData.category);
        
        if (blogData.featured !== undefined) setFeatured(blogData.featured);
        
        // Handle tags (array or comma string)
        if (blogData.tags) {
          if (Array.isArray(blogData.tags)) setTags(blogData.tags.join(", "));
          else setTags(blogData.tags);
        }

        // Fill content
        const contentSource = blogData.content || blogData;
        if (contentSource.introduction) setIntroduction(contentSource.introduction);
        if (contentSource.conclusion) setConclusion(contentSource.conclusion);

        // Load and map sections
        const rawSections = contentSource.sections || blogData.sections;
        if (rawSections && Array.isArray(rawSections)) {
          const mappedSections = rawSections.map((section, index) => {
            const base = {
              id: Date.now() + index,
              ...section
            };
            
            // Special mapping for Image sections from blog.json
            if (section.type === "image") {
              return {
                ...base,
                imageUrl: section.content || section.imageUrl || "",
                description: section.caption || section.description || ""
              };
            }
            
            return base;
          });
          setSections(mappedSections);
        }

        toast.success("JSON loaded successfully!", {
          description: "All fields have been populated and mapped from the JSON file.",
          duration: 3000,
        });
      } catch (error) {
        console.error("Error loading JSON:", error);
        toast.error("Failed to load JSON file", {
          description: "Please check if the file is valid JSON format.",
          duration: 4000,
        });
      }
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSectionImageChange = (sectionId, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSections(sections.map(s =>
          s.id === sectionId ? { ...s, imageFile: file, imagePreview: reader.result } : s
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChatSend = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage.trim();
    setChatMessage("");
    setIsGenerating(true);

    // Add user message to history immediately
    setChatHistory(prev => [...prev, { role: "user", content: userMessage }]);

    try {
      const response = await api.generateBlog(userMessage, sessionId);

      // Update session ID if provided
      if (response.session_id) {
        setSessionId(response.session_id);
      }

      // Update chat history from conversation array
      if (response.conversation && Array.isArray(response.conversation)) {
        setChatHistory(response.conversation.map(msg => ({
          role: msg.role,
          content: msg.content
        })));
      }

      // Load blog data from blog_state if available
      const blogState = response.blog_state;
      if (blogState) {
        // Fill basic fields
        if (blogState.title) {
          setTitle(blogState.title);
        }
        if (blogState.slug) {
          setSlug(blogState.slug);
          setAutoSlug(false);
        }
        if (blogState.subtitle) {
          setSubtitle(blogState.subtitle);
        }
        if (blogState.excerpt) {
          setExcerpt(blogState.excerpt);
        }
        if (blogState.image) {
          setImage(blogState.image);
        }
        if (blogState.category) {
          setCategory(blogState.category);
        }
        if (blogState.featured !== undefined) {
          setFeatured(blogState.featured);
        }
        if (blogState.tags && Array.isArray(blogState.tags)) {
          setTags(blogState.tags.join(", "));
        }

        // Fill content
        if (blogState.content) {
          if (blogState.content.introduction) {
            setIntroduction(blogState.content.introduction);
          }
          if (blogState.content.conclusion) {
            setConclusion(blogState.content.conclusion);
          }

          // Load sections
          if (blogState.content.sections && Array.isArray(blogState.content.sections)) {
            const loadedSections = blogState.content.sections.map((section, index) => ({
              id: Date.now() + index,
              ...section
            }));
            setSections(loadedSections);
          }
        }

        // Show success message if blog was generated
        if (blogState.title && response.action === "generate") {
          toast.success("Blog generated successfully!", {
            description: "The AI has created a blog based on your request.",
            duration: 3000,
          });
        }
      }

      // Auto-save if action is "save" and pending_save is true
      if (response.action === "save" && response.pending_save === true && response.session_id && token) {
        try {
          setIsGenerating(true);
          const saveResponse = await api.saveGeneratedBlog(response.session_id, token);

          toast.success("Blog saved successfully!", {
            description: saveResponse.message || "Your blog has been saved to your collection.",
            duration: 3000,
          });

          // Redirect to blog list page after a short delay
          setTimeout(() => {
            router.push("/my-blogs");
          }, 1000);
        } catch (saveError) {
          console.error("Error saving blog:", saveError);
          toast.error("Failed to save blog", {
            description: saveError.message || "Please try saving manually using the Save Blog button.",
            duration: 4000,
          });
        } finally {
          setIsGenerating(false);
        }
      }

    } catch (error) {
      console.error("Error generating blog:", error);
      toast.error("Failed to generate blog", {
        description: error.message || "Please try again or use the Load JSON option.",
        duration: 4000,
      });
      setChatHistory(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error generating your blog. Please try again."
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const addSection = (type) => {
    const newSection = {
      id: Date.now(),
      type,
      title: "",
      content: "",
      items: type === "bullets" ? [""] : undefined,
      headers: type === "table" ? ["", ""] : undefined,
      rows: type === "table" ? [["", ""]] : undefined,
      language: type === "code" ? "javascript" : undefined,
      videoId: type === "youtube" ? "" : undefined,
      videoTitle: type === "youtube" ? "" : undefined,
      description: type === "youtube" || type === "image" ? "" : undefined,
      links: type === "links" ? [{ text: "", url: "", description: "" }] : undefined,
      imageUrl: type === "image" ? "" : undefined,
      attachment: type === "image" ? null : undefined,
      steps: type === "flowchart" ? [{ id: `step-${Date.now()}`, title: "Initial Step", description: "", color: "blue", branches: [] }] : undefined,
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (id) => {
    setSections(sections.filter((s) => s.id !== id));
  };

  const moveSection = (index, direction) => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === sections.length - 1)
    ) {
      return;
    }
    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [
      newSections[targetIndex],
      newSections[index],
    ];
    setSections(newSections);
  };

  const updateSection = (id, field, value) => {
    setSections(
      sections.map((section) => {
        if (section.id === id) {
          return { ...section, [field]: value };
        }
        return section;
      })
    );
  };

  const addBulletItem = (sectionId) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          return { ...section, items: [...(section.items || []), ""] };
        }
        return section;
      })
    );
  };

  const removeBulletItem = (sectionId, index) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            items: section.items.filter((_, i) => i !== index),
          };
        }
        return section;
      })
    );
  };

  const updateBulletItem = (sectionId, index, value) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          const items = [...(section.items || [])];
          items[index] = value;
          return { ...section, items };
        }
        return section;
      })
    );
  };

  const addTableRow = (sectionId) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId && section.headers) {
          const numCols = section.headers.length;
          return {
            ...section,
            rows: [...(section.rows || []), Array(numCols).fill("")],
          };
        }
        return section;
      })
    );
  };

  const removeTableRow = (sectionId, index) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            rows: section.rows.filter((_, i) => i !== index),
          };
        }
        return section;
      })
    );
  };

  const updateTableRow = (sectionId, rowIndex, colIndex, value) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          const rows = section.rows.map((row, i) => {
            if (i === rowIndex) {
              const newRow = [...row];
              newRow[colIndex] = value;
              return newRow;
            }
            return row;
          });
          return { ...section, rows };
        }
        return section;
      })
    );
  };

  const updateTableHeader = (sectionId, index, value) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          const headers = [...(section.headers || [])];
          headers[index] = value;
          return { ...section, headers };
        }
        return section;
      })
    );
  };

  const addLink = (sectionId) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            links: [...(section.links || []), { text: "", url: "", description: "" }],
          };
        }
        return section;
      })
    );
  };

  const removeLink = (sectionId, index) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            links: section.links.filter((_, i) => i !== index),
          };
        }
        return section;
      })
    );
  };

  const updateLink = (sectionId, linkIndex, field, value) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          const links = section.links.map((link, i) => {
            if (i === linkIndex) {
              return { ...link, [field]: value };
            }
            return link;
          });
          return { ...section, links };
        }
        return section;
      })
    );
  };

  const addFlowchartStep = (sectionId) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            steps: [...(section.steps || []), {
              id: `step-${Date.now()}`,
              title: "",
              description: "",
              color: "blue",
              branches: []
            }],
          };
        }
        return section;
      })
    );
  };

  const removeFlowchartStep = (sectionId, stepIndex) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            steps: section.steps.filter((_, i) => i !== stepIndex),
          };
        }
        return section;
      })
    );
  };

  const updateFlowchartStep = (sectionId, stepIndex, field, value) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          const steps = [...(section.steps || [])];
          steps[stepIndex] = { ...steps[stepIndex], [field]: value };
          return { ...section, steps };
        }
        return section;
      })
    );
  };

  const addFlowchartBranch = (sectionId, stepIndex) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          const steps = [...(section.steps || [])];
          const branches = [...(steps[stepIndex].branches || [])];
          branches.push({
            id: `branch-${Date.now()}`,
            title: "",
            description: "",
            color: "indigo"
          });
          steps[stepIndex] = { ...steps[stepIndex], branches };
          return { ...section, steps };
        }
        return section;
      })
    );
  };

  const removeFlowchartBranch = (sectionId, stepIndex, branchIndex) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          const steps = [...(section.steps || [])];
          const branches = steps[stepIndex].branches.filter((_, i) => i !== branchIndex);
          steps[stepIndex] = { ...steps[stepIndex], branches };
          return { ...section, steps };
        }
        return section;
      })
    );
  };

  const updateFlowchartBranch = (sectionId, stepIndex, branchIndex, field, value) => {
    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          const steps = [...(section.steps || [])];
          const branches = [...(steps[stepIndex].branches || [])];
          branches[branchIndex] = { ...branches[branchIndex], [field]: value };
          steps[stepIndex] = { ...steps[stepIndex], branches };
          return { ...section, steps };
        }
        return section;
      })
    );
  };

  const handleSave = async () => {
    // Validate required fields
    if (!title || !title.trim()) {
      toast.error("Title is required", {
        description: "Please enter a blog title.",
        duration: 3000,
      });
      return;
    }

    if (!slug || !slug.trim()) {
      toast.error("Slug is required", {
        description: "Please enter a blog slug.",
        duration: 3000,
      });
      return;
    }

    if (!imageFile && !image) {
      toast.error("Image is required", {
        description: "Please select or upload an image for your blog.",
        duration: 3000,
      });
      return;
    }

    if (!category || !category.trim()) {
      toast.error("Category is required", {
        description: "Please enter a category for your blog.",
        duration: 3000,
      });
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = image;
      let finalImageId = null;

      // Extract existing thumbnail ID if present
      if (isEditMode && initialData?.thumbnail) {
        finalImageId = typeof initialData.thumbnail === 'object' ? (initialData.thumbnail.id || initialData.thumbnail._id) : initialData.thumbnail;
      }

      // 1. Upload main thumbnail if file exists
      if (imageFile) {
        try {
          const uploadRes = await api.uploadImage(imageFile, 'blogs', token);
          finalImageUrl = uploadRes.url;
          // Use public_id if id is not available from Next.js local API
          finalImageId = uploadRes.id || uploadRes.public_id || uploadRes._id;
        } catch (uploadError) {
          console.error("Error uploading thumbnail:", uploadError);
          toast.error("Failed to upload thumbnail image");
          setSaving(false);
          return;
        }
      }

      // 2. Upload section images if files exist
      const updatedSections = await Promise.all(sections.map(async (section) => {
        if (section.type === 'image' && section.imageFile) {
          try {
            const uploadRes = await api.uploadImage(section.imageFile, 'blogs', token);
            const { imageFile, imagePreview, imageUrl, imageId, id, ...rest } = section;
            return { ...rest, attachment: uploadRes.id || uploadRes.public_id || uploadRes._id };
          } catch (uploadError) {
            console.error("Error uploading section image:", uploadError);
            toast.error(`Failed to upload image for section: ${section.title || 'Untitled'}`);
            throw uploadError;
          }
        }

        const { id, imageFile, imagePreview, imageUrl, imageId, ...rest } = section;
        if (rest.type === "links" && Array.isArray(rest.links)) {
          rest.links = rest.links.map((link) => ({
            ...link,
            url: normalizeLinkUrl(link?.url),
          }));
        }
        return rest;
      }));

      // Category is already resolved by CategorySelect — use categoryId directly
      const finalCategoryId = categoryId || null;

      const blogData = {
        slug,
        title,
        subtitle,
        excerpt,
        introduction,
        conclusion,
        author: isEditMode ? (initialData?.author?.id || initialData?.author?._id || user?.id || user?._id || "Anonymous") : (user?.id || user?._id || "Anonymous"),
        publishedDate: isEditMode ? (initialData?.publishedDate || initialData?.created_at || new Date().toISOString().split("T")[0]) : new Date().toISOString().split("T")[0],
        tags: tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0),
        thumbnail: finalImageId || undefined,
        image: finalImageUrl,
        category: finalCategoryId,
        featured,
        sections: updatedSections,
      };

      await onSave(blogData);
      
    } catch (error) {
      console.error("Error saving blog:", error);
      toast.error(`Error saving blog: ${error.message}`, {
        description: "Please try again or contact support.",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="flex items-center justify-center gap-3 bg-background px-6 py-4 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
          <span className="h-5 w-5 border-2 border-foreground border-r-transparent animate-spin"></span>
          <span className="font-mono font-bold text-sm uppercase tracking-widest text-foreground">Loading System...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 bg-background min-h-screen border-t-2 border-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Chat Section */}
        <div className="mb-6 bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">AI Blog Generator</h3>
                <p className="text-sm text-gray-600">Describe your blog and I'll create it for you</p>
              </div>
            </div>
            {isEditMode && (
              <div className="text-xs font-mono font-bold uppercase text-purple-900 bg-purple-100 px-3 py-1 border-[2px] border-purple-900">
                AI GEN WILL OVERWRITE FIELDS
              </div>
            )}
            <button
              onClick={() => setShowChat(!showChat)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {showChat ? "Hide" : "Show"} Chat
            </button>
          </div>

          {showChat && (
            <>
              {/* Chat History */}
              <div ref={chatContainerRef} className="max-h-96 overflow-y-auto mb-4 space-y-3" style={{ scrollBehavior: 'smooth' }}>
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-900"
                        }`}
                    >
                      <div className={`text-sm prose prose-sm max-w-none ${msg.role === "user" ? "prose-invert" : ""}`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || "");
                              const language = match ? match[1] : "";
                              const isUserMessage = msg.role === "user";
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={isUserMessage ? oneLight : oneDark}
                                  language={language}
                                  PreTag="div"
                                  className="rounded-lg text-xs"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-indigo-600" />
                      </div>
                    )}
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleChatSend()}
                  placeholder="Type your blog idea or description..."
                  className="flex-1 px-4 py-3 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isGenerating}
                />
                <button
                  onClick={handleChatSend}
                  disabled={isGenerating || !chatMessage.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {isGenerating ? "Generating..." : "Send"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between border-b-2 border-foreground pb-4">
          <div>
            <Link
              href="/my-blogs"
              className="flex items-center gap-2 text-foreground font-mono font-bold uppercase tracking-widest text-sm hover:text-purple-900 hover:translate-x-[-4px] transition-all mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK TO MY BLOGS
            </Link>
            <h1 className="text-4xl font-extrabold text-foreground uppercase tracking-tighter">CREATE NEW BLOG</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-6 py-3 border-2 border-foreground bg-purple-900 text-white font-mono font-bold uppercase tracking-widest text-sm shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all cursor-pointer">
              <Upload className="w-5 h-5" />
              Load JSON
              <input
                type="file"
                accept=".json"
                onChange={handleLoadJSON}
                className="hidden"
              />
            </label>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 border-2 border-foreground bg-background text-foreground font-mono font-bold uppercase tracking-widest text-sm shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 hover:bg-purple-900 hover:text-white transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? "SAVING..." : "SAVE BLOG"}
            </button>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] p-6 mb-8">
          <h2 className="text-2xl font-extrabold text-foreground mb-6 uppercase tracking-tighter border-b-2 border-foreground pb-2">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
                placeholder="Enter blog title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground">
                    Slug *
                  </label>
                  {autoSlug && (
                    <span className="text-xs text-gray-500 italic">Auto-generated</span>
                  )}
                </div>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setAutoSlug(false); // Disable auto-generation when manually edited
                  }}
                  className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
                  placeholder="blog-slug-url"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-1">
                  Category *
                </label>
                <CategorySelect
                  categoryId={category}
                  categoryName={category}
                  onSelect={(id, name) => { setCategoryId(id); setCategory(name); }}
                  token={token}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-1">
                Subtitle
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
                placeholder="Enter subtitle"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-1">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
                rows="3"
                placeholder="Short description"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-1">
                Featured Image *
              </label>
              <div className="flex flex-col gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative w-full h-64 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden ${imagePreview || image
                    ? 'border-indigo-500 bg-indigo-50/10'
                    : 'border-gray-300 hover:border-indigo-400 bg-gray-50'
                    }`}
                >
                  {imagePreview || image ? (
                    <>
                      <img
                        src={getImageUrl(imagePreview || image)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="flex items-center gap-2 text-white font-medium">
                          <Upload className="w-5 h-5" />
                          Change Image
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6">
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">Click to upload featured image</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG or WebP up to 10MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>


              </div>
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
                placeholder="JavaScript, React, Next.js"
              />
            </div>
            <div className="flex items-center gap-2 mt-4 mb-2">
              <label className="flex items-center cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 border-2 border-foreground transition-all ${featured ? 'bg-purple-900 shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]' : 'bg-background group-hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]'}`}>
                    {featured && (
                      <svg className="w-4 h-4 text-white mx-auto mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="ml-3 text-xs font-mono font-bold uppercase tracking-widest text-foreground">
                  Feature this blog
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Introduction */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Introduction</h2>
          <textarea
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
            className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
            rows="4"
            placeholder="Write the introduction for your blog..."
          />
        </div>

        {/* Sections */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Content Sections</h2>
          </div>

          <div className="space-y-4">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className="bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveSection(index, "up")}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveSection(index, "down")}
                      disabled={index === sections.length - 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-gray-700">
                      {SECTION_TYPES.find((t) => t.value === section.type)?.label}
                    </span>
                  </div>
                  <button
                    onClick={() => removeSection(section.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-1">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={section.title || ""}
                    onChange={(e) =>
                      updateSection(section.id, "title", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Section title"
                  />
                </div>

                {/* Render section based on type */}
                {section.type === "text" && (
                  <textarea
                    value={section.content}
                    onChange={(e) =>
                      updateSection(section.id, "content", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="4"
                    placeholder="Write your content..."
                  />
                )}

                {section.type === "bullets" && (
                  <div className="space-y-2">
                    {section.items?.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) =>
                            updateBulletItem(section.id, itemIndex, e.target.value)
                          }
                          className="flex-1 px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Bullet point"
                        />
                        <button
                          onClick={() => removeBulletItem(section.id, itemIndex)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addBulletItem(section.id)}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                      Add Bullet Point
                    </button>
                  </div>
                )}

                {section.type === "code" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={section.language || ""}
                      onChange={(e) =>
                        updateSection(section.id, "language", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Language (e.g., javascript, python)"
                    />
                    <textarea
                      value={section.content}
                      onChange={(e) =>
                        updateSection(section.id, "content", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                      rows="8"
                      placeholder="Paste your code here..."
                    />
                  </div>
                )}

                {section.type === "table" && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-1">
                        Headers
                      </label>
                      <div className="flex gap-2">
                        {section.headers?.map((header, headerIndex) => (
                          <input
                            key={headerIndex}
                            type="text"
                            value={header}
                            onChange={(e) =>
                              updateTableHeader(section.id, headerIndex, e.target.value)
                            }
                            className="flex-1 px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={`Header ${headerIndex + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-1">
                        Rows
                      </label>
                      <div className="space-y-2">
                        {section.rows?.map((row, rowIndex) => (
                          <div key={rowIndex} className="flex gap-2">
                            {row.map((cell, colIndex) => (
                              <input
                                key={colIndex}
                                type="text"
                                value={cell}
                                onChange={(e) =>
                                  updateTableRow(
                                    section.id,
                                    rowIndex,
                                    colIndex,
                                    e.target.value
                                  )
                                }
                                className="flex-1 px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder={`Cell ${rowIndex + 1}-${colIndex + 1}`}
                              />
                            ))}
                            <button
                              onClick={() => removeTableRow(section.id, rowIndex)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => addTableRow(section.id)}
                        className="mt-2 flex items-center gap-2 px-3 py-2 text-sm bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all hover:bg-gray-50"
                      >
                        <Plus className="w-4 h-4" />
                        Add Row
                      </button>
                    </div>
                  </div>
                )}

                {section.type === "youtube" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={section.videoId || ""}
                      onChange={(e) =>
                        updateSection(section.id, "videoId", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="YouTube Video ID"
                    />
                    <input
                      type="text"
                      value={section.videoTitle || ""}
                      onChange={(e) =>
                        updateSection(section.id, "videoTitle", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Video Title"
                    />
                    <textarea
                      value={section.description || ""}
                      onChange={(e) =>
                        updateSection(section.id, "description", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows="2"
                      placeholder="Video description"
                    />
                  </div>
                )}

                {section.type === "note" && (
                  <textarea
                    value={section.content}
                    onChange={(e) =>
                      updateSection(section.id, "content", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                    placeholder="Write your note or callout..."
                  />
                )}

                {section.type === "links" && (
                  <div className="space-y-2">
                    {section.links?.map((link, linkIndex) => (
                      <div key={linkIndex} className="border border-gray-200 rounded-lg p-3 space-y-2">
                        <input
                          type="text"
                          value={link.text}
                          onChange={(e) =>
                            updateLink(section.id, linkIndex, "text", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Link text"
                        />
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) =>
                            updateLink(section.id, linkIndex, "url", e.target.value)
                          }
                          onBlur={(e) =>
                            updateLink(section.id, linkIndex, "url", normalizeLinkUrl(e.target.value))
                          }
                          className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="URL"
                        />
                        <input
                          type="text"
                          value={link.description}
                          onChange={(e) =>
                            updateLink(section.id, linkIndex, "description", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Description"
                        />
                        <button
                          onClick={() => removeLink(section.id, linkIndex)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove Link
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addLink(section.id)}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                      Add Link
                    </button>
                  </div>
                )}

                {section.type === "image" && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                      <label className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground">
                        Section Image
                      </label>
                      <div
                        onClick={() => document.getElementById(`section-file-${section.id}`).click()}
                        className={`relative w-full h-48 rounded-lg border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden ${section.imagePreview || section.imageUrl || section.attachment
                          ? 'border-indigo-500 bg-indigo-50/10'
                          : 'border-gray-300 hover:border-indigo-400 bg-gray-50'
                          }`}
                      >
                        {section.imagePreview || section.imageUrl || section.attachment ? (
                          <>
                            <img
                              src={getImageUrl(section.imagePreview || section.imageUrl || section.attachment)}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="flex items-center gap-2 text-white font-medium">
                                <Upload className="w-4 h-4" />
                                Change Section Image
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs font-medium text-gray-900">Click to upload image</p>
                          </div>
                        )}
                        <input
                          id={`section-file-${section.id}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSectionImageChange(section.id, e)}
                          className="hidden"
                        />
                      </div>


                    </div>

                    <textarea
                      value={section.description || ""}
                      onChange={(e) =>
                        updateSection(section.id, "description", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows="2"
                      placeholder="Image description or caption"
                    />
                  </div>
                )}

                {section.type === "flowchart" && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {section.steps?.map((step, sIdx) => (
                        <div key={step.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-600">Main Step {sIdx + 1}</span>
                            <button
                              onClick={() => removeFlowchartStep(section.id, sIdx)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <input
                              type="text"
                              value={step.title}
                              onChange={(e) => updateFlowchartStep(section.id, sIdx, "title", e.target.value)}
                              className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="Step title"
                            />
                            <select
                              value={step.color}
                              onChange={(e) => updateFlowchartStep(section.id, sIdx, "color", e.target.value)}
                              className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="blue">Blue</option>
                              <option value="indigo">Indigo</option>
                              <option value="violet">Violet</option>
                              <option value="purple">Purple</option>
                              <option value="pink">Pink</option>
                              <option value="gray">Gray</option>
                            </select>
                          </div>
                          <textarea
                            value={step.description}
                            onChange={(e) => updateFlowchartStep(section.id, sIdx, "description", e.target.value)}
                            className="w-full px-3 py-2 bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                            rows="2"
                            placeholder="Step description"
                          />

                          {/* Branches for this step */}
                          <div className="pl-4 border-l-2 border-dashed border-gray-300 space-y-3 mt-4">
                            {step.branches?.map((branch, bIdx) => (
                              <div key={branch.id} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase">Parallel Option {bIdx + 1}</span>
                                  <button
                                    onClick={() => removeFlowchartBranch(section.id, sIdx, bIdx)}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <input
                                    type="text"
                                    value={branch.title}
                                    onChange={(e) => updateFlowchartBranch(section.id, sIdx, bIdx, "title", e.target.value)}
                                    className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Branch title"
                                  />
                                  <select
                                    value={branch.color}
                                    onChange={(e) => updateFlowchartBranch(section.id, sIdx, bIdx, "color", e.target.value)}
                                    className="px-2 py-1.5 border border-gray-200 rounded text-xs"
                                  >
                                    <option value="blue">Blue</option>
                                    <option value="indigo">Indigo</option>
                                    <option value="violet">Violet</option>
                                    <option value="purple">Purple</option>
                                    <option value="pink">Pink</option>
                                  </select>
                                </div>
                                <textarea
                                  value={branch.description}
                                  onChange={(e) => updateFlowchartBranch(section.id, sIdx, bIdx, "description", e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
                                  rows="1"
                                  placeholder="Branch description"
                                />
                              </div>
                            ))}
                            <button
                              onClick={() => addFlowchartBranch(section.id, sIdx)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Add Parallel Branch
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => addFlowchartStep(section.id)}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add Main Flow Step
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Section</h3>
            <div className="flex flex-wrap gap-2">
              {SECTION_TYPES.map((sectionType) => {
                const Icon = sectionType.icon;
                return (
                  <button
                    key={sectionType.value}
                    onClick={() => addSection(sectionType.value)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-background border-2 border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all hover:bg-gray-50 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {sectionType.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Conclusion */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Conclusion</h2>
          <textarea
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
            rows="4"
            placeholder="Write the conclusion for your blog..."
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push("/my-blogs")}
            className="px-6 py-3 border-[4px] border-black text-black font-mono font-bold uppercase tracking-widest text-xs hover:bg-gray-100 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-purple-900 text-white border-[4px] border-black font-mono font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : (isEditMode ? "Update Blog" : "Publish Blog")}
          </button>
        </div>
      </div>
    </div >
  );
}
