"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Camera, User, Mail, FileText, Save } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfilePage() {
  const { user, token, updateProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    headline: "",
    description: "",
    profile_image: "",
  });

  useEffect(() => {
    if (!user) return;
    
    setFormData({
      full_name: user.full_name || "",
      username: user.username || "",
      headline: user.headline || "",
      description: user.description || "",
      profile_image: user.profile_image || "",
    });
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size should be less than 2MB");
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
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
      // Prepare data - convert empty strings to null
      const updateData = {};
      
      // Only send fields that have changed
      if (formData.full_name !== (user?.full_name || "")) {
        updateData.full_name = formData.full_name || null;
      }
      
      if (formData.username !== (user?.username || "")) {
        updateData.username = formData.username || null;
      }
      
      if (formData.headline !== (user?.headline || "")) {
        updateData.headline = formData.headline || null;
      }
      
      if (formData.description !== (user?.description || "")) {
        updateData.description = formData.description || null;
      }
      
      // Only include profile_image if it's actually changed
      if (formData.profile_image && formData.profile_image !== user?.profile_image) {
        updateData.profile_image = formData.profile_image;
      }
      
      // Only send if there are changes
      if (Object.keys(updateData).length === 0) {
        toast.info("No changes to update");
        setLoading(false);
        return;
      }
      
      console.log("Sending update data:", updateData);
      const result = await api.updateUserProfile(token, updateData);
      if (updateProfile) {
        await updateProfile();
      }
      
      // Show success toast
      toast.success("Profile updated successfully!", {
        duration: 2000,
      });
      
      // Reload the page after showing toast
      setTimeout(() => {
        window.location.reload();
      }, 2100); // Slightly longer than toast duration
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-600">
            Manage your profile information and appearance
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Profile Image Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Profile Picture
            </label>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={formData.profile_image} alt={user?.username} />
                  <AvatarFallback className="bg-indigo-600 text-white text-2xl">
                    {user?.full_name?.[0] || user?.username?.[0] || user?.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="profile-image-input"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </label>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Click the camera icon to upload a new profile picture
                </p>
                <label
                  htmlFor="profile-image-input"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Change Photo
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  minLength={3}
                  maxLength={100}
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="Enter your username"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Must be alphanumeric with optional _ or -
              </p>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Email cannot be changed
              </p>
            </div>

            {/* Headline */}
            <div>
              <label
                htmlFor="headline"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Headline
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  id="headline"
                  name="headline"
                  type="text"
                  maxLength={255}
                  value={formData.headline}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="e.g., Frontend Developer at Tech Company"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                A short, punchy description of yourself (max 255 characters)
              </p>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Bio / Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none"
                placeholder="Tell us about yourself..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Share a bit about yourself, your interests, or what you do
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

