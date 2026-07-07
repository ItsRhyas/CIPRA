"""Root URL configuration for the CIPRA backend."""

from __future__ import annotations

from django.urls import include, path

urlpatterns = [
    path("api/v1/", include("jobs.urls")),
]
