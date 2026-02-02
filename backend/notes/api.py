from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Note
from .serializers import NoteSerializer

class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # By default, show public notes.
        # If user is filtering by "my_notes", show their own notes.
        if self.action == 'list':
            return Note.objects.filter(is_public=True).order_by('-created_at')
        return Note.objects.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_notes(self, request):
        notes = Note.objects.filter(user=request.user).order_by('-created_at')
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        note = self.get_object()
        if note.likes.filter(id=request.user.id).exists():
            note.likes.remove(request.user)
            return Response({'status': 'unliked', 'total_likes': note.total_likes})
        else:
            note.likes.add(request.user)
            return Response({'status': 'liked', 'total_likes': note.total_likes})
