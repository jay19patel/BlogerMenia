import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-block mb-3">
              <span className="bg-primary text-primary-foreground font-bold text-base px-3 py-1 rounded-md">
                BlogerMenia
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Create · Share · Explore
            </p>
          </div>

          {/* Nav Links */}
          <div className="flex flex-wrap gap-6">
            <Link href="/blogs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Blogs
            </Link>
            <Link href="/playlists" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Playlists
            </Link>
            <Link href="/creators" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Creators
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-2">
            <a href="#" className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-colors" aria-label="Facebook">
              <Facebook size={16} />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-colors" aria-label="Twitter">
              <Twitter size={16} />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-colors" aria-label="Instagram">
              <Instagram size={16} />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-colors" aria-label="LinkedIn">
              <Linkedin size={16} />
            </a>
          </div>
        </div>

        <Separator className="my-6" />

        <p className="text-center text-muted-foreground text-xs">
          © {new Date().getFullYear()} BlogerMenia. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
