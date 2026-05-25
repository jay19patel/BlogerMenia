"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Camera, User, Mail, FileText, Save, MessageSquare, Sparkles } from "lucide-react";
import TestimonialModal from "@/components/TestimonialModal";
import { getImageUrl } from "@/lib/utils";
import Image from "next/image";

export default function ProfilePage() {
  const { user, token, updateProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    headline: "",
    bio: "",
    profile_image: "",
  });

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
