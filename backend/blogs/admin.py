from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Blog, Category, Playlist, BlogLike, BlogView, FAQ, Testimonial

admin.site.site_header = "Blogermenia Admin"
admin.site.site_title = "Blogermenia Admin Portal"
admin.site.index_title = "Welcome to Blogermenia Admin Portal"

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ("username", "email", "first_name", "last_name", "is_staff", "is_active", "date_joined")
    fieldsets = UserAdmin.fieldsets + (
        ('Profile Info', {'fields': ('profile_image', 'headline', 'bio')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Profile Info', {'fields': ('profile_image', 'headline', 'bio')}),
    )

class BlogAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'isPublished', 'publishedDate', 'views', 'likes', 'created_at')
    list_filter = ('isPublished', 'category', 'created_at')
    search_fields = ('title', 'slug', 'author__username')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('views', 'likes', 'created_at', 'updated_at')

class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

class PlaylistAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'is_public', 'created_at')
    search_fields = ('name', 'owner__username')
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

admin.site.register(User, CustomUserAdmin)
admin.site.register(Blog, BlogAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(Playlist, PlaylistAdmin)
admin.site.register(BlogLike, BlogLikeAdmin)
admin.site.register(BlogView, BlogViewAdmin)
admin.site.register(FAQ)
admin.site.register(Testimonial)
