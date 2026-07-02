from django import forms
from .models import ContactEntry

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
