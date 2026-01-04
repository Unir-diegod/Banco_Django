from __future__ import annotations

from pathlib import Path


# Permite `import application.*` apuntando al código real en `loan_system/application/*`.
_alt = Path(__file__).resolve().parent.parent / "loan_system" / "application"
if _alt.exists():
    __path__.append(str(_alt))
