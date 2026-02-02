class HybridRouter:
    """
    A router to control all database operations on models in the
    blogs, notes, and playlists applications.
    """
    
    route_app_labels = {'blogs', 'notes', 'playlists'}

    def db_for_read(self, model, **hints):
        """
        Attempts to read blogs, notes, and playlists models from mongo.
        User model (even if in blogs app) must remain in default (postgres).
        """
        if model._meta.model_name == 'user':
            return 'default'
        if model._meta.app_label in self.route_app_labels:
            return 'mongo'
        return 'default'

    def db_for_write(self, model, **hints):
        """
        Attempts to write blogs, notes, and playlists models to mongo.
        User model must remain in default.
        """
        if model._meta.model_name == 'user':
            return 'default'
        if model._meta.app_label in self.route_app_labels:
            return 'mongo'
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if a model in the auth/users apps is involved.
        Legacy foreign keys might need this, but we are moving to loose coupling.
        """
        if (
            obj1._meta.app_label in self.route_app_labels or
            obj2._meta.app_label in self.route_app_labels
        ):
           return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Make sure the blogs, notes, and playlists apps only appear in the
        'mongo' database.
        User model exception.
        """
        if model_name == 'user':
             return db == 'default'

        if app_label in self.route_app_labels:
            return db == 'mongo'
        
        # All other apps should be migrated to 'default'
        # unless they are explicitly targeted to 'mongo' (none for now)
        return db == 'default'
