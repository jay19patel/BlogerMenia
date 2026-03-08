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
                <LayoutGrid className="w-5 h-5 mr-2 text-gray-900" />
                {item.href ? (
                  <Link
                    href={item.href}
                    className="inline-flex items-center text-base font-medium text-gray-900 hover:text-indigo-600 whitespace-nowrap transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="inline-flex items-center text-base font-medium text-indigo-600 whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </div>
            )}

            {index > 0 && (
              <div className="flex items-center">
                <svg
                  className="mx-1 w-5 h-5"
                  viewBox="0 0 5 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.12561 1.13672L0.999943 18.8633"
                    stroke="#E5E7EB"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="ml-1 text-base font-medium text-gray-900 hover:text-indigo-600 md:ml-2 whitespace-nowrap transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="ml-1 text-base font-medium text-indigo-600 md:ml-2 whitespace-nowrap">
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
