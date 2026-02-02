from rest_framework import viewsets
from django.http import Http404

class MongoEngineViewSet(viewsets.ModelViewSet):
    """
    A ViewSet that overrides get_object to work with MongoEngine QuerySets.
    """
    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        
        assert lookup_url_kwarg in self.kwargs, (
            'Expected view %s to be called with a URL keyword argument '
            'named "%s". Fix your URL conf, or set the `.lookup_field` '
            'attribute on the view correctly.' %
            (self.__class__.__name__, lookup_url_kwarg)
        )
        
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        try:
            obj = queryset.get(**filter_kwargs)
        except queryset._document.DoesNotExist:
            raise Http404
            
        self.check_object_permissions(self.request, obj)
        return obj
