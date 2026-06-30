"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { User, Mail, FileText, Save, MessageSquare, Sparkles, Link2, Link2Off, ToggleLeft, ToggleRight } from "lucide-react";
import TestimonialModal from "@/components/TestimonialModal";
import { getImageUrl } from "@/lib/utils";
import Image from "next/image";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const INPUT_CLASS = "w-full px-3 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm placeholder:text-muted-foreground text-foreground";
const INPUT_ICON_CLASS = `${INPUT_CLASS} pl-9`;

function ProfilePageContent() {
  const { user, token, updateProfile, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [linkedinLinked, setLinkedinLinked] = useState(false);
  const [linkedinAutoPost, setLinkedinAutoPost] = useState(false);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [formData, setFormData] = useState({ full_name: "", headline: "", bio: "", profile_image: "" });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
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
        setFormData({ full_name: user.full_name || "", headline: user.headline || "", bio: user.bio || "", profile_image: user.profile_image || "" });
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const linkedin = searchParams.get("linkedin");
    if (!linkedin) return;
    const messages = {
      connected: ["LinkedIn connected successfully!", "success"],
      denied: ["LinkedIn connection was cancelled.", "info"],
      already_linked: ["This LinkedIn account is already linked.", "error"],
      invalid_state: ["Invalid OAuth state. Please try again.", "error"],
      token_failed: ["Could not get LinkedIn token.", "error"],
      profile_failed: ["Could not fetch LinkedIn profile.", "error"],
      error: ["LinkedIn connection failed.", "error"],
    };
    const [message, type] = messages[linkedin] || ["LinkedIn: unknown response", "info"];
    toast[type](message);
    const url = new URL(window.location.href);
    url.searchParams.delete("linkedin");
    window.history.replaceState({}, "", url.toString());
  }, [searchParams]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image size should be less than 2MB"); return; }
    if (!file.type.startsWith('image/')) { toast.error("Please select an image file"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setFormData((prev) => ({ ...prev, profile_image: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleLinkedInConnect = () => { window.location.href = "/api/linkedin/connect"; };

  const handleLinkedInDisconnect = async () => {
    if (!confirm("Disconnect LinkedIn? Auto-posting will be disabled.")) return;
    setLinkedinLoading(true);
    try {
      const res = await fetch("/api/linkedin/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setLinkedinLinked(false);
      setLinkedinAutoPost(false);
      toast.success("LinkedIn disconnected");
    } catch { toast.error("Failed to disconnect LinkedIn"); }
    finally { setLinkedinLoading(false); }
  };

  const handleAutoPostToggle = async () => {
    const next = !linkedinAutoPost;
    setLinkedinAutoPost(next);
    try {
      const res = await fetch("/api/linkedin/auto-post", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auto_post: next }) });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(next ? "Auto-post to LinkedIn enabled" : "Auto-post to LinkedIn disabled");
    } catch { setLinkedinAutoPost(!next); toast.error("Failed to update auto-post setting"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData = {};
      let hasChanges = false;
      if (formData.full_name !== (user?.full_name || "")) { updateData.full_name = formData.full_name; hasChanges = true; }
      if (formData.headline !== (user?.headline || "")) { updateData.headline = formData.headline; hasChanges = true; }
      if (formData.bio !== (user?.bio || "")) { updateData.bio = formData.bio; hasChanges = true; }
      if (imageFile) {
        try {
          const uploadRes = await api.uploadImage(imageFile, 'users', token);
          if (uploadRes && (uploadRes.url || uploadRes.file_path)) { updateData.profile_image = uploadRes.url || uploadRes.file_path; hasChanges = true; }
          else throw new Error("No URL returned");
        } catch (uploadError) { toast.error("Failed to upload profile picture."); setLoading(false); return; }
      }
      if (!hasChanges) { toast.info("No changes to update"); setLoading(false); return; }
      await api.updateUserProfile(token, updateData);
      if (updateProfile) await updateProfile(updateData);
      toast.success("Profile updated successfully!");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error(error.message || "Failed to update profile");
    } finally { setLoading(false); }
  };

  if (authLoading || !isAuthenticated || (isAuthenticated && !user)) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="bg-muted rounded-md px-6 py-3 text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-1">Profile Settings</h1>
          <p className="text-muted-foreground text-sm">Update your public profile information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-8 shadow-sm">
          <div className="p-7 md:p-9">
            {/* Avatar Section */}
            <div className="mb-8 pb-7 border-b border-border">
              <label className="block text-sm font-medium text-foreground mb-4">Profile Picture</label>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative size-28 rounded-full ring-2 ring-primary/20 overflow-hidden shrink-0 bg-muted">
                  {formData.profile_image ? (
                    <Image src={getImageUrl(formData.profile_image)} alt={user?.full_name || user?.email} fill sizes="112px" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary rounded-full">
                      <span className="font-bold text-3xl">{user?.full_name?.[0] || user?.email?.[0] || "U"}</span>
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-left">
                  <p className="font-semibold text-foreground text-lg mb-1">{formData.full_name || "Your Name"}</p>
                  <p className="text-muted-foreground text-xs mb-4">Square JPG/PNG, max 2MB</p>
                  <label htmlFor="profile-image-input" className="inline-flex items-center px-4 py-2 bg-background border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">
                    Change Photo
                  </label>
                  <input id="profile-image-input" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <input id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleInputChange} className={INPUT_ICON_CLASS} placeholder="Your full name" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5 ml-1">locked</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <input type="email" value={user?.email || ""} disabled className={`${INPUT_ICON_CLASS} opacity-60 cursor-not-allowed`} />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="headline" className="block text-sm font-medium text-foreground mb-1.5">Headline</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                  <input id="headline" name="headline" type="text" maxLength={255} value={formData.headline} onChange={handleInputChange} className={INPUT_ICON_CLASS} placeholder="e.g. Creative Writer | Tech Enthusiast" />
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
                <textarea id="bio" name="bio" rows={4} value={formData.bio} onChange={handleInputChange} className={`${INPUT_CLASS} resize-none`} placeholder="Share a bit about yourself..." />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={loading} loading={loading}>
                  <Save className="size-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* LinkedIn Section */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-8 shadow-sm">
          <div className="p-7 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-[#0A66C2] rounded-lg flex items-center justify-center shrink-0">
                  <svg className="size-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-base">LinkedIn Integration</h3>
                  <p className="text-muted-foreground text-sm">{linkedinLinked ? "Account connected" : "Connect to enable sharing"}</p>
                </div>
                {linkedinLinked && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full px-2.5 py-0.5">Connected</span>
                )}
              </div>
              {linkedinLinked ? (
                <Button variant="outline" size="sm" onClick={handleLinkedInDisconnect} disabled={linkedinLoading} className="text-destructive border-destructive/50 hover:bg-destructive/5">
                  <Link2Off className="size-4" />Disconnect
                </Button>
              ) : (
                <button onClick={handleLinkedInConnect} disabled={linkedinLoading} className="flex items-center gap-2 px-4 py-2 bg-[#0A66C2] text-white rounded-md text-sm font-medium hover:bg-[#004182] transition-colors disabled:opacity-50">
                  <Link2 className="size-4" />Connect LinkedIn
                </button>
              )}
            </div>

            {linkedinLinked && (
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-Post New Blogs</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Automatically share new blogs to LinkedIn when published</p>
                </div>
                <button onClick={handleAutoPostToggle} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors" title={linkedinAutoPost ? "Disable auto-post" : "Enable auto-post"}>
                  {linkedinAutoPost ? <ToggleRight className="size-9 text-[#0A66C2]" /> : <ToggleLeft className="size-9 text-muted-foreground" />}
                  <span className="text-xs font-medium">{linkedinAutoPost ? "On" : "Off"}</span>
                </button>
              </div>
            )}

            {!linkedinLinked && (
              <p className="text-xs text-muted-foreground text-center py-1">Connect LinkedIn to share blogs and enable auto-posting</p>
            )}
          </div>
        </div>

        {/* Community Section */}
        <div className="bg-card border border-border rounded-xl p-7 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-primary/10 text-primary rounded-xl p-4 shrink-0">
              <Sparkles className="size-7" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-semibold text-foreground mb-1">Support the Community</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
                Your feedback helps us grow! Share your experience with other creators.
              </p>
            </div>
            <Button variant="outline" onClick={() => setIsTestimonialModalOpen(true)} className="shrink-0">
              <MessageSquare className="size-4" />Write Testimonial
            </Button>
          </div>
        </div>
      </div>

      <TestimonialModal isOpen={isTestimonialModalOpen} onClose={() => setIsTestimonialModalOpen(false)} token={token} user={user} />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center">
        <div className="bg-muted rounded-md px-6 py-3 text-muted-foreground text-sm">Loading...</div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}
