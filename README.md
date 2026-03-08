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

---

## Architecture

The project has been restructured to have a dedicated `backend` directory containing the Django application and a `frontend` directory (if applicable) for the client-side code.

### Directory Structure
- `backend/`: Django project files, apps, and configuration.
- `frontend/`: Next.js frontend application.


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

2. **Navigate to Backend:**
   ```bash
   cd backend
   ```

3. **Install dependencies:**
   ```bash
   uv sync
   # OR
   pip install -r requirements.txt
   ```

4. **Configure Environment:**
   Create a `.env` file in the `backend/` directory:
   ```env
   SECRET_KEY=your_secret_key
   DEBUG=True
   MISTRAL_API_KEY=your_mistral_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

5. **Run Migrations:**
   ```bash
   uv run manage.py migrate
   ```

6. **Create Superuser:**
   ```bash
   uv run manage.py createsuperuser
   ```

7. **Run the Server:**
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
