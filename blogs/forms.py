from django import forms
from django.contrib.auth import get_user_model

User = get_user_model()


class UserProfileForm(forms.ModelForm):
    """
    Form for updating user profile information
    """
    username = forms.CharField(
        max_length=150,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent',
            'placeholder': 'Username'
        })
    )

    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent',
            'placeholder': 'Email Address',
            'readonly': 'readonly'
        }),
        disabled=True
    )

    first_name = forms.CharField(
        max_length=150,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent',
            'placeholder': 'First Name'
        })
    )

    last_name = forms.CharField(
        max_length=150,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent',
            'placeholder': 'Last Name'
        })
    )

    headline = forms.CharField(
        max_length=255,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent',
            'placeholder': 'e.g., Frontend Developer at Tech Company'
        })
    )

    bio = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={
            'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none',
            'placeholder': 'Tell us about yourself...',
            'rows': 5
        })
    )

    profile_image = forms.ImageField(
        required=False,
        widget=forms.FileInput(attrs={
            'class': 'hidden',
            'accept': 'image/*',
            'id': 'profile-image-input'
        })
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'headline', 'bio', 'profile_image']

    def clean_profile_image(self):
        """
        Validate profile image size and type
        """
        image = self.cleaned_data.get('profile_image')

        if image:
            # Only validate if it's a new upload (has content_type attribute)
            # If it's an existing ImageFieldFile, skip validation
            if hasattr(image, 'content_type'):
                # Check file size (max 2MB)
                if image.size > 2 * 1024 * 1024:
                    raise forms.ValidationError("Image size should be less than 2MB")

                # Check file type
                if not image.content_type.startswith('image/'):
                    raise forms.ValidationError("Please upload a valid image file")

        return image


# blogs/forms.py
from django import forms
from blogs.models import Blog, Category, Playlist

class BlogCreateForm(forms.ModelForm):
    class Meta:
        model = Blog
        fields = [
            "title",
            "subtitle",
            "slug",
            "excerpt",
            "introduction",
            "sections",
            "conclusion",
            "category",
            "thumbnail",
            "isPublished"
        ]

# -------------------------
# Playlist Form
# -------------------------
class PlaylistForm(forms.ModelForm):
    """
    Form for creating and updating playlists
    """
    def __init__(self, *args, **kwargs):
        # We expect 'user' to be passed in kwargs to filter blogs
        user = kwargs.pop('user', None)
        super(PlaylistForm, self).__init__(*args, **kwargs)
        
        # Style all fields
        for field_name, field in self.fields.items():
            if field_name != 'is_public':
                field.widget.attrs['class'] = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent'
        
        # Specific styling
        self.fields['description'].widget.attrs['rows'] = 4
        self.fields['blogs'].widget.attrs['class'] = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent h-48'
        self.fields['is_public'].widget.attrs['class'] = 'h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded'
        
        # Filter blogs query set if user is provided
        if user:
            # Show only published blogs by this author
            self.fields['blogs'].queryset = Blog.objects.filter(author=user, isPublished=True)

    class Meta:
        model = Playlist
        fields = ['name', 'description', 'thumbnail', 'is_public', 'blogs']
        widgets = {
            'description': forms.Textarea(attrs={'placeholder': 'Describe your playlist...'}),
            'blogs': forms.SelectMultiple(attrs={'placeholder': 'Select blogs to add...'})
        }
        help_texts = {
            'blogs': 'Hold down "Control", or "Command" on a Mac, to select more than one.'
        }
