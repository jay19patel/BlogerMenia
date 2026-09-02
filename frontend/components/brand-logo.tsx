import Link from "next/link";
import { urls } from "@/lib/urls";
import { cx } from "@/utils/cx";

export function BrandLogo({
  className,
  iconSize = 18,
  textClassName,
  asLink = true,
}: {
  className?: string;
  iconSize?: number;
  textClassName?: string;
  asLink?: boolean;
}) {
  const content = (
    <>
      <span className="w-9 h-9 rounded-xl bg-linear-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          <path d="M9 8h6" />
          <path d="M9 12h4" />
        </svg>
      </span>
      <span
        className={cx(
          "text-[19px] font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-brand-600 select-none",
          textClassName
        )}
      >
        Bloger<span className="text-brand-600">Menia</span>
      </span>
    </>
  );

  if (!asLink) {
    return (
      <div className={cx("flex items-center gap-2.5", className)}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={urls.home()}
      className={cx("flex items-center gap-2.5 group shrink-0", className)}
    >
      {content}
    </Link>
  );
}
