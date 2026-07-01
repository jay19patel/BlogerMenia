"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Shield, ShieldAlert, Mail, User, Activity, ToggleLeft, ToggleRight, Trash2, Users, Eye, UserCheck, ArrowLeft } from "lucide-react";
import LoaderCard from "@/components/ui/loader";
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
      <div className="flex items-center justify-center min-h-[80vh]">
        <LoaderCard message="Loading admin panel..." />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-5">
            <ArrowLeft className="size-4" />Back to Profile
          </Link>
          <div className="mb-8 pb-6 border-b border-border">
            <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
              <span className="bg-primary/10 text-primary rounded-lg p-2"><Users className="size-6" /></span>
              User Management
            </h1>
            <p className="text-muted-foreground text-sm">Manage all users in the system</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 flex justify-center">
              <LoaderCard message="Loading users..." />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="size-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 shrink-0">
                            <AvatarImage src={getImageUrl(u.profile_image)} />
                            <AvatarFallback>{u.full_name?.[0] || u.email?.[0] || "U"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">
                              {u.full_name || u.email.split('@')[0]}
                            </div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-muted-foreground">{u.email}</div>
                        {u.is_google_user && (
                          <div className="text-xs text-primary mt-0.5">Google Auth</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.role === 'Admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => u.is_active ? handleDeactivateUser(u.id) : handleActivateUser(u.id)}
                          disabled={processingIds.has(u.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${u.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                        >
                          {u.is_active ? (
                            <><Eye className="size-3" />{processingIds.has(u.id) ? '…' : 'Active'}</>
                          ) : (
                            <><UserCheck className="size-3" />{processingIds.has(u.id) ? '…' : 'Inactive'}</>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
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
