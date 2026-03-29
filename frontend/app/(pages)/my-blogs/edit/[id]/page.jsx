"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, ArrowLeft,
  Type, List, Code, Table, Youtube, FileText, Link as LinkIcon, Image as ImageIcon, Upload, Send, Bot, User
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import CategorySelect from "@/components/CategorySelect";

const SECTION_TYPES = [
  { value: "text", label: "Text", icon: Type },
  { value: "bullets", label: "Bullet Points", icon: List },
  { value: "code", label: "Code Block", icon: Code },
  { value: "table", label: "Table", icon: Table },
  { value: "youtube", label: "YouTube Video", icon: Youtube },
  { value: "note", label: "Note/Callout", icon: FileText },
  { value: "links", label: "Links", icon: LinkIcon },
  { value: "image", label: "Image", icon: ImageIcon },
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

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams();
  const blogId = params.id;
  const { user, token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoSlug, setAutoSlug] = useState(true); // Track if slug is auto-generated

  // Main blog fields
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [featured, setFeatured] = useState(false);

  // Sections
  const [sections, setSections] = useState([]);

  // Chat states
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when chat history changes
  useEffect(() => {
    if (chatContainerRef.current && showChat) {
      // Scroll the chat container to bottom
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isGenerating, showChat]);

  // Auto-generate slug when title changes
  useEffect(() => {
    if (autoSlug && title) {
      setSlug(generateSlug(title));
    }
  }, [title, autoSlug]);

  // Fetch blog data on component mount
  useEffect(() => {
    const fetchBlogData = async () => {
      try {
        setLoading(true);
        // blogId is actually the slug since we changed the edit link
        const blogData = await api.getBlogBySlug(blogId, token, false);

        if (!blogData) {
          toast.error("Blog not found", {
            description: "The blog you're trying to edit doesn't exist.",
            duration: 4000,
          });
          router.push("/my-blogs");
          return;
        }

        // Populate form fields
        setTitle(blogData.title || "");
        setSlug(blogData.slug || "");
        setSubtitle(blogData.subtitle || "");
        setExcerpt(blogData.excerpt || "");
        setImage(blogData.image || blogData.thumbnail || "");
        // category may be an object {id, name} or just a string
        const catValue = blogData.category;
        if (catValue && typeof catValue === "object" && catValue.name) {
          setCategory(catValue.name);
        } else if (typeof catValue === "string") {
          setCategory(catValue);
        } else {
          setCategory("");
        }
        setFeatured(blogData.featured || false);
        if (blogData.tags && Array.isArray(blogData.tags)) {
          setTags(blogData.tags.join(", "));
        }

        // Populate content
        if (blogData.content) {
          setIntroduction(blogData.content.introduction || "");
          setConclusion(blogData.content.conclusion || "");

          if (blogData.content.sections && Array.isArray(blogData.content.sections)) {
            const loadedSections = blogData.content.sections.map((section, index) => ({
              id: Date.now() + index,
              ...section
            }));
            setSections(loadedSections);
          }
        }
      } catch (error) {
        console.error("Error fetching blog:", error);
        toast.error("Failed to load blog", {
          description: "Please try again or go back to My Blogs.",
          duration: 4000,
        });
        router.push("/my-blogs");
      } finally {
        setLoading(false);
      }
    };

    if (blogId && token) {
      fetchBlogData();
    }
  }, [blogId, token, router]);

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
        if (blogData.category) setCategory(blogData.category);
        if (blogData.featured !== undefined) setFeatured(blogData.featured);
        if (blogData.tags && Array.isArray(blogData.tags)) {
          setTags(blogData.tags.join(", "));
        }

        // Fill content
        if (blogData.content) {
          if (blogData.content.introduction) setIntroduction(blogData.content.introduction);
          if (blogData.content.conclusion) setConclusion(blogData.content.conclusion);

          // Load sections
          if (blogData.content.sections && Array.isArray(blogData.content.sections)) {
            const loadedSections = blogData.content.sections.map((section, index) => ({
              id: Date.now() + index,
              ...section
            }));
            setSections(loadedSections);
          }
        }

        toast.success("JSON loaded successfully!", {
          description: "All fields have been populated from the JSON file.",
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
            description: saveError.message || "Please try saving manually using the Update Blog button.",
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

  const handleSave = async () => {
    if (!title || !slug) {
      alert("Please fill in title and slug");
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = image;
      let finalImageId = null;

      // 1. Upload main thumbnail if file exists
      if (imageFile) {
        try {
          const uploadRes = await api.uploadImage(imageFile, 'blogs', token);
          finalImageUrl = uploadRes.url;
          finalImageId = uploadRes.id;
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
            return { ...rest, attachment: uploadRes.id };
          } catch (uploadError) {
            console.error("Error uploading section image:", uploadError);
            toast.error(`Failed to upload image for section: ${section.title || 'Untitled'}`);
            throw uploadError;
          }
        }
        // If URL was entered but not yet uploaded, import it now
        if (section.type === 'image' && section.imageUrl && !section.attachment && section.imageUrl.startsWith('http')) {
          // Verify it's not an existing API media URL to prevent re-uploading
          if (!section.imageUrl.includes('/media/')) {
            try {
              const uploadRes = await api.uploadImage(null, 'blogs', token, section.imageUrl);
              const { imageFile, imagePreview, imageUrl, imageId, id, ...rest } = section;
              return { ...rest, attachment: uploadRes.id };
            } catch (uploadError) {
              console.error("Error importing URL image for section:", uploadError);
              // Non-fatal: keep the original URL if import fails
            }
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

      let finalCategoryId = null;
      if (category && category.trim()) {
        finalCategoryId = await api.getOrCreateCategory(category.trim(), token);
        if (!finalCategoryId) {
          toast.error("Failed to resolve category", {
            description: "We couldn't assign this category, please try again."
          });
          setSaving(false);
          return;
        }
      }

      const blogData = {
        slug,
        title,
        subtitle,
        excerpt,
        introduction,
        conclusion,
        author: user?.id || user?._id || "Anonymous", // Pass MongoDB ID!
        publishedDate: new Date().toISOString().split("T")[0],
        tags: tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0),
        thumbnail: finalImageId || undefined,
        image: finalImageUrl,
        category: finalCategoryId,
        featured,
        sections: updatedSections,
      };

      const response = await api.updateBlog(blogId, blogData, token);
      toast.success(`Blog "${title}" successfully updated!`, {
        description: "Your blog has been updated successfully.",
        duration: 4000,
      });
      setTimeout(() => {
        router.push("/my-blogs");
      }, 1000);
    } catch (error) {
      console.error("Error updating blog:", error);
      toast.error(`Error updating blog: ${error.message}`, {
        description: "Please try again or contact support.",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading blog data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Chat Section */}
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
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
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/my-blogs"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to My Blogs
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Edit Blog</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/30 cursor-pointer">
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
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 shadow-lg shadow-indigo-500/30 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Update Blog"}
            </button>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter blog title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="blog-slug-url"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <CategorySelect
                  value={category}
                  onChange={(name) => setCategory(name)}
                  token={token}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtitle
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter subtitle"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows="3"
                placeholder="Short description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        src={imagePreview || image}
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

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => {
                      const url = e.target.value;
                      setImage(url);
                      setImageFile(null);
                      setImagePreview(url || null); // show preview instantly
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Or paste image URL to preview"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="JavaScript, React, Next.js"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                Feature this blog
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="border border-gray-300 rounded-lg p-4 space-y-4"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) =>
                      updateSection(section.id, "title", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Language (e.g., javascript, python)"
                    />
                    <textarea
                      value={section.content}
                      onChange={(e) =>
                        updateSection(section.id, "content", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                      rows="8"
                      placeholder="Paste your code here..."
                    />
                  </div>
                )}

                {section.type === "table" && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={`Header ${headerIndex + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="mt-2 flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="YouTube Video ID"
                    />
                    <input
                      type="text"
                      value={section.videoTitle || ""}
                      onChange={(e) =>
                        updateSection(section.id, "videoTitle", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Video Title"
                    />
                    <textarea
                      value={section.description || ""}
                      onChange={(e) =>
                        updateSection(section.id, "description", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="URL"
                        />
                        <input
                          type="text"
                          value={link.description}
                          onChange={(e) =>
                            updateLink(section.id, linkIndex, "description", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                      Add Link
                    </button>
                  </div>
                )}

                {section.type === "image" && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Section Image
                      </label>
                      <div
                        onClick={() => document.getElementById(`section-file-${section.id}`).click()}
                        className={`relative w-full h-48 rounded-lg border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden ${section.imagePreview || section.imageUrl || section.attachment?.file_path
                          ? 'border-indigo-500 bg-indigo-50/10'
                          : 'border-gray-300 hover:border-indigo-400 bg-gray-50'
                          }`}
                      >
                        {section.imagePreview || section.imageUrl || section.attachment?.file_path ? (
                          <>
                            <img
                              src={section.imagePreview || section.imageUrl || section.attachment?.file_path}
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

                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LinkIcon className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={section.imageUrl || ""}
                          onChange={(e) => {
                            const url = e.target.value;
                            // Update imageUrl + imagePreview together to make the preview show instantly
                            setSections(prev => prev.map(s =>
                              s.id === section.id
                                ? { ...s, imageUrl: url, imagePreview: url || null, imageFile: null, attachment: null }
                                : s
                            ));
                          }}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          placeholder="Or paste image URL to preview"
                        />
                      </div>
                    </div>
                    <textarea
                      value={section.description || ""}
                      onChange={(e) =>
                        updateSection(section.id, "description", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows="2"
                      placeholder="Image description or caption"
                    />
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
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows="4"
            placeholder="Write the conclusion for your blog..."
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end mb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 shadow-lg shadow-indigo-500/30 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? "Updating..." : "Update Blog"}
          </button>
        </div>
      </div>
    </div >
  );
}
