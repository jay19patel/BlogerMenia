import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GridBackground from "@/components/GridBackground";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import QueryProvider from "@/components/QueryProvider";
import NextAuthProvider from "@/components/NextAuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "BlogerMenia - Create, Share, and Explore Amazing Blogs",
  description: "Join our community of writers and readers. Create, share, and explore amazing blogs on BlogerMenia.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <NextAuthProvider>
          <QueryProvider>
            <AuthProvider>
              <GridBackground>
                <Navbar />
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
              </GridBackground>
              <Toaster 
                position="bottom-right" 
                toastOptions={{
                  className: 'bg-background border-2 border-foreground text-foreground font-mono font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] rounded-none !p-4',
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
