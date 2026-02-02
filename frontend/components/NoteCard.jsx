import { Calendar, Heart, Share2 } from "lucide-react";

export default function NoteCard({ note, onLike, onEdit, onDelete, isOwner }) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                        {note.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {new Date(note.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                        })}
                    </p>
                </div>
                {isOwner && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(note)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => onDelete(note.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>

            <p className="text-gray-600 mb-6 line-clamp-3">
                {note.content}
            </p>

            {note.tags_list && note.tags_list.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {note.tags_list.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onLike(note.id)}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${note.is_liked ? "text-red-500" : "text-gray-500 hover:text-red-500"
                            }`}
                    >
                        <Heart className={`w-4 h-4 ${note.is_liked ? "fill-current" : ""}`} />
                        {note.total_likes}
                    </button>
                    <button className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                        <Share2 className="w-4 h-4" />
                        Share
                    </button>
                </div>
                {note.user && (
                    <div className="flex items-center gap-2">
                        {note.user.profile_image ? (
                            <img src={note.user.profile_image} alt={note.user.username} className="w-6 h-6 rounded-full" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                {note.user.username[0].toUpperCase()}
                            </div>
                        )}
                        <span className="text-xs text-gray-500">@{note.user.username}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
