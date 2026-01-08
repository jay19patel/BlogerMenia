from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView, View
from django.urls import reverse_lazy, reverse
from django.http import HttpResponseRedirect, JsonResponse
from .models import Note
from .forms import NoteForm

# --- Public Feed (Read Only) ---

class NoteFeedView(LoginRequiredMixin, ListView):
    model = Note
    template_name = 'notes/note_feed.html'
    context_object_name = 'notes'

    def get_queryset(self):
        # Show all notes (assuming feed is public). Default is_public=True.
        # Order by newest first.
        return Note.objects.filter(is_public=True).order_by('-created_at')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # We can add extra context if needed, e.g. for sidebar
        return context

# --- Note Detail (Read Only) ---

class NoteDetailView(LoginRequiredMixin, DetailView):
    model = Note
    template_name = 'notes/note_detail.html'
    context_object_name = 'note'

# --- My Notes (Editable Dashboard) ---

class MyNoteListView(LoginRequiredMixin, ListView):
    model = Note
    template_name = 'notes/my_note_list.html'
    context_object_name = 'notes'

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user).order_by('-updated_at')

class NoteCreateView(LoginRequiredMixin, CreateView):
    model = Note
    form_class = NoteForm
    template_name = 'notes/note_form.html'
    success_url = reverse_lazy('my_note_list')

    def form_valid(self, form):
        form.instance.user = self.request.user
        return super().form_valid(form)

class NoteUpdateView(LoginRequiredMixin, UpdateView):
    model = Note
    form_class = NoteForm
    template_name = 'notes/note_form.html'
    success_url = reverse_lazy('my_note_list')

    def get_queryset(self):
        # prevent editing others' notes
        return Note.objects.filter(user=self.request.user)

class NoteDeleteView(LoginRequiredMixin, DeleteView):
    model = Note
    success_url = reverse_lazy('my_note_list')

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user)

# --- Like Functionality ---

class LikeNoteView(LoginRequiredMixin, View):
    def post(self, request, pk, *args, **kwargs):
        note = get_object_or_404(Note, pk=pk)
        if note.likes.filter(id=request.user.id).exists():
            note.likes.remove(request.user)
            liked = False
        else:
            note.likes.add(request.user)
            liked = True
        
        # If ajax request, return json
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
             return JsonResponse({'liked': liked, 'count': note.total_likes})
        
        # Fallback to redirect
        return HttpResponseRedirect(request.META.get('HTTP_REFERER', reverse('note_feed')))
