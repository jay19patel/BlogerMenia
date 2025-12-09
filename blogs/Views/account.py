from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import UpdateView
from django.urls import reverse_lazy
from blogs.forms import UserProfileForm
from django.contrib import messages
from django.http import JsonResponse
import os


class ProfileView(LoginRequiredMixin, UpdateView):
    """
    Handle profile viewing and editing using UpdateView
    """
    template_name = 'profile.html'
    form_class = UserProfileForm
    success_url = reverse_lazy('profile')

    def get_object(self, queryset=None):
        """
        Return the current logged-in user
        """
        return self.request.user

    def get_context_data(self, **kwargs):
        """
        Add edit_mode to context
        """
        context = super().get_context_data(**kwargs)
        # Check if we're in edit mode (from URL parameter or form errors)
        context['edit_mode'] = self.request.GET.get('edit', 'false') == 'true' or bool(context['form'].errors)
        return context

    def post(self, request, *args, **kwargs):
        """
        Handle profile update and image removal
        """
        # Check if this is a remove image request
        if request.POST.get('action') == 'remove_image':
            return self.remove_profile_image()

        # Get the object before form processing
        self.object = self.get_object()
        old_image = self.object.profile_image

        form = self.get_form()

        if form.is_valid():
            # Check if a new image is being uploaded
            new_image = form.cleaned_data.get('profile_image')

            # Delete old image if new one is uploaded
            if new_image and old_image and new_image != old_image:
                if old_image.path and os.path.isfile(old_image.path):
                    try:
                        os.remove(old_image.path)
                    except Exception as e:
                        print(f"Error deleting old profile image: {e}")

            return self.form_valid(form)
        else:
            return self.form_invalid(form)

    def form_valid(self, form):
        """
        Called when form is valid
        """
        messages.success(self.request, 'Your profile has been updated successfully!')
        return super().form_valid(form)

    def form_invalid(self, form):
        """
        Called when form is invalid
        """
        messages.error(self.request, 'Please correct the errors below.')
        return super().form_invalid(form)

    def remove_profile_image(self):
        """
        Remove user's profile image (integrated into the view)
        """
        try:
            user = self.request.user

            # Delete the physical file if it exists
            if user.profile_image:
                if user.profile_image.path and os.path.isfile(user.profile_image.path):
                    try:
                        os.remove(user.profile_image.path)
                    except Exception as e:
                        print(f"Error deleting profile image file: {e}")

                # Clear the profile_image field in the database
                user.profile_image = None
                user.save()

            return JsonResponse({'success': True, 'message': 'Profile image removed successfully'})

        except Exception as e:
            print(f"Error removing profile image: {e}")
            return JsonResponse({'success': False, 'message': 'Failed to remove profile image'}, status=400)