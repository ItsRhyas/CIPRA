#!/usr/bin/env python
"""Django management entry point for the CIPRA backend."""

from __future__ import annotations

import os
import sys


def main() -> None:
    """Run Django management commands."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cipra_api.settings")
    # Allow importing project modules when running ``python backend/manage.py``
    # from the repository root.
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Could not import Django. Make sure it is installed and available on your "
            "PYTHONPATH environment variable. Did you forget to activate a virtual "
            "environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
