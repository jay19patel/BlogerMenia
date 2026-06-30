import Link from "next/link";
import Image from "next/image";
import { Eye, Heart } from "lucide-react";
import { getBlogDate, getImageUrl, getBlogUrl, formatDate } from "../lib/utils";

export default function HorizontalBlogCard({ blog }) {
    const imagePath = blog.thumbnail?.file_path || blog.thumbnail || blog.image;

    return (
        <Link href={getBlogUrl(blog)} className="block group h-full">
            <div className="bg-card border border-border rounded-lg flex flex-col md:flex-row h-full overflow-hidden hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">
                {/* Image — left on desktop */}
                <div className="md:w-2/5 relative min-h-44 bg-muted shrink-0 overflow-hidden">
                    {imagePath ? (
                        <Image
                            src={getImageUrl(imagePath)}
                            alt={blog.title}
                            fill
                            sizes="(min-width: 768px) 40vw, 100vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                            <p className="text-xs">No image</p>
                        </div>
                    )}
                </div>

                {/* Content — right */}
                <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-muted-foreground">
                                {formatDate(getBlogDate(blog), "Date")}
                            </span>
                            {blog.category && (
                                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                                    {blog.category}
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 line-clamp-2 leading-snug">
                            {blog.title}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed mb-4">
                            {blog.description || blog.excerpt}
                        </p>
                    </div>

                    {/* Footer / Stats */}
                    <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                        <span className="text-sm font-medium text-foreground truncate max-w-36">
                            {blog.author?.full_name || blog.authorFullName || blog.authorUsername || "Author"}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                                <span>{(blog.views || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5" strokeWidth={2} />
                                <span>{(blog.likes || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
