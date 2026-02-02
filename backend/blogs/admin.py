from django.contrib import admin
from blogs.models import User

admin.site.site_header = "Blogermenia Admin"
admin.site.site_title = "Blogermenia Admin Portal"
admin.site.index_title = "Welcome to Blogermenia Admin Portal"

class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "is_staff", "is_active", "date_joined")
    search_fields = ("username", "email")
    list_filter = ("is_staff", "is_active")

admin.site.register(User, UserAdmin)
