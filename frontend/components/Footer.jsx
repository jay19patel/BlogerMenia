import Link from "next/link";

import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-background border-t-2 border-foreground mt-auto shadow-[0px_-4px_0px_0px_rgba(13,17,23,1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Brand and Description */}
          <div className="text-center md:text-left">
            <Link href="/" className="inline-block mb-4 group transition-all">
              <span className="bg-purple-900 text-white font-extrabold text-2xl tracking-tight px-4 py-1 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] group-hover:shadow-none group-hover:translate-x-[4px] group-hover:translate-y-[4px] transition-all">
                BlogerMenia
              </span>
            </Link>
            <p className="font-mono text-xs uppercase tracking-widest text-gray-700 max-w-md">
              INIT.CREATE / SHARE / EXPLORE
            </p>
          </div>

          {/* Social Media Icons */}
          <div className="flex items-center space-x-3">
            <a
              href="#"
              className="text-foreground hover:bg-foreground hover:text-background border-2 border-transparent hover:border-foreground p-2 transition-all shadow-[2px_2px_0px_0px_transparent] hover:shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]"
              aria-label="Facebook"
            >
              <Facebook size={18} strokeWidth={2.5} />
            </a>
            <a
              href="#"
              className="text-foreground hover:bg-foreground hover:text-background border-2 border-transparent hover:border-foreground p-2 transition-all shadow-[2px_2px_0px_0px_transparent] hover:shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]"
              aria-label="Twitter"
            >
              <Twitter size={18} strokeWidth={2.5} />
            </a>
            <a
              href="#"
              className="text-foreground hover:bg-foreground hover:text-background border-2 border-transparent hover:border-foreground p-2 transition-all shadow-[2px_2px_0px_0px_transparent] hover:shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]"
              aria-label="Instagram"
            >
              <Instagram size={18} strokeWidth={2.5} />
            </a>
            <a
              href="#"
              className="text-foreground hover:bg-foreground hover:text-background border-2 border-transparent hover:border-foreground p-2 transition-all shadow-[2px_2px_0px_0px_transparent] hover:shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]"
              aria-label="LinkedIn"
            >
              <Linkedin size={18} strokeWidth={2.5} />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t-2 border-foreground">
          <p className="text-center font-mono font-bold text-[10px] uppercase tracking-widest text-foreground">
            © {new Date().getFullYear()} BlogerMenia. SYS.ALL_RIGHTS_RESERVED | 
            <span className="ml-2">DEV: <a href="https://njstudio.com" target="_blank" rel="noopener noreferrer" className="bg-foreground text-background px-1 py-0.5 hover:bg-purple-900 transition-colors">NJTechStudio</a></span>
          </p>
        </div>
      </div>
    </footer>
  );
}
