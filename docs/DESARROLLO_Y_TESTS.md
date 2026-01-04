# Desarrollo y Tests

## Instalación (Windows)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Crear `.env`:
```powershell
copy .env.example .env
```

## Ejecutar Django

```powershell
C:/Users/diego/OneDrive/Desktop/Banco/.venv/Scripts/python.exe loan_system/manage.py migrate
C:/Users/diego/OneDrive/Desktop/Banco/.venv/Scripts/python.exe loan_system/manage.py runserver
```

## Tests

Se usa `pytest` + `pytest-django`.

Config: `pytest.ini`
- `DJANGO_SETTINGS_MODULE=infrastructure.config.settings`
- `django_find_project=false` (se apoya en la estructura del repo y los shims de import)

Ejecutar:
```bash
pytest
```

## Convenciones

- Domain:
  - Mantener código puro (sin imports Django/DRF).
  - Validaciones e invariantes viven aquí.

- Application:
  - Los Use Cases reciben puertos (repositorios) por inyección.
  - Lanzan excepciones tipadas (`Forbidden`, `NotFound`, `Conflict`) para mapear a HTTP.

- Infrastructure:
  - Repositorios ORM implementan los puertos.
  - Transacciones se definen en el adaptador de entrada (views) y se usan locks (`select_for_update`) para operaciones críticas.

## Añadir un nuevo caso de uso (guía rápida)

1) Definir comando/DTO y lógica en `loan_system/application/use_cases.py`.
2) Extender puertos si es necesario en `loan_system/application/ports.py`.
3) Implementar repositorio en `loan_system/infrastructure/repositories/`.
4) Exponer endpoint DRF en `loan_system/interfaces/api/`.
5) Añadir tests en `loan_system/tests/`.
