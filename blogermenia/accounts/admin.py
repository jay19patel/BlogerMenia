from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'date_joined')
    fieldsets = UserAdmin.fieldsets + (
        ('Profile', {'fields': ('bio', 'about', 'profile_picture', 'linkedin_url')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Profile', {'fields': ('bio', 'about', 'profile_picture', 'linkedin_url')}),
    )
