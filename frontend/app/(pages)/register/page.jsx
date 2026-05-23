"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff, Zap, Shield, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        full_name: `${formData.firstName} ${formData.lastName}`,
      });

      if (result.success) {
        toast.success("Account created successfully! Welcome to BlogerMenia!");
        setTimeout(() => {
          router.push("/");
        }, 500);
      } else {
        toast.error(result.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (!result.success && result.error) {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error("Google Login error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Text Content */}
          <div className="hidden lg:block">
            <div className="pr-12">
              <Link href="/" className="inline-block mb-8">
                <span className="text-3xl font-extrabold text-foreground uppercase tracking-tighter">
                  SYS<span className="text-indigo-600">.</span>LOG
                </span>
              </Link>

              <h1 className="text-5xl font-extrabold text-foreground mb-6 uppercase tracking-tight">
                INITIALIZE
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600"> SESSION </span>
              </h1>

              <p className="text-xl text-gray-700 mb-12 font-serif italic">
                Join thousands of operators who are already managing their deployments on our network.
              </p>

              {/* Benefits */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-background border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground mb-1 uppercase tracking-tight">Rapid Provisioning</h3>
                    <p className="text-gray-600 font-mono text-sm">Spin up your environment in seconds.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-background border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground mb-1 uppercase tracking-tight">Zero-Trust Security</h3>
                    <p className="text-gray-600 font-mono text-sm">Enterprise-grade endpoint protection by default.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-background border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground mb-1 uppercase tracking-tight">Open Core</h3>
                    <p className="text-gray-600 font-mono text-sm">Contribute and scale without vendor lock-in.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Side - Register Form */}
          <div className="w-full">
            <div className="bg-background border-2 border-foreground p-8 md:p-10 shadow-[8px_8px_0px_0px_rgba(13,17,23,1)]">
              {/* Header */}
              <div className="text-center mb-8 border-b-2 border-foreground pb-6">
                <h1 className="text-3xl font-extrabold text-foreground mb-2 uppercase tracking-tight">
                  Node Registration
                </h1>
                <p className="text-gray-600 font-mono text-xs uppercase tracking-widest font-bold">
                  Initialize a new operator account
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* First Name & Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-2"
                    >
                      Given Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
                      placeholder="Root"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-2"
                    >
                      Surname
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
                      placeholder="User"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-2"
                  >
                    Identifier
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
                      placeholder="sys@admin.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-2"
                  >
                    Passkey
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full pl-10 pr-12 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
                      placeholder="Generate passkey"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-mono font-bold uppercase tracking-widest text-foreground mb-2"
                  >
                    Verify Passkey
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      className="w-full pl-10 pr-12 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:border-foreground focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
                      placeholder="Confirm passkey"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start mt-4">
                  <div className="relative flex items-center justify-center">
                    <input
                      id="terms"
                      type="checkbox"
                      required
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 border-2 border-foreground bg-background peer-checked:bg-foreground transition-colors"></div>
                  </div>
                  <label htmlFor="terms" className="ml-2 text-xs font-mono text-gray-600">
                    Acknowledge the{" "}
                    <Link href="#" className="text-foreground hover:underline decoration-2 underline-offset-2 font-bold uppercase tracking-widest">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="#" className="text-foreground hover:underline decoration-2 underline-offset-2 font-bold uppercase tracking-widest">
                      Privacy
                    </Link>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-foreground text-background py-3 border-2 border-foreground hover:bg-gray-800 transition-all font-mono font-bold uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-[6px_6px_0px_0px_rgba(88,28,135,1)] hover:-translate-x-1 hover:-translate-y-1 mt-4"
                >
                  {loading ? "Provisioning..." : "Provision Node"}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-foreground border-dashed"></div>
                </div>
                <div className="relative flex justify-center text-xs font-mono font-bold uppercase tracking-widest">
                  <span className="px-4 bg-background text-foreground">Or</span>
                </div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-background text-foreground py-3 border-2 border-foreground hover:bg-gray-100 transition-all font-mono font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-[6px_6px_0px_0px_rgba(88,28,135,1)] hover:-translate-x-1 hover:-translate-y-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google SSO
              </button>

              {/* Login Link */}
              <p className="mt-8 text-center text-xs font-mono uppercase tracking-widest text-foreground font-bold">
                Existing Operator?{" "}
                <Link
                  href="/login"
                  className="text-indigo-600 hover:text-foreground transition-colors underline decoration-2 underline-offset-4"
                >
                  Authenticate
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
