from __future__ import annotations

from pathlib import Path


# Permite `import infrastructure.*` apuntando al código real en `loan_system/infrastructure/*`.
_alt = Path(__file__).resolve().parent.parent / "loan_system" / "infrastructure"
if _alt.exists():
    __path__.append(str(_alt))
