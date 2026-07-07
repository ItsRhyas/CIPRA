#!/usr/bin/env python3
"""Generate backend/pipeline/types.py from shared/api-contract.json."""

from __future__ import annotations

import json
import textwrap
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "shared" / "api-contract.json"
OUTPUT_PATH = ROOT / "backend" / "pipeline" / "types.py"

PRIMITIVE_TYPES = {
    "string": "str",
    "integer": "int",
    "number": "float",
    "boolean": "bool",
}

# Types that are maintained in dedicated backend modules rather than generated.
# Format: class name -> (import line, absolute module path for type checking).
EXTERNAL_TYPES = {
    "ScaraConfig": ("from gcode.config import ScaraConfig", "backend.gcode.config.ScaraConfig"),
}

PIPELINE_TYPES = '''


@dataclass
class Warning:
    """Structured warning emitted by a pipeline stage."""

    message: str
    stage: str | None = None
    code: str = ""


@dataclass
class StageResult:
    """Output of a single vision-pipeline stage."""

    data: Any
    warnings: list[Warning] = field(default_factory=list)
    stage_name: str = ""


@dataclass
class PipelineOutput:
    """Final aggregated output of the vision pipeline."""

    coordinates: list[tuple[float, float]] = field(default_factory=list)
    warnings: list[Warning] = field(default_factory=list)
    stages_run: list[str] = field(default_factory=list)
'''


def _ref_name(ref: str) -> str:
    """Return the class name from a JSON Schema $ref."""
    return ref.rsplit("/", 1)[-1]


def _python_type(prop: dict[str, Any]) -> str:
    """Map a JSON Schema property to a Python type annotation."""
    if "$ref" in prop:
        return _ref_name(prop["$ref"])

    schema_type = prop.get("type")
    if schema_type == "array":
        item_type = _python_type(prop.get("items", {}))
        return f"list[{item_type}]"
    if schema_type == "object":
        return "dict[str, Any]"
    if schema_type == "string" and prop.get("contentEncoding") == "base64":
        return "bytes"

    return PRIMITIVE_TYPES.get(schema_type, "Any")


def _default_value(prop: dict[str, Any], annotation: str, is_required: bool) -> str | None:
    """Return a Python literal default for a property, or None if required."""
    if is_required:
        return None
    if "default" in prop:
        default = prop["default"]
        if annotation.startswith("list[") and default == []:
            return "field(default_factory=list)"
        return repr(default)
    if annotation.startswith("list["):
        return "field(default_factory=list)"
    return None


def _emit_field(name: str, prop: dict[str, Any], required: set[str]) -> str:
    """Emit one dataclass field declaration."""
    annotation = _python_type(prop)
    is_required = name in required

    if not is_required and "default" not in prop and not annotation.startswith("list["):
        annotation = f"{annotation} | None"

    default = _default_value(prop, annotation, is_required)
    if is_required and default is None:
        return f"    {name}: {annotation}"
    if default is None:
        default = "None"
    return f"    {name}: {annotation} = {default}"


def _emit_class(name: str, schema: dict[str, Any]) -> str:
    """Emit a single @dataclass from a JSON Schema object definition."""
    description = schema.get("description", name).rstrip(".")
    wrapped = textwrap.wrap(f"{description}.", width=80)
    if len(wrapped) == 1:
        docstring = f'    """{wrapped[0]}"""'
    else:
        docstring = '\n'.join(
            ['    """'] + [f"    {line}" for line in wrapped] + ['    """']
        )
    lines = [
        "",
        "",
        "@dataclass",
        f"class {name}:",
        docstring,
        "",
    ]

    properties = schema.get("properties", {})
    required = set(schema.get("required", []))

    if properties:
        required_props = [(n, p) for n, p in properties.items() if n in required]
        optional_props = [(n, p) for n, p in properties.items() if n not in required]
        for field_name, prop in required_props + optional_props:
            lines.append(_emit_field(field_name, prop, required))
    else:
        lines.append("    pass")

    return "\n".join(lines)


def generate(schema: dict[str, Any]) -> str:
    """Return the full types.py source for the given schema."""
    imports = [
        '"""Shared pipeline and API contract types."""',
        "",
        "from __future__ import annotations",
        "",
        "from dataclasses import dataclass, field",
        "from typing import Any",
    ]

    definitions = schema.get("$defs", {})
    external_imports = []
    for name in sorted(definitions):
        if name in EXTERNAL_TYPES:
            external_imports.append(EXTERNAL_TYPES[name][0])
            continue

    if external_imports:
        parts = imports + [""] + external_imports
    else:
        parts = imports

    for name in sorted(definitions):
        if name in EXTERNAL_TYPES:
            continue
        parts.append(_emit_class(name, definitions[name]))

    parts.append(PIPELINE_TYPES)
    parts.append("")
    return "\n".join(parts)


def main() -> None:
    """Read the contract schema and write the generated types module."""
    schema_text = SCHEMA_PATH.read_text(encoding="utf-8")
    schema = json.loads(schema_text)

    if "$schema" not in schema:
        raise ValueError("Schema is missing '$schema' keyword")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(generate(schema), encoding="utf-8")
    print(f"Generated {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
