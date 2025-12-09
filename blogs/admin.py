from django.contrib import admin

# Register your models here.
admin.site.site_header = "Blogermenia Admin"
admin.site.site_title = "Blogermenia Admin Portal"
admin.site.index_title = "Welcome to Blogermenia Admin Portal"
from blogs.models import Blog, Category
admin.site.register(Blog)
admin.site.register(Category)

