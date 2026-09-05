from django import forms
from .models import ContactEntry, Playlist, Blog


class PlaylistForm(forms.ModelForm):
    blogs = forms.ModelMultipleChoiceField(
        queryset=Blog.objects.none(),
        required=False,
    )

    class Meta:
        model = Playlist
        fields = ['title', 'description', 'image']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all',
                'placeholder': 'e.g., Essential Reading for Builders'
            }),
            'description': forms.Textarea(attrs={
                'class': 'w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all min-h-[120px]',
                'rows': 4,
                'placeholder': 'What is this collection about?'
            }),
        }

    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        if user is not None:
            self.fields['blogs'].queryset = Blog.objects.filter(author=user)
        if self.instance.pk:
            self.fields['blogs'].initial = self.instance.blogs.all()

    def save(self, commit=True):
        instance = super().save(commit=commit)
        if commit:
            instance.blogs.set(self.cleaned_data['blogs'])
        return instance


class ContactForm(forms.ModelForm):
    class Meta:
        model = ContactEntry
        fields = ['name', 'email', 'subject', 'message']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors', 'placeholder': 'Your Name'}),
            'email': forms.EmailInput(attrs={'class': 'w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors', 'placeholder': 'your@email.com'}),
            'subject': forms.TextInput(attrs={'class': 'w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors', 'placeholder': 'How can we help?'}),
            'message': forms.Textarea(attrs={'class': 'w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors', 'placeholder': 'Write your message here...', 'rows': 5}),
        }
