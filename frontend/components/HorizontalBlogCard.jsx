import Link from "next/link";
import { Eye, Heart } from "lucide-react";
import { getImageUrl } from "../lib/utils";

export default function HorizontalBlogCard({ blog }) {
    // Construct URL
    const getBlogUrl = () => {
        const authorIdentifier = blog.author?.email || blog.authorEmail || blog.authorUsername;
        if (authorIdentifier) {
            return `/blogs/${encodeURIComponent(authorIdentifier)}/${blog.slug}`;
        }
        return `/blogs/${blog.slug}`;
    };

    const imagePath = blog.thumbnail?.file_path || blog.image;

    return (
        <Link href={getBlogUrl()} className="block group h-full">
            <div className="bg-background border-2 border-foreground hover:shadow-[8px_8px_0px_0px_rgba(88,28,135,1)] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-300 flex flex-col md:flex-row h-full">
                {/* Image Section - Left side on desktop */}
                <div className="md:w-1/3 relative min-h-[200px] border-b-2 md:border-b-0 md:border-r-2 border-foreground bg-purple-900 flex-shrink-0">
                    {imagePath ? (
                        <img
                            src={getImageUrl(imagePath)}
                            alt={blog.title}
                            className="absolute inset-0 w-full h-full object-cover grayscale opacity-90 mix-blend-luminosity group-hover:grayscale-0 group-hover:mix-blend-normal group-hover:opacity-100 transition-all duration-500"
                        />
                    ) : (
                        <div className="w-full h-full bg-foreground flex items-center justify-center text-background">
                            <p className="font-mono font-bold uppercase tracking-widest text-xs opacity-50">SYS.NO_IMG</p>
                        </div>
                    )}
                </div>

                {/* Content Section - Right side */}
                <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="bg-foreground text-background group-hover:bg-purple-900 transition-colors px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-widest">
                                {blog.date || "Date"}
                            </span>
                            {blog.category && (
                                <span className="border-2 border-foreground px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-widest text-foreground group-hover:border-purple-900 group-hover:text-purple-900 transition-colors">
                                    {blog.category}
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl md:text-2xl font-extrabold text-foreground mb-3 line-clamp-2 group-hover:text-purple-900 transition-colors uppercase tracking-tight leading-tight">
                            {blog.title}
                        </h3>
                        <p className="text-gray-700 font-mono text-[11px] md:text-xs line-clamp-3 leading-relaxed mb-4">
                            {blog.description || blog.excerpt}
                        </p>
                    </div>

                    {/* Footer / Stats */}
                    <div className="flex items-center justify-between border-t-2 border-foreground pt-4 mt-auto group-hover:border-purple-900 transition-colors">
                        {/* Author Info */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold uppercase text-foreground group-hover:text-purple-900 transition-colors truncate max-w-[150px]">
                                {blog.author?.full_name || blog.authorFullName || blog.authorUsername || "Author"}
                            </span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-[10px] font-mono font-bold uppercase text-foreground group-hover:text-purple-900 transition-colors">
                            <div className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
                                <span>{(blog.views || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Heart className="w-3.5 h-3.5" strokeWidth={2.5} />
                                <span>{(blog.likes || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
