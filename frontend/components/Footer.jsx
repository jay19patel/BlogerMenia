import Link from "next/link";
import Image from "next/image";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand and Description */}
          <div className="text-center md:text-left">
            <Link href="/" className="inline-block mb-2">
              <Image
                src="/BlogerMenia Logo.png"
                alt="BlogerMenia Logo"
                width={220}
                height={60}
                className="h-14 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-gray-600 max-w-md">
              Create, share, and explore amazing blogs. Join our community of writers and readers today.
            </p>
          </div>

          {/* Social Media Icons */}
          <div className="flex items-center space-x-4">
            <a
              href="#"
              className="text-gray-400 hover:text-indigo-600 transition-colors"
              aria-label="Facebook"
            >
              <Facebook size={20} />
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-indigo-600 transition-colors"
              aria-label="Twitter"
            >
              <Twitter size={20} />
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-indigo-600 transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={20} />
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-indigo-600 transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin size={20} />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-600 text-xs">
            © {new Date().getFullYear()} <span className="font-bold"><span className="text-purple-600">B</span>loger<span className="text-purple-600">M</span>enia</span>. All rights reserved. | 
            <span className="font-bold ml-2">Developed by <a href="https://njstudio.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 transition-colors">NJTechStudio</a></span>
          </p>
        </div>
      </div>
    </footer>
  );
}
