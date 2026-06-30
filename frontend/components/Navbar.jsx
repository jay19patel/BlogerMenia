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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home", match: (p) => p === "/" },
  { href: "/blogs", label: "Blogs", match: (p) => p?.startsWith("/blogs") },
  { href: "/playlists", label: "Playlists", match: (p) => p?.startsWith("/playlists") },
  { href: "/creators", label: "Creators", match: (p) => p?.startsWith("/creators") },
  { href: "/contact", label: "Contact", match: (p) => p === "/contact" },
];

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
    <nav className="bg-background/90 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="bg-primary text-primary-foreground font-bold text-base px-3 py-1 rounded-md">
              BlogerMenia
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, match }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  match(pathname)
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-sm text-foreground hover:bg-muted px-2 py-1.5 rounded-md transition-colors"
                >
                  <Avatar className="size-7">
                    <AvatarImage src={getImageUrl(user?.profile_image)} alt={user?.full_name || user?.username} />
                    <AvatarFallback>
                      {user?.full_name?.[0] || user?.username?.[0] || user?.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user?.full_name || user?.username || "User"}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                    <div className="px-3 py-2 mb-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user?.full_name || user?.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <Separator />
                    <Link
                      href="/my-blogs"
                      className="block px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      My Blogs
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Profile Settings
                    </Link>
                    {user?.role === "Admin" && (
                      <Link
                        href="/user-list"
                        className="block px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        User List
                      </Link>
                    )}
                    <Separator />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="size-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden text-foreground p-2 rounded-md hover:bg-muted transition-colors">
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-70 sm:w-80">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <span className="bg-primary text-primary-foreground font-bold text-sm px-2.5 py-1 rounded-md">
                    BlogerMenia
                  </span>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 flex flex-col gap-1">
                {NAV_LINKS.map(({ href, label, match }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsSheetOpen(false)}
                    className={cn(
                      "px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      match(pathname)
                        ? "text-foreground bg-muted"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    {label}
                  </Link>
                ))}

                <Separator className="my-2" />

                {loading ? (
                  <div className="space-y-2 px-1">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Avatar className="size-9">
                        <AvatarImage src={getImageUrl(user?.profile_image)} alt={user?.full_name || user?.username} />
                        <AvatarFallback>
                          {user?.full_name?.[0] || user?.username?.[0] || user?.email?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user?.full_name || user?.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                    <Separator className="my-1" />
                    <Link
                      href="/my-blogs"
                      onClick={() => setIsSheetOpen(false)}
                      className="px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      My Blogs
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setIsSheetOpen(false)}
                      className="px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      Profile Settings
                    </Link>
                    {user?.role === "Admin" && (
                      <Link
                        href="/user-list"
                        onClick={() => setIsSheetOpen(false)}
                        className="px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        User List
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full text-left"
                    >
                      <LogOut className="size-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" asChild onClick={() => setIsSheetOpen(false)}>
                      <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild onClick={() => setIsSheetOpen(false)}>
                      <Link href="/register">Get Started</Link>
                    </Button>
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
