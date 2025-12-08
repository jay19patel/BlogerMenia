from django.views.generic import TemplateView, View
from django.contrib import messages
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.views.decorators.http import require_POST
import os
from .forms import UserProfileForm

User = get_user_model()


class HomeView(TemplateView):
    template_name = "home.html"

    testimonials = [
                        {
                            "name": "John Doe",
                            "role": "Developer",
                            "image": "/static/images/user1.jpg",
                            "message": "This platform makes blogging super easy!"
                        },
                        {
                            "name": "Sarah Smith",
                            "role": "Writer",
                            "image": "/static/images/user2.jpg",
                            "message": "AI-generated blogs saved me so much time!"
                        }
                    ]
    faqs = [
                {
                    "question": "How does the AI blog generator work?",
                    "answer": "Our AI uses advanced algorithms to create unique blog content based on your input."
                },
                {
                    "question": "Can I customize the generated blogs?",
                    "answer": "Yes, you can edit and personalize the content as much as you like."
                }
            ]
    extra_context = {"testimonials": testimonials,"faqs":faqs}


    # def get(self, request, *args, **kwargs):
    #     # Example notifications for different types
    #     # You can comment/uncomment these to test different notification types
    #     messages.success(request, "Welcome to BlogerMenia! Your AI-powered blogging platform.")
    #     # messages.error(request, "This is an error message example.")
    #     # messages.warning(request, "This is a warning message example.")
    #     # messages.info(request, "This is an info message example.")
    #     return super().get(request, *args, **kwargs)


class ProfileView(LoginRequiredMixin, View):
    """
    Handle both profile viewing and editing in a single view
    """
    template_name = 'profile.html'

    def get(self, request):
        """
        Display user profile with form for editing
        """
        # Initialize form with current user data
        form = UserProfileForm(instance=request.user)

        context = {
            'form': form,
            'edit_mode': request.GET.get('edit', 'false') == 'true'
        }

        return render(request, self.template_name, context)

    def post(self, request):
        """
        Handle profile update
        """
        # Get the old profile image before updating
        old_image = request.user.profile_image

        form = UserProfileForm(request.POST, request.FILES, instance=request.user)

        if form.is_valid():
            # Check if a new image is being uploaded
            new_image = form.cleaned_data.get('profile_image')

            if new_image and old_image:
                # Delete the old image file if a new one is uploaded
                if old_image.path and os.path.isfile(old_image.path):
                    try:
                        os.remove(old_image.path)
                    except Exception as e:
                        print(f"Error deleting old profile image: {e}")

            form.save()
            messages.success(request, 'Your profile has been updated successfully!')
            return redirect('profile')
        else:
            messages.error(request, 'Please correct the errors below.')

        context = {
            'form': form,
            'edit_mode': True  # Keep edit mode on if there are errors
        }

        return render(request, self.template_name, context)


@login_required
@require_POST
def remove_profile_image(request):
    """
    Remove user's profile image
    """
    try:
        user = request.user

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