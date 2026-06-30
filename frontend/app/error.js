"use client";

import Link from "next/link";
import { Home, RefreshCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 bg-background">
      <div className="bg-card border border-border rounded-xl p-10 max-w-md w-full text-center shadow-sm">
        <div className="bg-destructive/10 rounded-full size-16 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="size-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
        <p className="text-muted-foreground text-sm mb-2">An unexpected error occurred.</p>

        {process.env.NODE_ENV === "development" && error && (
          <div className="mb-6 p-3 bg-muted rounded-md text-left">
            <p className="text-xs text-muted-foreground font-mono wrap-break-word">
              {error.message || "An unexpected error occurred"}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 pt-6 border-t border-border">
          <Button onClick={() => reset()} variant="default" size="sm">
            <RefreshCcw className="size-4" />
            Try Again
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/"><Home className="size-4" />Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
