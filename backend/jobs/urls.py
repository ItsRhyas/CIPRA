"""URL routing for the jobs app."""

from __future__ import annotations

from django.urls import path

from jobs.views import ConvertView

urlpatterns = [
    path("convert/", ConvertView.as_view(), name="convert"),
]
