"use client";

import Link from "next/link";
import Image from "next/image";
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
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center h-full">
            <Image
              src="/BlogerMenia Logo.png"
              alt="BlogerMenia Logo"
              width={200}
              height={50}
              className="h-14 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`transition-colors font-medium ${pathname === "/"
                ? "text-indigo-600 font-semibold"
                : "text-gray-700 hover:text-indigo-600"
                }`}
            >
              Home
            </Link>
            <Link
              href="/blogs"
              className={`transition-colors font-medium ${pathname?.startsWith("/blogs")
                ? "text-indigo-600 font-semibold"
                : "text-gray-700 hover:text-indigo-600"
                }`}
            >
              Blogs
            </Link>
            <Link
              href="/notes"
              className={`transition-colors font-medium ${pathname?.startsWith("/notes")
                ? "text-indigo-600 font-semibold"
                : "text-gray-700 hover:text-indigo-600"
                }`}
            >
              Notes
            </Link>

            {loading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition-colors font-medium"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.profile_image} alt={user?.full_name || user?.username} />
                    <AvatarFallback className="bg-indigo-600 text-white">
                      {user?.full_name?.[0] || user?.username?.[0] || user?.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{user?.full_name || user?.username || "User"}</span>
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.full_name || user?.username}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Profile Settings
                    </Link>
                    {user?.role === "Admin" && (
                      <Link
                        href="/user-list"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        User List
                      </Link>
                    )}
                    <Link
                      href="/my-blogs"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      My Blogs
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
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
                  className="text-gray-700 hover:text-indigo-600 transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button with Sheet */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden text-gray-700">
                <Menu size={24} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-left text-2xl font-bold text-indigo-600">
                  Menu
                </SheetTitle>
              </SheetHeader>

              <div className="mt-8 space-y-2">
                <Link
                  href="/"
                  onClick={() => setIsSheetOpen(false)}
                  className={`block py-3 px-4 rounded-lg transition-colors font-medium ${pathname === "/"
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  Home
                </Link>
                <Link
                  href="/blogs"
                  onClick={() => setIsSheetOpen(false)}
                  className={`block py-3 px-4 rounded-lg transition-colors font-medium ${pathname?.startsWith("/blogs")
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  Blogs
                </Link>
                <Link
                  href="/notes"
                  onClick={() => setIsSheetOpen(false)}
                  className={`block py-3 px-4 rounded-lg transition-colors font-medium ${pathname?.startsWith("/notes")
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  Notes
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
                    <div className="pt-4 pb-4 border-t border-gray-200">
                      <div className="flex items-center gap-3 px-2 pb-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user?.profile_image} alt={user?.full_name || user?.username} />
                          <AvatarFallback className="bg-indigo-600 text-white">
                            {user?.full_name?.[0] || user?.username?.[0] || user?.email?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {user?.full_name || user?.username}
                          </p>
                          <p className="text-sm text-gray-500">{user?.email}</p>
                        </div>
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setIsSheetOpen(false)}
                        className="block py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium mb-2"
                      >
                        Profile Settings
                      </Link>
                      {user?.role === "Admin" && (
                        <Link
                          href="/user-list"
                          onClick={() => setIsSheetOpen(false)}
                          className="block py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium mb-2"
                        >
                          User List
                        </Link>
                      )}
                      <Link
                        href="/my-blogs"
                        onClick={() => setIsSheetOpen(false)}
                        className="block py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium mb-2"
                      >
                        My Blogs
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full py-3 px-4 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium flex items-center gap-2"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="pt-4 space-y-3 border-t border-gray-200">
                    <Link
                      href="/login"
                      onClick={() => setIsSheetOpen(false)}
                      className={`block py-3 px-4 rounded-lg transition-colors font-medium text-center ${pathname === "/login"
                        ? "bg-indigo-50 text-indigo-600 font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                        }`}
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsSheetOpen(false)}
                      className="block py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-center"
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
