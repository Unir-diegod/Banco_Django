from __future__ import annotations

from pathlib import Path


# Permite `import events.*` apuntando al código real en `loan_system/events/*`.
_alt = Path(__file__).resolve().parent.parent / "loan_system" / "events"
if _alt.exists():
    __path__.append(str(_alt))
