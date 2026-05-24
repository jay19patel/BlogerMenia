"use client";
import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Check, Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function CategorySelect({
    categoryId,
    categoryName,
    onSelect,
    token,
    required = false,
}) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(categoryName || "");
    const containerRef = useRef(null);

    // Sync parent value
    useEffect(() => {
        setSearch(categoryName || "");
    }, [categoryName]);

    // Load categories
    useEffect(() => {
        const loadCategories = async () => {
            setLoading(true);
            try {
                const data = await api.getBlogCategories();

                let list = [];

                if (Array.isArray(data)) list = data;
                else if (Array.isArray(data.results)) list = data.results;
                else if (Array.isArray(data.items)) list = data.items;

                setCategories(list);
            } catch (error) {
                console.error("Failed to load categories:", error);
                setCategories([]);
            } finally {
                setLoading(false);
            }
        };

        loadCategories();
    }, [token]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = categories.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase())
    );

    const exactMatch = categories.find(
        (c) => c.name?.toLowerCase() === search.trim().toLowerCase()
    );

    const hasTyped = search.trim().length > 0;

    const handleSelect = (cat) => {
        setSearch(cat.name);
        onSelect(cat.id || cat._id, cat.name);
        setOpen(false);
    };

    const handleCreateNew = async () => {
        const name = search.trim();
        if (!name || creating) return;

        if (exactMatch) {
            handleSelect(exactMatch);
            return;
        }

        setCreating(true);

        try {
            const createdId = await api.getOrCreateCategory(name);
            const data = await api.getBlogCategories();

            let list = [];
            if (Array.isArray(data)) list = data;
            else if (Array.isArray(data.results)) list = data.results;
            else if (Array.isArray(data.items)) list = data.items;

            const created = list.find(
                (c) => (c.id || c._id) === createdId || c.name?.toLowerCase() === name.toLowerCase()
            );

            if (created) {
                setCategories(list);
                onSelect(created.id || created._id, created.name);
                setOpen(false);
            } else {
                onSelect(createdId, name);
                setOpen(false);
            }
        } catch (error) {
            console.error("Error creating category:", error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Input */}
            <div
                className={`flex items-center w-full px-3 py-2 border rounded-lg bg-white transition-all ${open
                    ? "border-indigo-500 ring-2 ring-indigo-100"
                    : "border-gray-300 hover:border-indigo-400"
                    }`}
            >
                <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />

                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (!open) setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder={
                        required
                            ? "Search or create category *"
                            : "Search or create category"
                    }
                    className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400"
                />

                {categoryId && (
                    <span className="ml-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">
                        ✓
                    </span>
                )}

                <ChevronDown
                    className={`w-4 h-4 text-gray-400 ml-1 flex-shrink-0 transition-transform cursor-pointer ${open ? "rotate-180" : ""
                        }`}
                    onClick={() => setOpen((o) => !o)}
                />
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="max-h-52 overflow-y-auto">
                        {loading && (
                            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Loading categories…
                            </div>
                        )}

                        {!loading && filtered.length === 0 && !hasTyped && (
                            <div className="px-4 py-3 text-sm text-gray-400">
                                No categories found. Type to create one.
                            </div>
                        )}

                        {!loading &&
                            filtered.map((cat) => (
                                <button
                                    key={cat.id || cat._id}
                                    type="button"
                                    onClick={() => handleSelect(cat)}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-indigo-50 transition-colors"
                                >
                                    <Check
                                        className={`w-3.5 h-3.5 flex-shrink-0 ${categoryId === (cat.id || cat._id)
                                            ? "text-indigo-600"
                                            : "text-transparent"
                                            }`}
                                    />
                                    <span className="text-gray-800">{cat.name}</span>
                                </button>
                            ))}

                        {!loading && hasTyped && !exactMatch && (
                            <button
                                type="button"
                                onClick={handleCreateNew}
                                disabled={creating}
                                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left border-t border-gray-100 hover:bg-green-50 transition-colors disabled:opacity-50"
                            >
                                {creating ? (
                                    <Loader2 className="w-3.5 h-3.5 text-green-600 animate-spin" />
                                ) : (
                                    <Plus className="w-3.5 h-3.5 text-green-600" />
                                )}
                                <span className="text-green-700 font-medium">
                                    {creating
                                        ? `Creating "${search.trim()}"…`
                                        : `Create "${search.trim()}"`}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
