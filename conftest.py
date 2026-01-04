import sys
from pathlib import Path


# Asegura que `loan_system/` esté en sys.path antes de que pytest-django
# intente importar DJANGO_SETTINGS_MODULE.
PROJECT_SRC = Path(__file__).resolve().parent / "loan_system"
if str(PROJECT_SRC) not in sys.path:
    sys.path.insert(0, str(PROJECT_SRC))
