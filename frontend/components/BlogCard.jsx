import Link from "next/link";
import { Calendar, Tag, Star, Eye, Heart } from "lucide-react";
import { getImageUrl, formatDate } from "../lib/utils";

export default function BlogCard({ blog }) {
  const getBlogUrl = () => {
    const authorIdentifier = blog.author?.email || blog.author_email || blog.authorUsername || blog.author;
    if (authorIdentifier && typeof authorIdentifier === 'string') {
      return `/blogs/${encodeURIComponent(authorIdentifier)}/${blog.slug}`.replace(/([^:]\/)\/+/g, "$1");
    }
    return `/blogs/${blog.slug}`;
  };

  const imagePath = blog.thumbnail?.file_path || blog.thumbnail || blog.image;
  const displayDate = blog.date || formatDate(blog.publishedDate || blog.created_at || blog.added_at);
  const displayCategory = blog.category_name || (typeof blog.category === 'string' ? blog.category : blog.category?.name) || 'Uncategorized';
  const displayDescription = blog.description || blog.excerpt || '';

  return (
    <Link href={getBlogUrl()} className="block h-full">
      <div className="group bg-background border-2 border-foreground h-full flex flex-col hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(88,28,135,1)] transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-video overflow-hidden bg-background border-b-2 border-foreground">
          {imagePath ? (
            <img
              src={getImageUrl(imagePath)}
              alt={blog.title}
              className="w-full h-full object-cover transition-all duration-500 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-foreground flex items-center justify-center text-background">
              <p className="font-mono font-bold uppercase tracking-widest text-xs opacity-50">SYS.NO_IMG</p>
            </div>
          )}
          <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-foreground text-background border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]">
              {displayCategory}
            </span>
            {blog.featured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-[#facc15] text-foreground border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]">
                <Star className="w-3 h-3 fill-current" />
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="font-extrabold text-xl text-foreground mb-2 line-clamp-2 uppercase tracking-tight group-hover:text-purple-900 transition-colors">
            {blog.title}
          </h3>
          <p className="text-xs font-mono text-gray-700 line-clamp-3 mb-4 leading-relaxed flex-1">
            {displayDescription}
          </p>

          {/* Meta */}
          <div className="flex items-center justify-between mt-auto pt-4 border-t-2 border-foreground group-hover:border-purple-900 transition-colors text-[10px] font-mono font-bold uppercase tracking-widest text-foreground">
            <div className="flex items-center gap-4 group-hover:text-purple-900">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{displayDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 group-hover:text-purple-900">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{blog.views || 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{blog.likes || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
