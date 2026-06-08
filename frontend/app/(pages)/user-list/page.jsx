"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Users, Eye, UserCheck, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { getImageUrl } from "@/lib/utils";

export default function UserListPage() {
  const { user, token, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (user?.role !== "Admin") {
      router.push("/");
      return;
    }

    fetchAllUsers();
  }, [isAuthenticated, user, router, authLoading]);

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

  if (authLoading || !isAuthenticated || user?.role !== "Admin") {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-foreground hover:text-purple-900 mb-6 font-mono font-bold uppercase tracking-widest text-xs hover:translate-x-[-2px] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO PROFILE
          </Link>
          <div className="mb-10 text-center lg:text-left border-b-2 border-foreground pb-6">
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3 tracking-tight uppercase flex items-center gap-3 justify-center lg:justify-start">
              <span className="p-2 border-2 border-foreground bg-purple-900 text-white shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
                <Users className="w-8 h-8" />
              </span>
              SYSTEM.USERS
            </h1>
            <p className="font-mono text-sm uppercase tracking-widest text-gray-600">
              Manage all users in the system
            </p>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 font-mono">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-foreground mx-auto mb-4" />
              <p className="text-foreground font-mono text-lg font-bold uppercase tracking-widest">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-900 border-b-2 border-foreground text-background font-mono">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y-2 divide-foreground">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-purple-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 rounded-none border border-foreground shrink-0">
                            <AvatarImage src={getImageUrl(u.profile_image)} className="rounded-none" />
                            <AvatarFallback className="bg-foreground text-background rounded-none font-bold">
                              {u.full_name?.[0] || u.email?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-bold text-foreground">
                              {u.full_name || u.email.split('@')[0]}
                              {u.is_active ? (
                                <span className="ml-2 text-xs text-green-600 font-mono font-bold uppercase">[Active]</span>
                              ) : (
                                <span className="ml-2 text-xs text-gray-500 font-mono font-bold uppercase">[Inactive]</span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground font-mono">{u.email}</div>
                        {u.is_google_user && (
                          <div className="text-[10px] font-mono font-bold text-purple-900 uppercase">Google Auth</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-[10px] font-mono font-bold border-2 border-foreground uppercase tracking-widest inline-block ${u.role === 'Admin'
                            ? 'bg-purple-900 text-white'
                            : 'bg-foreground text-background'
                          }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => u.is_active ? handleDeactivateUser(u.id) : handleActivateUser(u.id)}
                          disabled={processingIds.has(u.id)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 border-2 border-foreground font-mono font-bold text-[10px] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${u.is_active
                              ? 'bg-green-400 text-foreground'
                              : 'bg-background text-foreground'
                            }`}
                        >
                          {u.is_active ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>
                                {processingIds.has(u.id) ? '...' : 'Active'}
                              </span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>
                                {processingIds.has(u.id) ? '...' : 'Inactive'}
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
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
