"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Camera, User, Mail, FileText, Save, MessageSquare, Sparkles, Link2, Link2Off, ToggleLeft, ToggleRight } from "lucide-react";
import TestimonialModal from "@/components/TestimonialModal";
import { getImageUrl } from "@/lib/utils";
import Image from "next/image";
import { Suspense } from "react";

function ProfilePageContent() {
  const { user, token, updateProfile, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [linkedinLinked, setLinkedinLinked] = useState(false);
  const [linkedinAutoPost, setLinkedinAutoPost] = useState(false);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    headline: "",
    bio: "",
    profile_image: "",
  });

  // Redirect if definitely not authenticated and not loading
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        // Fetch full profile from DB because session object doesn't include headline/bio
        const fullUser = await api.getUserProfileByEmail(user.email);
        setFormData({
          full_name: fullUser.full_name || user.full_name || "",
          headline: fullUser.headline || "",
          bio: fullUser.bio || "",
          profile_image: fullUser.profile_image || fullUser.profile_image_url || user.profile_image || "",
        });
        setLinkedinLinked(!!fullUser.linkedinId);
        setLinkedinAutoPost(!!fullUser.linkedin_auto_post);
      } catch (err) {
        console.error("Failed to fetch full profile", err);
        setFormData({
          full_name: user.full_name || "",
          headline: user.headline || "",
          bio: user.bio || "",
          profile_image: user.profile_image || user.profile_image_url || "",
        });
      }
    };

    fetchProfile();
  }, [user]);

  // Show toast based on LinkedIn OAuth redirect result
  useEffect(() => {
    const linkedin = searchParams.get("linkedin");
    if (!linkedin) return;

    const messages = {
      connected: ["LinkedIn connected successfully!", "success"],
      denied: ["LinkedIn connection was cancelled.", "info"],
      already_linked: ["This LinkedIn account is already linked to another user.", "error"],
      invalid_state: ["Invalid OAuth state. Please try again.", "error"],
      token_failed: ["Could not get LinkedIn token. Please try again.", "error"],
      profile_failed: ["Could not fetch LinkedIn profile. Please try again.", "error"],
      error: ["LinkedIn connection failed. Please try again.", "error"],
    };

    const [message, type] = messages[linkedin] || ["LinkedIn: unknown response", "info"];
    toast[type](message);

    // Clean the query param from URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete("linkedin");
    window.history.replaceState({}, "", url.toString());
  }, [searchParams]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const [imageFile, setImageFile] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size should be less than 2MB");
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }

      setImageFile(file); // Store file for upload

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          profile_image: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLinkedInConnect = () => {
    window.location.href = "/api/linkedin/connect";
  };

  const handleLinkedInDisconnect = async () => {
    if (!confirm("Disconnect LinkedIn? Auto-posting will be disabled.")) return;
    setLinkedinLoading(true);
    try {
      const res = await fetch("/api/linkedin/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setLinkedinLinked(false);
      setLinkedinAutoPost(false);
      toast.success("LinkedIn disconnected");
    } catch {
      toast.error("Failed to disconnect LinkedIn");
    } finally {
      setLinkedinLoading(false);
    }
  };

  const handleAutoPostToggle = async () => {
    const next = !linkedinAutoPost;
    setLinkedinAutoPost(next);
    try {
      const res = await fetch("/api/linkedin/auto-post", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_post: next }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(next ? "Auto-post to LinkedIn enabled" : "Auto-post to LinkedIn disabled");
    } catch {
      setLinkedinAutoPost(!next); // revert
      toast.error("Failed to update auto-post setting");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {};
      let hasChanges = false;

      // Check full_name
      if (formData.full_name !== (user?.full_name || "")) {
        updateData.full_name = formData.full_name;
        hasChanges = true;
      }

      if (formData.headline !== (user?.headline || "")) {
        updateData.headline = formData.headline;
        hasChanges = true;
      }

      if (formData.bio !== (user?.bio || "")) {
        updateData.bio = formData.bio;
        hasChanges = true;
      }

      // Handle Image File
      if (imageFile) {
        try {
          const uploadRes = await api.uploadImage(imageFile, 'users', token);
          if (uploadRes && (uploadRes.url || uploadRes.file_path)) {
            updateData.profile_image = uploadRes.url || uploadRes.file_path;
            hasChanges = true;
          } else {
            throw new Error("No URL returned from image upload");
          }
        } catch (uploadError) {
          console.error("Error uploading profile picture:", uploadError);
          toast.error("Failed to upload profile picture. Please try again.");
          setLoading(false);
          return;
        }
      }

      if (!hasChanges) {
        toast.info("No changes to update");
        setLoading(false);
        return;
      }

      const result = await api.updateUserProfile(token, updateData);

      if (updateProfile) {
        await updateProfile(updateData);
      }

      toast.success("Profile updated successfully!");

      // Refresh to get new data
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !isAuthenticated || (isAuthenticated && !user)) {
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
    <div className="min-h-[calc(100vh-4rem)] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center lg:text-left border-b-2 border-foreground pb-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3 tracking-tight uppercase">SYSTEM.SETTINGS</h1>
          <p className="font-mono text-sm uppercase tracking-widest text-gray-600">
            Configure your terminal identity
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] overflow-hidden mb-12 relative">
          {/* Decorative Top Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-purple-900 border-b-2 border-foreground"></div>

          <div className="p-8 md:p-12 pt-12 md:pt-16">
            {/* Profile Image Section */}
            <div className="mb-12 border-b-2 border-foreground pb-12">
              <label className="block text-sm font-bold text-foreground mb-6 uppercase tracking-widest font-mono">
                [ Profile Display ]
              </label>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group w-32 h-32 border-2 border-foreground bg-zinc-100 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] overflow-hidden shrink-0">
                    {formData.profile_image ? (
                        <Image
                            src={getImageUrl(formData.profile_image)} 
                            alt={user?.full_name || user?.email} 
                            fill
                            sizes="128px"
                            className="object-cover transition-all duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-foreground text-background">
                            <span className="font-mono font-bold text-5xl uppercase">
                                {user?.full_name?.[0] || user?.email?.[0] || "U"}
                            </span>
                        </div>
                    )}
                </div>
                <div className="text-center md:text-left flex flex-col items-center md:items-start">
                  <h3 className="text-2xl font-extrabold text-foreground mb-2 uppercase tracking-tight">{formData.full_name || "New Explorer"}</h3>
                  <p className="text-[10px] font-mono text-gray-600 mb-4 max-w-xs uppercase tracking-widest leading-relaxed">
                    Requirement: Square JPG/PNG. Max 2MB.
                  </p>
                  <label
                    htmlFor="profile-image-input"
                    className="inline-flex items-center px-6 py-2 bg-background border-2 border-foreground text-xs font-mono font-bold uppercase tracking-widest text-foreground hover:bg-purple-900 hover:text-white transition-all cursor-pointer shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                  >
                    Upload Image
                  </label>
                  <input
                    id="profile-image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Full Name Field */}
                <div>
                  <label htmlFor="full_name" className="block text-xs font-mono font-bold text-foreground mb-3 uppercase tracking-widest">
                    [ Full Name ]
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground w-5 h-5" />
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm text-foreground placeholder:text-gray-400"
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label htmlFor="email" className="block text-xs font-mono font-bold text-foreground mb-3 uppercase tracking-widest opacity-80">
                    [ Email Address ] <span className="text-[10px] bg-foreground text-background px-2 py-0.5 ml-2 font-bold uppercase tracking-widest">LOCKED</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-gray-300 text-gray-500 cursor-not-allowed font-mono text-sm opacity-80"
                    />
                  </div>
                </div>
              </div>

              {/* Headline */}
              <div>
                <label htmlFor="headline" className="block text-xs font-mono font-bold text-purple-900 mb-3 uppercase tracking-widest">
                  [ Headline ]
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground w-5 h-5" />
                  <input
                    id="headline"
                    name="headline"
                    type="text"
                    maxLength={255}
                    value={formData.headline}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm text-foreground placeholder:text-gray-400"
                    placeholder="e.g. Creative Writer | Tech Enthusiast"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-xs font-mono font-bold text-foreground mb-3 uppercase tracking-widest">
                  [ Your Story ]
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all resize-none font-mono text-sm text-foreground placeholder:text-gray-400"
                  placeholder="Share a bit about yourself..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-8 border-t-2 border-foreground">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 bg-background border-2 border-transparent text-foreground hover:border-foreground transition-all font-mono font-bold text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-foreground text-background border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs hover:bg-purple-900 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-none h-4 w-4 border-2 border-background border-t-transparent"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* LinkedIn Integration Section */}
        <div className="bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] overflow-hidden mb-12 relative">
          <div className="absolute top-0 left-0 right-0 h-2 bg-[#0A66C2] border-b-2 border-foreground"></div>
          <div className="p-8 md:p-10 pt-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6 border-b-2 border-foreground pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0A66C2] border-2 border-foreground flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-foreground uppercase tracking-tight">LinkedIn Integration</h3>
                  <p className="text-gray-600 font-mono text-xs uppercase tracking-widest mt-1">
                    {linkedinLinked ? "Account connected" : "Connect to enable sharing"}
                  </p>
                </div>
                {linkedinLinked && (
                  <span className="px-3 py-1 text-[10px] font-mono font-bold bg-[#0A66C2] text-white border-2 border-foreground uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]">
                    ✓ Linked
                  </span>
                )}
              </div>

              {linkedinLinked ? (
                <button
                  onClick={handleLinkedInDisconnect}
                  disabled={linkedinLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-background text-red-600 border-2 border-red-600 font-mono font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(220,38,38,0.4)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Link2Off className="w-4 h-4" />
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleLinkedInConnect}
                  disabled={linkedinLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-[#0A66C2] text-white border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:bg-[#004182] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Link2 className="w-4 h-4" />
                  Connect LinkedIn
                </button>
              )}
            </div>

            {/* Auto-post toggle — only visible when LinkedIn is connected */}
            {linkedinLinked && (
              <div className="flex items-center justify-between py-4 px-2">
                <div>
                  <p className="text-sm font-extrabold text-foreground uppercase tracking-tight font-mono">
                    Auto-Post New Blogs
                  </p>
                  <p className="text-xs font-mono text-gray-600 mt-1 uppercase tracking-widest">
                    Automatically share new blogs to LinkedIn when published
                  </p>
                </div>
                <button
                  onClick={handleAutoPostToggle}
                  className="flex items-center gap-2 text-foreground hover:text-[#0A66C2] transition-colors"
                  title={linkedinAutoPost ? "Disable auto-post" : "Enable auto-post"}
                >
                  {linkedinAutoPost ? (
                    <ToggleRight className="w-10 h-10 text-[#0A66C2]" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-400" />
                  )}
                  <span className="text-xs font-mono font-bold uppercase tracking-widest">
                    {linkedinAutoPost ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            )}

            {!linkedinLinked && (
              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest text-center py-2">
                Connect LinkedIn to share blogs and enable auto-posting
              </p>
            )}
          </div>
        </div>

        {/* Support the Community Section */}
        <div className="bg-background border-2 border-foreground p-8 md:p-10 shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] relative overflow-hidden group mb-12">
          {/* Decorative Pattern */}
          <div className="absolute right-0 top-0 bottom-0 w-32 md:w-64 bg-purple-900 opacity-5 flex flex-wrap" style={{backgroundImage: 'radial-gradient(#581c87 2px, transparent 2px)', backgroundSize: '10px 10px'}}></div>
          
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="w-16 h-16 bg-purple-900 border-2 border-foreground flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] group-hover:shadow-none group-hover:translate-x-1 group-hover:translate-y-1 transition-all">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="flex-grow text-center md:text-left">
              <h3 className="text-2xl font-extrabold text-foreground mb-2 uppercase tracking-tight">Support the Community</h3>
              <p className="text-gray-700 font-mono text-xs leading-relaxed max-w-lg">
                Your feedback helps us grow! Share your experience with other creators and tell us what you love about BlogerMenia.
              </p>
            </div>
            <button
              onClick={() => setIsTestimonialModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-900 text-white border-2 border-foreground font-mono font-bold uppercase tracking-widest text-[10px] shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
              Write Testimonial
            </button>
          </div>
        </div>
      </div>

      <TestimonialModal
        isOpen={isTestimonialModalOpen}
        onClose={() => setIsTestimonialModalOpen(false)}
        token={token}
        user={user}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center">
        <div className="flex items-center justify-center gap-3 bg-background px-6 py-4 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
          <span className="h-5 w-5 border-2 border-foreground border-r-transparent animate-spin"></span>
          <span className="font-mono font-bold text-sm uppercase tracking-widest text-foreground">Loading System...</span>
        </div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}
