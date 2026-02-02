from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Note
from .serializers import NoteSerializer
from utils.mongo import MongoEngineViewSet

class NoteViewSet(MongoEngineViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'id' # Mongo objectId

    def get_queryset(self):
        # By default, show public notes.
        # If user is filtering by "my_notes", show their own notes.
        if self.action == 'list':
            return Note.objects(is_public=True).order_by('-created_at')
        return Note.objects.all()

    def perform_create(self, serializer):
        # Handled in serializer.create
        serializer.save()

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_notes(self, request):
        notes = list(Note.objects(user_id=request.user.id).order_by('-created_at'))
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        note = self.get_object()
        user_id = request.user.id
        if user_id in note.liked_by:
            note.liked_by.remove(user_id)
            status_msg = 'unliked'
        else:
            note.liked_by.append(user_id)
            status_msg = 'liked'
        
        note.save()
        return Response({'status': status_msg, 'total_likes': note.total_likes})
