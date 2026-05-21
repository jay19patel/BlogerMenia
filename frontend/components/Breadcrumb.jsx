import Link from "next/link";
import { LayoutGrid } from "lucide-react";

export default function Breadcrumb({ items }) {
  return (
    <nav className="flex mb-8" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {items.map((item, index) => (
          <li key={index} className={index === 0 ? "inline-flex items-center" : ""}>
            {index === 0 && (
              <div className="inline-flex items-center">
                <LayoutGrid className="w-4 h-4 mr-2 text-foreground" strokeWidth={2.5} />
                {item.href ? (
                  <Link
                    href={item.href}
                    className="inline-flex items-center font-mono font-bold uppercase tracking-widest text-[10px] text-foreground hover:bg-foreground hover:text-background border-2 border-transparent hover:border-foreground px-2 py-1 transition-all whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="inline-flex items-center font-mono font-bold uppercase tracking-widest text-[10px] text-background bg-foreground border-2 border-foreground px-2 py-1 whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]">
                    {item.label}
                  </span>
                )}
              </div>
            )}

            {index > 0 && (
              <div className="flex items-center">
                <span className="mx-2 font-mono font-bold text-foreground">/</span>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="ml-1 inline-flex items-center font-mono font-bold uppercase tracking-widest text-[10px] text-foreground hover:bg-foreground hover:text-background border-2 border-transparent hover:border-foreground px-2 py-1 transition-all whitespace-nowrap md:ml-2"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="ml-1 inline-flex items-center font-mono font-bold uppercase tracking-widest text-[10px] text-background bg-foreground border-2 border-foreground px-2 py-1 whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] md:ml-2">
                    {item.label}
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
