from __future__ import annotations

from pathlib import Path


# Permite `import domain.*` apuntando al código real en `loan_system/domain/*`.
_alt = Path(__file__).resolve().parent.parent / "loan_system" / "domain"
if _alt.exists():
    __path__.append(str(_alt))
