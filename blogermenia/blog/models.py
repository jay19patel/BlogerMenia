from django.db import models
from django.conf import settings
from django.utils.text import slugify


CATEGORY_COLORS = {
    'blue': ('text-blue-600', 'bg-blue-50'),
    'rose': ('text-rose-600', 'bg-rose-50'),
    'amber': ('text-amber-600', 'bg-amber-50'),
    'purple': ('text-purple-600', 'bg-purple-50'),
    'teal': ('text-teal-600', 'bg-teal-50'),
    'indigo': ('text-indigo-600', 'bg-indigo-50'),
}


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    color = models.CharField(max_length=20, default='blue', choices=[(k, k) for k in CATEGORY_COLORS])

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def text_class(self):
        return CATEGORY_COLORS.get(self.color, CATEGORY_COLORS['blue'])[0]

    @property
    def bg_class(self):
        return CATEGORY_COLORS.get(self.color, CATEGORY_COLORS['blue'])[1]

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']


class Playlist(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='playlist_images/', blank=True, null=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='playlists')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class Blog(models.Model):
    title = models.CharField(max_length=255)
    content = models.TextField()
    image = models.ImageField(upload_to='blog_images/', blank=True, null=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blogs')
    playlists = models.ManyToManyField(Playlist, related_name='blogs', blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='blogs')
    is_published = models.BooleanField(default=True)
    read_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    def like_count(self):
        return self.likes.count()

    def is_liked_by(self, user):
        if user.is_authenticated:
            return self.likes.filter(user=user).exists()
        return False


class Like(models.Model):
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blog', 'user')

    def __str__(self):
        return f"{self.user.username} likes {self.blog.title}"
