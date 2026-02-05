from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from notes.models import Note
from notes.api.serializers import NoteSerializer
from blogs.api.paginations import StandardResultsSetPagination

class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    lookup_field = 'id'

    def get_queryset(self):
        # By default, show public notes.
        if self.action == 'list':
            return Note.objects.filter(is_public=True).order_by('-created_at')
        return Note.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        # Allow serializer to handle context logic
        serializer.save()

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_notes(self, request):
        notes = Note.objects.filter(user=request.user).order_by('-created_at')
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        note = self.get_object()
        user = request.user
        
        if note.liked_by.filter(id=user.id).exists():
            note.liked_by.remove(user)
            status_msg = 'unliked'
        else:
            note.liked_by.add(user)
            status_msg = 'liked'
        
        return Response({'status': status_msg, 'total_likes': note.total_likes})
