"""Dump the FastAPI OpenAPI schema as JSON to stdout.

Used by the web type codegen (`@panelos/types`) and the CI OpenAPI-drift check,
so it must not require a running server or a database connection — it only needs
to import the app and call ``app.openapi()``.

Usage:
    python -m panelos_api.scripts.dump_openapi > openapi.json
"""

from __future__ import annotations

import json
import sys

from panelos_api.main import app


def main() -> None:
    schema = app.openapi()
    json.dump(schema, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
