"use client";

import Link from "next/link";

import { Menu, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getImageUrl } from "@/lib/utils";

export default function Navbar() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, isAuthenticated, logout, loading } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    toast.success("Successfully logged out!");
    setShowUserMenu(false);
    setIsSheetOpen(false);
  };

  return (
    <nav className="bg-background border-b-2 border-foreground sticky top-0 z-50 shadow-[0px_4px_0px_0px_rgba(13,17,23,1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center h-full group transition-all">
            <span className="bg-purple-900 text-white font-extrabold text-xl tracking-tight px-3 py-1 border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all">
              BlogerMenia
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`transition-all duration-200 font-mono text-xs uppercase tracking-widest font-bold px-3 py-1 ${pathname === "/"
                ? "bg-foreground text-background"
                : "text-foreground hover:bg-gray-100"
                }`}
            >
              Home
            </Link>
            <Link
              href="/blogs"
              className={`transition-all duration-200 font-mono text-xs uppercase tracking-widest font-bold px-3 py-1 ${pathname?.startsWith("/blogs")
                ? "bg-foreground text-background"
                : "text-foreground hover:bg-gray-100"
                }`}
            >
              Blogs
            </Link>
            <Link
              href="/playlists"
              className={`transition-all duration-200 font-mono text-xs uppercase tracking-widest font-bold px-3 py-1 ${pathname?.startsWith("/playlists")
                ? "bg-foreground text-background"
                : "text-foreground hover:bg-gray-100"
                }`}
            >
              Tracks
            </Link>
            <Link
              href="/creators"
              className={`transition-all duration-200 font-mono text-xs uppercase tracking-widest font-bold px-3 py-1 ${pathname?.startsWith("/creators")
                ? "bg-foreground text-background"
                : "text-foreground hover:bg-gray-100"
                }`}
            >
              Architects
            </Link>
            <Link
              href="/contact"
              className={`transition-all duration-200 font-mono text-xs uppercase tracking-widest font-bold px-3 py-1 ${pathname === "/contact"
                ? "bg-foreground text-background"
                : "text-foreground hover:bg-gray-100"
                }`}
            >
              Contact
            </Link>

            {loading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16 bg-gray-200" />
                <Skeleton className="h-9 w-24 bg-gray-200" />
              </div>
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-foreground hover:bg-gray-100 px-3 py-1 font-mono font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  <Avatar className="w-6 h-6 rounded-none border border-foreground">
                    <AvatarImage src={getImageUrl(user?.profile_image)} alt={user?.full_name || user?.username} />
                    <AvatarFallback className="bg-foreground text-background rounded-none">
                      {user?.full_name?.[0] || user?.username?.[0] || user?.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{user?.full_name || user?.username || "User"}</span>
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-background border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] py-2">
                    <div className="px-4 py-2 border-b-2 border-foreground mb-2">
                      <p className="text-xs font-mono font-bold uppercase text-foreground">
                        {user?.full_name || user?.username}
                      </p>
                      <p className="text-[10px] font-mono text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest text-foreground hover:bg-gray-100 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Profile Settings
                    </Link>
                    {user?.role === "Admin" && (
                      <Link
                        href="/user-list"
                        className="block px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest text-foreground hover:bg-gray-100 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        User List
                      </Link>
                    )}
                    <Link
                      href="/my-blogs"
                      className="block px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest text-foreground hover:bg-gray-100 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      My Blogs
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest text-foreground hover:bg-gray-100 flex items-center gap-2 mt-2 border-t-2 border-foreground pt-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="font-mono text-xs uppercase tracking-widest font-bold text-foreground hover:bg-gray-100 px-4 py-1.5 border-2 border-foreground transition-colors shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="font-mono text-xs uppercase tracking-widest font-bold bg-foreground text-background px-4 py-1.5 border-2 border-foreground transition-colors hover:bg-gray-800 shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button with Sheet */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden text-foreground border-2 border-foreground p-1 shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all">
                <Menu size={24} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-background border-l-2 border-foreground">
              <SheetHeader>
                <SheetTitle className="text-left text-2xl font-extrabold text-foreground uppercase tracking-tight">
                  Menu
                </SheetTitle>
              </SheetHeader>

              <div className="mt-8 space-y-2">
                <Link
                  href="/"
                  onClick={() => setIsSheetOpen(false)}
                  className={`block py-3 px-4 font-mono font-bold uppercase tracking-widest text-xs transition-colors border-2 ${pathname === "/"
                    ? "bg-foreground text-background border-foreground"
                    : "text-foreground border-transparent hover:border-foreground"
                    }`}
                >
                  Home
                </Link>
                <Link
                  href="/blogs"
                  onClick={() => setIsSheetOpen(false)}
                  className={`block py-3 px-4 font-mono font-bold uppercase tracking-widest text-xs transition-colors border-2 ${pathname?.startsWith("/blogs")
                    ? "bg-foreground text-background border-foreground"
                    : "text-foreground border-transparent hover:border-foreground"
                    }`}
                >
                  Blogs
                </Link>
                <Link
                  href="/playlists"
                  onClick={() => setIsSheetOpen(false)}
                  className={`block py-3 px-4 font-mono font-bold uppercase tracking-widest text-xs transition-colors border-2 ${pathname?.startsWith("/playlists")
                    ? "bg-foreground text-background border-foreground"
                    : "text-foreground border-transparent hover:border-foreground"
                    }`}
                >
                  Tracks
                </Link>
                <Link
                  href="/creators"
                  onClick={() => setIsSheetOpen(false)}
                  className={`block py-3 px-4 font-mono font-bold uppercase tracking-widest text-xs transition-colors border-2 ${pathname?.startsWith("/creators")
                    ? "bg-foreground text-background border-foreground"
                    : "text-foreground border-transparent hover:border-foreground"
                    }`}
                >
                  Architects
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setIsSheetOpen(false)}
                  className={`block py-3 px-4 font-mono font-bold uppercase tracking-widest text-xs transition-colors border-2 ${pathname === "/contact"
                    ? "bg-foreground text-background border-foreground"
                    : "text-foreground border-transparent hover:border-foreground"
                    }`}
                >
                  Contact
                </Link>

                {loading ? (
                  <div className="pt-4 space-y-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 px-2">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  </div>
                ) : isAuthenticated ? (
                  <>
                    <div className="pt-4 pb-4 border-t-2 border-foreground mt-4">
                      <div className="flex items-center gap-3 px-2 pb-4">
                        <Avatar className="w-12 h-12 rounded-none border-2 border-foreground">
                          <AvatarImage src={getImageUrl(user?.profile_image)} alt={user?.full_name || user?.username} />
                          <AvatarFallback className="bg-foreground text-background rounded-none font-bold">
                            {user?.full_name?.[0] || user?.username?.[0] || user?.email?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-extrabold text-foreground uppercase tracking-tight">
                            {user?.full_name || user?.username}
                          </p>
                          <p className="text-xs font-mono text-gray-500">{user?.email}</p>
                        </div>
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setIsSheetOpen(false)}
                        className="block py-3 px-4 text-xs font-mono font-bold uppercase tracking-widest text-foreground hover:bg-gray-100 transition-colors mb-2 border-2 border-transparent hover:border-foreground"
                      >
                        Profile Settings
                      </Link>
                      {user?.role === "Admin" && (
                        <Link
                          href="/user-list"
                          onClick={() => setIsSheetOpen(false)}
                          className="block py-3 px-4 text-xs font-mono font-bold uppercase tracking-widest text-foreground hover:bg-gray-100 transition-colors mb-2 border-2 border-transparent hover:border-foreground"
                        >
                          User List
                        </Link>
                      )}
                      <Link
                        href="/my-blogs"
                        onClick={() => setIsSheetOpen(false)}
                        className="block py-3 px-4 text-xs font-mono font-bold uppercase tracking-widest text-foreground hover:bg-gray-100 transition-colors mb-2 border-2 border-transparent hover:border-foreground"
                      >
                        My Blogs
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full py-3 px-4 text-left text-xs font-mono font-bold uppercase tracking-widest text-foreground hover:bg-gray-100 transition-colors flex items-center gap-2 border-2 border-transparent hover:border-foreground"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="pt-4 space-y-3 border-t-2 border-foreground mt-4">
                    <Link
                      href="/login"
                      onClick={() => setIsSheetOpen(false)}
                      className={`block py-3 px-4 font-mono font-bold uppercase tracking-widest text-xs text-center border-2 transition-colors ${pathname === "/login"
                        ? "bg-foreground text-background border-foreground"
                        : "text-foreground border-foreground hover:bg-gray-100"
                        }`}
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsSheetOpen(false)}
                      className="block py-3 px-4 bg-foreground text-background font-mono font-bold uppercase tracking-widest text-xs text-center border-2 border-foreground hover:bg-gray-800 transition-colors"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
