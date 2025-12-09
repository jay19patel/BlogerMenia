from django.contrib import admin
from blogs.models import Blog, Category, FAQ, Testimonial


admin.site.site_header = "Blogermenia Admin"
admin.site.site_title = "Blogermenia Admin Portal"
admin.site.index_title = "Welcome to Blogermenia Admin Portal"


class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}   # Auto slug generate
    search_fields = ("name",)


class BlogAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "category", "isPublished", "publishedDate", "views", "likes")
    prepopulated_fields = {"slug": ("title",)}   # Auto slug from title
    list_filter = ("isPublished", "category", "created_at")
    search_fields = ("title", "author__username")
    readonly_fields = ("created_at", "updated_at", "views", "likes")


class FAQAdmin(admin.ModelAdmin):
    list_display = ("question", "answer_preview")
    search_fields = ("question", "answer")

    def answer_preview(self, obj):
        return obj.answer[:50] + "..." if len(obj.answer) > 50 else obj.answer
    answer_preview.short_description = "Answer"


class TestimonialAdmin(admin.ModelAdmin):
    list_display = ("user", "content_preview")
    search_fields = ("user__username", "content")

    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    content_preview.short_description = "Content"


admin.site.register(Category, CategoryAdmin)
admin.site.register(Blog, BlogAdmin)
admin.site.register(FAQ, FAQAdmin)
admin.site.register(Testimonial, TestimonialAdmin)
