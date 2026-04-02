"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Camera, User, Mail, FileText, Save, MessageSquare, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TestimonialModal from "@/components/TestimonialModal";
import { getImageUrl } from "@/lib/utils";

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

    setFormData({
      full_name: user.full_name || "",
      headline: user.headline || "",
      bio: user.bio || "",
      profile_image: user.profile_image || user.profile_image_url || "",
    });
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
          if (uploadRes && uploadRes.id) {
            updateData.profile_image = uploadRes.id;
            hasChanges = true;
          } else {
            throw new Error("No ID returned from image upload");
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
        await updateProfile();
      }

      toast.success("Profile updated successfully!");

      // Reload mainly to refresh context/UI fully if needed
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
    <div className="min-h-[calc(100vh-4rem)] py-12 bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center lg:text-left">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Account Settings</h1>
          <p className="text-gray-600 text-lg">
            Personalize your presence on BlogerMenia
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden mb-10">
          <div className="p-8 md:p-12">
            {/* Profile Image Section */}
            <div className="mb-12">
              <label className="block text-sm font-bold text-gray-700 mb-6 uppercase tracking-wider">
                Profile Display
              </label>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                  <Avatar className="w-32 h-32 border-4 border-white shadow-xl relative z-10">
                    <AvatarImage src={getImageUrl(formData.profile_image)} alt={user?.full_name || user?.email} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-3xl font-bold">
                      {user?.full_name?.[0] || user?.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="profile-image-input"
                    className="absolute bottom-1 right-1 w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-all shadow-lg hover:rotate-12 relative z-20"
                  >
                    <Camera className="w-5 h-5" />
                  </label>
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{formData.full_name || "New Explorer"}</h3>
                  <p className="text-sm text-gray-500 mb-4 max-w-xs">
                    Recommended: Square JPG/PNG, at least 400x400px.
                  </p>
                  <label
                    htmlFor="profile-image-input"
                    className="inline-flex items-center px-6 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-white hover:border-indigo-600 hover:text-indigo-600 transition-all cursor-pointer"
                  >
                    Upload New Image
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
                  <label htmlFor="full_name" className="block text-sm font-bold text-gray-700 mb-3 ml-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-gray-900"
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-gray-400 mb-3 ml-1">
                    Email Address <span className="text-[10px] font-bold text-gray-300 uppercase ml-2 tracking-widest">(Locked)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300 w-5 h-5" />
                    <input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-gray-400 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Headline */}
              <div>
                <label htmlFor="headline" className="block text-sm font-bold text-gray-700 mb-3 ml-1 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                  Headline
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="headline"
                    name="headline"
                    type="text"
                    maxLength={255}
                    value={formData.headline}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-gray-900"
                    placeholder="e.g. Creative Writer | Tech Enthusiast"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-bold text-gray-700 mb-3 ml-1">
                  Your Story (Bio)
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all resize-none font-medium text-gray-900"
                  placeholder="Share a bit about yourself..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-8 py-3.5 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-10 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
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
        <div className="bg-white rounded-2xl p-8 md:p-10 border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
              <Sparkles className="w-10 h-10 text-indigo-600" />
            </div>
            <div className="flex-grow text-center md:text-left">
              <h3 className="text-2xl font-black text-gray-900 mb-2">Support the Community</h3>
              <p className="text-gray-600 leading-relaxed font-medium">
                Your feedback helps us grow! Share your experience with other creators and tell us what you love about BlogerMenia.
              </p>
            </div>
            <button
              onClick={() => setIsTestimonialModalOpen(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-200 transition-all shrink-0 active:scale-95"
            >
              <MessageSquare className="w-5 h-5" />
              Write a Testimonial
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

