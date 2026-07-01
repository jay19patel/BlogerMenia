"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import LoaderCard from "@/components/ui/loader";
import { Mail, Lock, Eye, EyeOff, BookOpen, Users, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ContactAdmin from "@/components/ContactAdmin";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const INPUT_CLASS = "w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm placeholder:text-muted-foreground text-foreground";

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [persistSession, setPersistSession] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [contactAdminOpen, setContactAdminOpen] = useState(false);
  const { login, loginWithGoogle, loginWithLinkedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (!result.success && result.error) toast.error(result.error);
    } catch (err) {
      toast.error("Google Login error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedInLogin = async () => {
    setLoading(true);
    try {
      const result = await loginWithLinkedIn();
      if (!result.success && result.error) toast.error(result.error);
    } catch (err) {
      toast.error("LinkedIn Login error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        toast.success("Login successful! Welcome back!");
        setTimeout(() => router.replace(callbackUrl), 500);
      } else {
        toast.error(result.error || "Login failed. Please try again.");
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left Side */}
          <div className="hidden lg:block pr-8">
            <Link href="/" className="inline-block mb-8">
              <span className="bg-primary text-primary-foreground font-bold text-base px-3 py-1 rounded-md">
                BlogerMenia
              </span>
            </Link>
            <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-base mb-10 leading-relaxed">
              Sign in to write, share, and explore technical blogs.
            </p>
            <div className="space-y-5">
              {[
                { icon: BookOpen, title: "Write & Publish", desc: "Create and publish blogs for the world to read." },
                { icon: Users, title: "Connect with Readers", desc: "Share your ideas with a global audience." },
                { icon: Sparkles, title: "Track Your Growth", desc: "See how your blogs are performing." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="bg-primary/10 text-primary rounded-lg p-2.5 shrink-0">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">{title}</h3>
                    <p className="text-muted-foreground text-sm">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="w-full">
            <div className="bg-card border border-border rounded-xl p-8 md:p-10 shadow-lg shadow-black/5">
              <div className="text-center mb-8 pb-6 border-b border-border">
                <h2 className="text-2xl font-bold text-foreground mb-1">Sign in</h2>
                <p className="text-muted-foreground text-sm">Enter your details to continue</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={INPUT_CLASS} placeholder="you@example.com" />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <input id="password" type={showPassword ? "text" : "password"} required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={`${INPUT_CLASS} pr-10`} placeholder="Enter your password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={persistSession} onChange={(e) => setPersistSession(e.target.checked)} className="accent-primary size-4 rounded" />
                    <span className="text-sm text-foreground">Remember me</span>
                  </label>
                  <ContactAdmin open={contactAdminOpen} onOpenChange={setContactAdminOpen}>
                    <button type="button" className="text-sm text-primary hover:underline transition-colors">Forgot password?</button>
                  </ContactAdmin>
                </div>

                <Button type="submit" disabled={loading} loading={loading} className="w-full" size="lg">
                  Sign in
                </Button>
              </form>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">Or</span>
              </div>

              <div className="space-y-3">
                <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full bg-background border border-border rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-3 hover:bg-muted transition-colors disabled:opacity-50">
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>

                <button type="button" onClick={handleLinkedInLogin} disabled={loading} className="w-full bg-[#0A66C2] text-white rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-3 hover:bg-[#004182] transition-colors disabled:opacity-50">
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  Continue with LinkedIn
                </button>
              </div>

              <p className="mt-7 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href={callbackUrl !== "/" ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"} className="text-primary font-medium hover:underline underline-offset-4">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
        <div className="flex justify-center mt-12 py-10">
          <LoaderCard message="Loading..." />
        </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
