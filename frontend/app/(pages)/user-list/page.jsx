"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Users, Eye, UserCheck, ArrowLeft, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

export default function UserListPage() {
  const { user, token, isAuthenticated } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (user?.role !== "Admin") {
      router.push("/");
      return;
    }

    fetchAllUsers();
  }, [isAuthenticated, user, router]);

  const fetchAllUsers = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const usersData = await api.getAllUsers(token);
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateUser = async (userId) => {
    if (!token) return;
    
    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await api.activateUser(token, userId);
      toast.success("User activated successfully");
      await fetchAllUsers(); // Refresh the list
    } catch (error) {
      console.error("Error activating user:", error);
      toast.error(error.message || "Failed to activate user");
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!token) return;
    
    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await api.deactivateUser(token, userId);
      toast.success("User deactivated successfully");
      await fetchAllUsers(); // Refresh the list
    } catch (error) {
      console.error("Error deactivating user:", error);
      toast.error(error.message || "Failed to deactivate user");
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User List</h1>
              <p className="text-gray-600">
                Manage all users in the system
              </p>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={u.profile_image} />
                            <AvatarFallback className="bg-indigo-100 text-indigo-600">
                              {u.full_name?.[0] || u.username?.[0] || u.email?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {u.full_name || u.username}
                              {u.is_active ? (
                                <span className="ml-2 text-xs text-green-600 font-medium">(Active)</span>
                              ) : (
                                <span className="ml-2 text-xs text-gray-500 font-medium">(Inactive)</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{u.email}</div>
                        {u.is_google_user && (
                          <div className="text-xs text-indigo-600">Google Account</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          u.role === 'Admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => u.is_active ? handleDeactivateUser(u.id) : handleActivateUser(u.id)}
                          disabled={processingIds.has(u.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            u.is_active 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 active:bg-green-300' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                          }`}
                        >
                          {u.is_active ? (
                            <>
                              <Eye className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {processingIds.has(u.id) ? 'Processing...' : 'Active'}
                              </span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {processingIds.has(u.id) ? 'Processing...' : 'Inactive'}
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(u.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

