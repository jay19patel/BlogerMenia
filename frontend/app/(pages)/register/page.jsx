"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import LoaderCard from "@/components/ui/loader";
import { Mail, Lock, Eye, EyeOff, BookOpen, Users, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const INPUT_CLASS = "w-full px-3 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm placeholder:text-muted-foreground text-foreground";
const INPUT_ICON_CLASS = `${INPUT_CLASS} pl-9`;

function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (formData.password.length < 8) { toast.error("Password must be at least 8 characters long"); return; }
    setLoading(true);
    try {
      const result = await register({ email: formData.email, password: formData.password, full_name: `${formData.firstName} ${formData.lastName}` });
      if (result.success) { toast.success("Account created! Welcome to BlogerMenia!"); setTimeout(() => router.push(callbackUrl), 500); }
      else toast.error(result.error || "Registration failed. Please try again.");
    } catch { toast.error("An unexpected error occurred. Please try again."); }
    finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (!result.success && result.error) toast.error(result.error);
    } catch (err) { toast.error("Google Login error: " + err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left Side */}
          <div className="hidden lg:block pr-8">
            <Link href="/" className="inline-block mb-8">
              <span className="bg-primary text-primary-foreground font-bold text-base px-3 py-1 rounded-md">BlogerMenia</span>
            </Link>
            <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">Start your journey</h1>
            <p className="text-muted-foreground text-base mb-10 leading-relaxed">
              Join thousands of writers sharing ideas and building their audience.
            </p>
            <div className="space-y-5">
              {[
                { icon: BookOpen, title: "Write & Publish", desc: "Create and publish blogs for the world to read." },
                { icon: Users, title: "Connect with Readers", desc: "Share your ideas with a global audience." },
                { icon: Sparkles, title: "AI-Powered Blogging", desc: "Let AI help you write better, faster content." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="bg-primary/10 text-primary rounded-lg p-2.5 shrink-0"><Icon className="size-5" /></div>
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
              <div className="text-center mb-7 pb-6 border-b border-border">
                <h2 className="text-2xl font-bold text-foreground mb-1">Create account</h2>
                <p className="text-muted-foreground text-sm">Fill in your details to get started</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1.5">First Name</label>
                    <input id="firstName" type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className={INPUT_CLASS} placeholder="Jay" />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1.5">Last Name</label>
                    <input id="lastName" type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className={INPUT_CLASS} placeholder="Patel" />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={INPUT_ICON_CLASS} placeholder="you@example.com" />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <input id="password" type={showPassword ? "text" : "password"} required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={`${INPUT_ICON_CLASS} pr-10`} placeholder="Min. 8 characters" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} required value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className={`${INPUT_ICON_CLASS} pr-10`} placeholder="Confirm your password" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input id="terms" type="checkbox" required className="accent-primary size-4 mt-0.5 rounded" />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the{" "}
                    <Link href="#" className="text-foreground hover:underline underline-offset-2 font-medium">Terms of Service</Link>
                    {" "}and{" "}
                    <Link href="#" className="text-foreground hover:underline underline-offset-2 font-medium">Privacy Policy</Link>
                  </label>
                </div>

                <Button type="submit" disabled={loading} loading={loading} className="w-full" size="lg">
                  Create account
                </Button>
              </form>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">Or</span>
              </div>

              <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full bg-background border border-border rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-3 hover:bg-muted transition-colors disabled:opacity-50">
                <svg className="size-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href={callbackUrl !== "/" ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"} className="text-primary font-medium hover:underline underline-offset-4">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
        <div className="flex justify-center mt-12 py-10">
          <LoaderCard message="Loading..." />
        </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
