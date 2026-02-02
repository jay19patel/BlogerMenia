import { Calendar, Heart, Share2 } from "lucide-react";

export default function NoteCard({ note, onLike, onEdit, onDelete, isOwner }) {
    return (
        <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 pr-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                        {note.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>
                            {new Date(note.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                            })}
                        </span>
                        <span>•</span>
                        {note.is_public ? (
                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Public</span>
                        ) : (
                            <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">Private</span>
                        )}
                    </div>
                </div>
                {isOwner && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(note); }}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                        >
                            <span className="text-xs font-medium">Edit</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <span className="text-xs font-medium">Delete</span>
                        </button>
                    </div>
                )}
            </div>

            <p className="text-gray-600 mb-6 line-clamp-3 leading-relaxed">
                {note.content}
            </p>

            {note.tags_list && note.tags_list.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                    {note.tags_list.map((tag, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-full border border-gray-100">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => onLike(note.id)}
                        className={`flex items-center gap-2 text-sm font-medium transition-colors ${note.is_liked ? "text-red-500" : "text-gray-500 hover:text-red-500"
                            }`}
                    >
                        <Heart className={`w-4 h-4 ${note.is_liked ? "fill-current" : ""}`} />
                        <span>{note.total_likes}</span>
                    </button>
                    <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                    </button>
                </div>
                {note.user && (
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-medium text-gray-900">{note.user.username}</p>
                            <p className="text-[10px] text-gray-400">Author</p>
                        </div>
                        {note.user.profile_image ? (
                            <img src={note.user.profile_image} alt={note.user.username} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                                {note.user.username[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
