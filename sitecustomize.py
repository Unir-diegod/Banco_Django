"""Bootstrap de PYTHONPATH para herramientas (pytest-django, etc.).

Python importa automáticamente `sitecustomize` si está disponible en sys.path.
Esto nos permite añadir `loan_system/` al path sin requerir pasos manuales.
"""

from __future__ import annotations

import sys
from pathlib import Path


_root = Path(__file__).resolve().parent
_src = _root / "loan_system"

if _src.exists() and str(_src) not in sys.path:
    sys.path.insert(0, str(_src))
