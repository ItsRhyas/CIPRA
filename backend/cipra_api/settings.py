"""Django settings for the CIPRA backend."""

from __future__ import annotations

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.environ.get("DJANGO_DEBUG", "false").lower() in {"1", "true", "yes"}

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if DEBUG:
    SECRET_KEY = SECRET_KEY or "django-insecure-dev-key-not-for-production"
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DEBUG is disabled.")

APPEND_SLASH = False

ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend").split(",")

INSTALLED_APPS = [
    "daphne",
    "channels",
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
    "jobs",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "cipra_api.middleware.LargeUploadMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
]

# Security hardening. SECURE_SSL_REDIRECT is intentionally NOT enabled: it
# would break plain-HTTP tests and the deployment behind a TLS-terminating
# proxy.
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_REFERRER_POLICY = "same-origin"

ROOT_URLCONF = "cipra_api.urls"

WSGI_APPLICATION = "cipra_api.wsgi.application"
ASGI_APPLICATION = "cipra_api.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# File uploads: 10 MB limit for the convert endpoint.
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.JSONParser",
    ],
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.AnonRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"anon": "20/min"},
}
