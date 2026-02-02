from django.conf import settings
import mongoengine as me
import datetime

class Note(me.Document):
    user_id = me.IntField(required=True)
    title = me.StringField(max_length=200, required=True)
    content = me.StringField()
    tags = me.StringField(max_length=500, help_text="Comma-separated tags")
    
    liked_by = me.ListField(me.IntField(), default=list)
    
    is_public = me.BooleanField(default=True)

    created_at = me.DateTimeField(default=datetime.datetime.now)
    updated_at = me.DateTimeField(default=datetime.datetime.now)

    meta = {
        'indexes': ['user_id', 'created_at'],
        'ordering': ['-created_at']
    }

    def __str__(self):
        return self.title

    @property
    def user(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            return User.objects.get(pk=self.user_id)
        except User.DoesNotExist:
            return None

    @property
    def total_likes(self):
        return len(self.liked_by)

    def get_tags_list(self):
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
