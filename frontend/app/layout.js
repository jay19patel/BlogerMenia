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
        <AuthProvider>
          <GridBackground>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </GridBackground>
          <Toaster position="top-center" richColors expand={true} />
        </AuthProvider>
      </body>
    </html>
  );
}
