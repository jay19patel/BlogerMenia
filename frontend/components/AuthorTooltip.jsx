'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Mail, Calendar, FileText, MapPin, Briefcase } from 'lucide-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { getImageUrl } from '@/lib/utils';

export default function AuthorTooltip({ userId, children }) {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [error, setError] = useState(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const fetchUserInfo = async () => {
    if (!userId || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const user = await api.getUserById(userId);
      setUserInfo(user);
    } catch (err) {
      console.error('Error fetching user info:', err);
      setError('Failed to load user information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
      if (!userInfo && !isLoading) {
        fetchUserInfo();
      }
    }, 300); // Small delay to prevent flickering
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 w-80 p-4 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            top: '100%'
          }}
        >
          {/* Arrow pointing up */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 rotate-45"></div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          ) : userInfo ? (
            <div className="space-y-3">
              {/* Header with profile image and name */}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                  {userInfo.profile_image ? (
                    <img
                      src={getImageUrl(userInfo.profile_image)}
                      alt={userInfo.full_name || userInfo.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate">
                    {userInfo.full_name || userInfo.username}
                  </h3>
                  {userInfo.headline && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {userInfo.headline}
                    </p>
                  )}
                </div>
              </div>

              {/* User details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{userInfo.email}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Joined {formatDate(userInfo.created_at)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span>{userInfo.blog_count} blog{userInfo.blog_count !== 1 ? 's' : ''} published</span>
                </div>

                {/* Role */}
                {(userInfo.role === 'Admin' || userInfo.is_staff) && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <Briefcase className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">Administrator</span>
                  </div>
                )}
              </div>

              {/* Description (Bio) */}
              {(userInfo.bio || userInfo.description) && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                    {userInfo.bio || userInfo.description}
                  </p>
                </div>
              )}

              {/* View Profile Button (button to avoid nested anchors inside Link parents) */}
              <div
                className="block mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => router.push(`/blogs/${userInfo.username}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-lg hover:from-indigo-600 hover:to-violet-600 transition-all duration-300 text-sm font-medium"
                >
                  View Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">User information not available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
