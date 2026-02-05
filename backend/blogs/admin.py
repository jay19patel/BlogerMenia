from django.contrib import admin
from .models import Blog, Category, BlogLike, BlogView

admin.site.site_header = "Blogermenia Admin"
admin.site.site_title = "Blogermenia Admin Portal"
admin.site.index_title = "Welcome to Blogermenia Admin Portal"

class BlogAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'isPublished', 'publishedDate', 'views', 'likes', 'created_at')
    list_filter = ('isPublished', 'category', 'created_at')
    search_fields = ('title', 'slug', 'author__username')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('views', 'likes', 'created_at', 'updated_at')

class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

class BlogLikeAdmin(admin.ModelAdmin):
    list_display = ('user', 'blog', 'created_at')
    search_fields = ('user__username', 'blog__title')
    list_filter = ('created_at',)

class BlogViewAdmin(admin.ModelAdmin):
    list_display = ('user', 'blog', 'ip_address', 'created_at')
    search_fields = ('user__username', 'blog__title', 'ip_address')
    list_filter = ('created_at',)
    readonly_fields = ('user', 'blog', 'ip_address', 'created_at')

admin.site.register(Blog, BlogAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(BlogLike, BlogLikeAdmin)
admin.site.register(BlogView, BlogViewAdmin)
