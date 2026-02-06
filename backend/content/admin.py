from django.contrib import admin
from .models import FAQ, Testimonial, ContactMessage

# Register your models here.
admin.site.register(FAQ)
admin.site.register(Testimonial)

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'email', 'subject', 'message')
    readonly_fields = ('created_at',)
