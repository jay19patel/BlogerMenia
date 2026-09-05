# Backend Architecture & Coding Style Guide

> **Standardized Django Template Views + Services & Selectors Architecture**
> 
> This document defines the exact folder structure, design patterns, coding style, and guidelines used in this backend. Use this guide as a template to build any scalable, maintainable Python/Django service using standard Django views, HTML templates, forms, and services & selectors.

---

## 1. Core Technology Stack & Architecture Overview

* **Python Runtime**: Python 3.11+
* **Package Management**: `uv` (`pyproject.toml`, `uv.lock`)
* **Core Framework**: Django 5.x / 6.x (Standard Django Views, Templates & Forms)
* **Authentication**: Standard Django Auth (`django.contrib.auth`)
* **Architecture Pattern**: Layered Modular Architecture (**Services & Selectors Pattern** inspired by HackSoft guidelines)
* **Testing Stack**: `pytest`, `pytest-django`, `factory-boy`
* **Configuration Management**: `python-dotenv` (`.env`, `.env.example`)

---

## 2. Directory Structure Blueprint

The project uses `config/` for global/shared concerns (global views, base models, cross-cutting services) and domain app directories for feature modules.

```text
crm.njtechstudio/
├── .env.example               # Template for environment variables
├── pyproject.toml             # Project metadata & dependencies managed via uv
├── uv.lock                    # Locked dependency versions
├── manage.py                  # Django CLI manager
│
├── config/                    # Global Project Configuration & Cross-Cutting Concerns
│   ├── __init__.py
│   ├── settings.py            # Main Django settings
│   ├── urls.py                # Root URL router & home route
│   ├── views.py               # Global views (HomeView / Hello World)
│   ├── models.py              # Base abstract models (TimeStampedModel)
│   ├── wsgi.py                # WSGI entrypoint
│   ├── asgi.py                # ASGI entrypoint
│   └── services/              # Cross-cutting services (communication.py, mailers)
│       ├── __init__.py
│       └── communication.py
│
├── templates/                 # HTML Templates Directory
│   ├── base.html              # Base layout template
│   ├── index.html             # Hello World home page template
│   └── accounts/              # Accounts domain templates
│       ├── login.html
│       ├── register.html
│       ├── profile.html
│       ├── address_list.html
│       └── contact_list.html
│
└── accounts/                  # Accounts Domain App Directory
    ├── __init__.py
    ├── admin.py               # Django Admin registration
    ├── apps.py                # AppConfig
    ├── urls.py                # App-level HTML routes
    │
    ├── models/                # Domain Models (Address, Contact)
    │   ├── __init__.py
    │   └── user_profile.py
    │
    ├── services/              # Sub-package for Write Operations & Business Logic
    │   ├── __init__.py
    │   └── account_service.py # Atomic transactions, profile updates, register
    │
    ├── selectors/             # Sub-package for Read Operations & Queries
    │   ├── __init__.py
    │   └── account_selector.py# Optimized QuerySets (get_addresses_for_user)
    │
    ├── forms/                 # Sub-package for Django Forms
    │   ├── __init__.py
    │   └── account_forms.py   # RegisterForm, LoginForm, AddressForm, ContactForm
    │
    └── views/                 # Sub-package for Django Class-Based Views
        ├── __init__.py
        ├── auth.py            # RegisterView, LoginView, LogoutView, ProfileView
        └── customer.py        # AddressListView, ContactListView
```

---

## 3. Component Responsibilities & Rules

### 3.1 Domain Models (`app/models/` & `config/models.py`)
* Base abstract models live in `config/models.py` (e.g. `TimeStampedModel`).
* Domain models inherit from `TimeStampedModel` in `config.models`.

### 3.2 Services Layer (`app/services/` & `config/services/`)
* **Purpose**: Encapsulates **ALL** data mutations, state changes, and side-effects.
* `config/services/` holds shared utilities (e.g. `CommunicationService`).
* Domain services live in `app/services/`.

### 3.3 Selectors Layer (`app/selectors/`)
* Pure read queries with zero side-effects using `.select_related()` and `.prefetch_related()`.

### 3.4 Django Views Layer (`app/views/` & `config/views.py`)
* `config/views.py` contains global views like `HomeView` rendering `templates/index.html`.
* App views contain feature-specific Class-Based Views.
