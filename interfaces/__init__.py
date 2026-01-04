from __future__ import annotations

from pathlib import Path


# Permite `import interfaces.*` apuntando al código real en `loan_system/interfaces/*`.
_alt = Path(__file__).resolve().parent.parent / "loan_system" / "interfaces"
if _alt.exists():
    __path__.append(str(_alt))
