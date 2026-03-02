import Link from "next/link";
import { Calendar, Eye, Heart, User } from "lucide-react";
import { getImageUrl } from "../lib/utils";

export default function HorizontalBlogCard({ blog }) {
    // Construct URL
    const getBlogUrl = () => {
        const authorIdentifier = blog.author?.email || blog.authorEmail || blog.authorUsername;
        if (authorIdentifier) {
            return `/blogs/${authorIdentifier}/${blog.slug}`;
        }
        return `/blogs/${blog.slug}`;
    };

    const imagePath = blog.thumbnail?.file_path || blog.image;

    return (
        <Link href={getBlogUrl()} className="block group">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-xl hover:border-indigo-500 transition-all duration-300 flex flex-col md:flex-row h-full md:h-64">
                {/* Image Section - Left side on desktop (35-40% width) */}
                <div className="md:w-2/5 relative h-48 md:h-full overflow-hidden">
                    {imagePath ? (
                        <img
                            src={getImageUrl(imagePath)}
                            alt={blog.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center">
                            <p className="text-white text-2xl font-bold opacity-50">No Image</p>
                        </div>
                    )}

                    {/* Category Badge - Top Left */}
                    <div className="absolute top-4 left-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-indigo-600 shadow-sm">
                            {blog.category}
                        </span>
                    </div>
                </div>

                {/* Content Section - Right side */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{blog.date}</span>
                        </div>

                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                            {blog.title}
                        </h3>

                        <p className="text-gray-600 text-sm md:text-base line-clamp-2 md:line-clamp-3 mb-4">
                            {blog.description}
                        </p>
                    </div>

                    {/* Footer / Stats */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                        {/* Author Info */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                <User className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                                {blog.author?.full_name || blog.authorFullName || blog.authorUsername || "Author"}
                            </span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <Eye className="w-4 h-4 text-gray-400" />
                                <span>{blog.views || 0}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Heart className="w-4 h-4 text-gray-400" />
                                <span>{blog.likes || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
