
from django.urls import path
from blogs.Views import home,blogs,account

urlpatterns = [
    path('', home.HomeView.as_view(), name='home'),

    # Blog URLs
    path('blogs/', blogs.BlogListView.as_view(), name='blogs-list'),
    path('blogs/create/', blogs.BlogCreateView.as_view(), name='blog-create'),
    path('blogs/<str:username>/', blogs.UserBlogListView.as_view(), name='user-blogs'),
    path('blogs/<str:username>/<slug:slug>/', blogs.BlogDetailView.as_view(), name='blog-detail'),

    # Profile URLs
    path('profile/', account.ProfileView.as_view(), name='profile'),
]
