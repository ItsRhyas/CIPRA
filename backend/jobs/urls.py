"""URL routing for the jobs app."""

from __future__ import annotations

from django.urls import path

from jobs.views import ConvertView, PublishGcodeView

urlpatterns = [
    path("convert", ConvertView.as_view(), name="convert"),
    path("convert/", ConvertView.as_view(), name="convert-slash"),
    path("gcode/publish", PublishGcodeView.as_view(), name="gcode-publish"),
    path("gcode/publish/", PublishGcodeView.as_view(), name="gcode-publish-slash"),
]
