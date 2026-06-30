import Link from "next/link";
import Image from "next/image";
import { Calendar, Star, Eye, Heart } from "lucide-react";
import { getBlogDate, getImageUrl, getBlogUrl, formatDate } from "../lib/utils";

export default function BlogCard({ blog }) {
  const imagePath = blog.thumbnail?.file_path || blog.thumbnail || blog.image;
  const displayDate = formatDate(getBlogDate(blog), "Date");
  const displayCategory = blog.category_name || (typeof blog.category === 'string' ? blog.category : blog.category?.name) || 'Uncategorized';
  const displayDescription = blog.description || blog.excerpt || '';

  return (
    <Link href={getBlogUrl(blog)} className="block h-full">
      <div className="group bg-card border border-border rounded-lg h-full flex flex-col overflow-hidden hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">
        {/* Image */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {imagePath ? (
            <Image
              src={getImageUrl(imagePath)}
              alt={blog.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
              <p className="text-xs">No image</p>
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full backdrop-blur-sm">
              {displayCategory}
            </span>
            {blog.featured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                <Star className="w-3 h-3 fill-current" />
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="font-semibold text-base text-foreground mb-2 line-clamp-2 leading-snug">
            {blog.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed flex-1">
            {displayDescription}
          </p>

          {/* Meta */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{displayDate}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                <span>{blog.views || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" strokeWidth={2} />
                <span>{blog.likes || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
