"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function CallbackContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { loginWithGoogle } = useAuth();
	const [error, setError] = useState(null);
	const processedRef = useRef(false);

	useEffect(() => {
		// Prevent multiple executions
		if (processedRef.current) {
			return;
		}

		const code = searchParams.get('code');
		if (!code) return; // Wait for code

		processedRef.current = true;
		let mounted = true;

		const handleCallback = async () => {
			try {
				console.log('Callback received code, exchanging for token...');

				// Exchange code for token via backend
				const result = await loginWithGoogle(code);

				if (result.success) {
					console.log('Google login successful');
					if (mounted) {
						toast.success("Successfully logged in with Google!");
						router.push('/');
					}
				} else {
					throw new Error(result.error || "Google login failed");
				}
			} catch (err) {
				console.error('Callback error:', err);
				if (mounted) {
					toast.error(err.message || "Authentication failed. Please try again.");
					setError(err.message || "Authentication failed. Please try again.");
					setTimeout(() => router.push('/login'), 3000);
				}
			}
		};

		handleCallback();

		return () => {
			mounted = false;
		};
	}, [searchParams, loginWithGoogle]);

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="mb-4">
						<svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
					<p className="text-gray-600 mb-4">{error}</p>
					<p className="text-sm text-gray-500">Redirecting to login...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="text-center">
				<div className="mb-4">
					<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
				</div>
				<h2 className="text-2xl font-bold text-gray-900 mb-2">Signing you in...</h2>
				<p className="text-gray-600">Please wait while we complete your authentication.</p>
			</div>
		</div>
	);
}

export default function AuthCallbackPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="mb-4">
						<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
					</div>
					<h2 className="text-2xl font-bold text-gray-900 mb-2">Preparing callback…</h2>
				</div>
			</div>
		}>
			<CallbackContent />
		</Suspense>
	);
}
