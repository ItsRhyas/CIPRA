"""Root URL configuration for the CIPRA backend."""

from __future__ import annotations

from django.urls import include, path

from jobs.views import HealthCheckView

urlpatterns = [
    path("api/v1/", include("jobs.urls")),
    path("health/", HealthCheckView.as_view(), name="health"),
]
