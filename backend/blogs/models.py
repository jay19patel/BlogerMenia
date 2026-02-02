from django.db import models
from django.contrib.auth.models import AbstractUser
from PIL import Image
from django.utils.text import slugify
import mongoengine as me
import datetime

# --- Django Model (Postgres) ---

class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser with additional profile fields.
    Stored in PostgreSQL (default database).
    """
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    headline = models.CharField(max_length=255, null=True, blank=True, help_text="A short professional headline")
    bio = models.TextField(null=True, blank=True, help_text="Bio or about section")

    def __str__(self):
        return self.get_display_name()

    def get_display_name(self):
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.username or self.email.split('@')[0]
    
    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

# --- MongoEngine Documents (MongoDB) ---

class FAQ(me.Document):
    question = me.StringField(max_length=200, required=True)
    answer = me.StringField(required=True)

    def __str__(self):
        return self.question

class Testimonial(me.Document):
    user_id = me.IntField(required=True)
    content = me.StringField(required=True)

    @property
    def user(self):
        try:
            return User.objects.get(pk=self.user_id)
        except User.DoesNotExist:
            return None

    def __str__(self):
        return f"Testimonial from User {self.user_id}"

class Category(me.Document):
    name = me.StringField(max_length=150, unique=True, required=True)
    slug = me.StringField(unique=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Blog(me.Document):
    title = me.StringField(max_length=200, required=True)
    subtitle = me.StringField(max_length=300)
    slug = me.StringField(unique=True)

    excerpt = me.StringField()
    introduction = me.StringField()
    sections = me.ListField() # Flexible JSON/List structure
    conclusion = me.StringField()

    author_id = me.IntField(required=True)
    
    # Reference to Category Document
    category = me.ReferenceField(Category)

    # Store path to image relative to MEDIA_ROOT, or full URL
    thumbnail = me.StringField() 
    
    isPublished = me.BooleanField(default=False)
    publishedDate = me.DateTimeField()
    views = me.IntField(default=0)
    liked_by = me.ListField(me.IntField(), default=list) # List of User IDs
    
    created_at = me.DateTimeField(default=datetime.datetime.now)
    updated_at = me.DateTimeField(default=datetime.datetime.now)
    
    # Store embeddings as list of floats
    embedding = me.ListField(me.FloatField())

    meta = {
        'indexes': ['slug', 'author_id', 'isPublished', 'created_at'],
        'ordering': ['-created_at']
    }

    @property
    def author(self):
        try:
            return User.objects.get(pk=self.author_id)
        except User.DoesNotExist:
            return None

    @property
    def likes(self):
        return len(self.liked_by)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        
        self.updated_at = datetime.datetime.now()
        
        if self.isPublished and not self.publishedDate:
            self.publishedDate = datetime.datetime.now()
        elif not self.isPublished:
            self.publishedDate = None
        
        super().save(*args, **kwargs)

    def __str__(self):
        return self.slug

class Playlist(me.Document):
    owner_id = me.IntField(required=True)
    name = me.StringField(max_length=200, required=True)
    slug = me.StringField(unique=True)
    description = me.StringField()
    thumbnail = me.StringField() # Path/URL
    
    # List of References to Blog
    blogs = me.ListField(me.ReferenceField(Blog))
    
    is_public = me.BooleanField(default=True)
    created_at = me.DateTimeField(default=datetime.datetime.now)
    updated_at = me.DateTimeField(default=datetime.datetime.now)

    meta = {
        'indexes': ['slug', 'owner_id'],
        'ordering': ['-created_at']
    }

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            # Check for existing slug in Mongo
            while Playlist.objects(slug=slug).count() > 0:
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        
        self.updated_at = datetime.datetime.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def owner(self):
        try:
            return User.objects.get(pk=self.owner_id)
        except User.DoesNotExist:
            return None
