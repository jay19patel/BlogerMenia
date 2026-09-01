"use client";

import { useEffect, useState } from "react";

/**
 * The thin progress bar across the top of an article.
 *
 * Measures the article element rather than the whole document, so the footer
 * and the "more like this" grid do not count towards "finished reading".
 */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const article = document.getElementById(targetId);
      if (!article) return;

      const { top, height } = article.getBoundingClientRect();
      // How far the viewport's top edge has travelled through the article.
      const scrolled = -top;
      const scrollable = height - window.innerHeight;

      if (scrollable <= 0) {
        setProgress(scrolled > 0 ? 100 : 0);
        return;
      }
      setProgress(Math.min(100, Math.max(0, (scrolled / scrollable) * 100)));
    };

    document.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    return () => {
      document.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetId]);

  return (
    <div
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed top-16 right-0 left-0 z-30 h-0.5 bg-transparent"
    >
      <div
        className="h-full bg-brand-600 transition-[width] duration-75 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
