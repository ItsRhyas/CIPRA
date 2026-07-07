"""Django app configuration for jobs."""

from __future__ import annotations

from django.apps import AppConfig


class JobsConfig(AppConfig):
    """Configuration for the jobs app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "jobs"
