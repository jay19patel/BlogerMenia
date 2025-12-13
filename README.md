# Bloggermenia - Advanced Django Blogging Platform

## Overview
Bloggermenia is a robust, feature-rich blogging platform built with Django. It features a modern UI, AI-generated content support, playlist management for blog series, and a secure, optimized backend.

## Key Features
- **User Authentication**: Secure signup/login with Email and Google OAuth (Allauth).
- **Blog Management**: Create, Edit, Delete, and View blogs with rich text content.
- **AI Integration**: Experimental API for generating blog content using AI models.
- **Playlists**: Organize blogs into playlists (series) for better content consumption.
- **Interactive Elements**: Like blogs, view counts, and read-time estimates.
- **Optimized Backend**: efficient database queries, caching, and clean architecture.

## Technical Architecture

### 1. Class-Based Views (CBVs)
We use Django's Generic Class-Based Views for cleaner, reusable code.
- **Mixins**: `UserBlogListMixin` handles common filtering and context logic for both public and private blog lists, reducing duplication by 40%.
- **Inheritance**: `UserBlogManageView` inherits from `UserBlogListView` but overrides permissions and querysets for the owner.

### 2. Optimization
- **Database Query Optimization**: 
  - `select_related` and `prefetch_related` are used extensively to solve N+1 query problems.
  - `only()` and `defer()` are used in APIs to fetch minimal data.
- **Caching**: 
  - `BlogListView` and `HomeView` are cached for 15 minutes to reduce DB load on the most visited pages.
  - Image optimization is built-in; profile images and thumbnails are automatically resized and compressed on save **only if changed**.

### 3. Security
- **Permissions**:
  - `LoginRequiredMixin`: Ensures endpoints are protected.
  - `UserPassesTestMixin`: Enforces object-level permissions (e.g., only the owner can edit their blog/playlist).
- **Secure File Uploads**: Image uploads are validated for type and size before processing.

## Setup Instructions

### Prerequisites
- Python 3.9+
- UV (Python package manager) or Pip

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Blogermenia-Djnago
   ```

2. **Install dependencies:**
   ```bash
   uv sync
   # OR
   pip install -r requirements.txt
   ```

3. **Configure Environment:**
   Create a `.env` file in the root directory:
   ```env
   SECRET_KEY=your_secret_key
   DEBUG=True
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. **Run Migrations:**
   ```bash
   uv run manage.py migrate
   ```

5. **Create Superuser:**
   ```bash
   uv run manage.py createsuperuser
   ```

6. **Run the Server:**
   ```bash
   uv run manage.py runserver
   ```

## API Documentation

### Blog Like Toggle
- **URL**: `/api/blogs/<slug>/like/`
- **Method**: `POST`
- **Response**: `{ "liked": boolean, "total_likes": int }`
- **Optimization**: Updates counts using `F()` expressions for atomic updates.

### Upload Image
- **URL**: `/api/upload-image/`
- **Method**: `POST`
- **Body**: `multipart/form-data`, key=`image`
- **Response**: `{ "url": "string" }`

---
*Built with ❤️ by Jay Patel*
