import Link from "next/link";
import { Calendar, Eye, Heart, User } from "lucide-react";
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
        <Link href={getBlogUrl()} className="block group">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-xl hover:border-indigo-500 transition-all duration-300 flex flex-col md:flex-row h-full md:h-40">
                {/* Image Section - Left side on desktop */}
                <div className="md:w-1/4 relative h-32 md:h-full overflow-hidden">
                    {imagePath ? (
                        <img
                            src={getImageUrl(imagePath)}
                            alt={blog.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center">
                            <p className="text-white text-xs font-bold opacity-50">Blog</p>
                        </div>
                    )}
                </div>

                {/* Content Section - Right side */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-widest">
                            <Calendar className="w-3 h-3 text-indigo-400" />
                            <span>{blog.date}</span>
                        </div>
                        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {blog.title}
                        </h3>
                        <p className="text-gray-600 text-[11px] md:text-xs line-clamp-2 leading-relaxed opacity-80">
                            {blog.description}
                        </p>
                    </div>

                    {/* Footer / Stats */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                        {/* Author Info */}
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                <User className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[120px]">
                                {blog.author?.full_name || blog.authorFullName || blog.authorUsername || "Author"}
                            </span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                            <div className="flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" />
                                <span>{(blog.views || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5" />
                                <span>{(blog.likes || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
