from django.urls import path
from . import views

urlpatterns = [
    # Public Feed (Read Only)
    path('', views.NoteFeedView.as_view(), name='note_feed'),

    # My Notes Dashboard (as requested: /notes/edit)
    path('edit/', views.MyNoteListView.as_view(), name='my_note_list'),
    
    # CRUD
    path('create/', views.NoteCreateView.as_view(), name='create_note'),
    path('<int:pk>/edit/', views.NoteUpdateView.as_view(), name='edit_note'),
    path('<int:pk>/delete/', views.NoteDeleteView.as_view(), name='delete_note'),
    
    # Actions
    path('<int:pk>/like/', views.LikeNoteView.as_view(), name='like_note'),
    
    # Detail View
    path('<int:pk>/', views.NoteDetailView.as_view(), name='note_detail'),
]
