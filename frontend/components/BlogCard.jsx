import Link from "next/link";
import { Calendar, Tag, Star } from "lucide-react";
import { getImageUrl } from "../lib/utils";

export default function BlogCard({ blog }) {
  // If blog has author info, construct URL with username
  // Otherwise use the simple slug route
  const getBlogUrl = () => {
    const authorIdentifier = blog.author?.email || blog.author_email || blog.authorUsername;
    if (authorIdentifier) {
      return `/blogs/${authorIdentifier}/${blog.slug}`;
    }
    return `/blogs/${blog.slug}`;
  };

  const imagePath = blog.thumbnail?.file_path || blog.image;

  return (
    <Link href={getBlogUrl()}>
      <div className="group bg-white rounded-xl border border-gray-300 overflow-hidden transition-all duration-300 hover:border-indigo-500 hover:shadow-lg">
        {/* Image */}
        <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
          {imagePath ? (
            <img
              src={getImageUrl(imagePath)}
              alt={blog.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center">
              <p className="text-white text-3xl font-bold opacity-50">No Image</p>
            </div>
          )}
          <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white text-indigo-600 shadow-sm">
              {blog.category}
            </span>
            {blog.featured && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-yellow-900 shadow-sm">
                <Star className="w-3 h-3 fill-current" />
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {blog.title}
          </h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {blog.description}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{blog.date}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
