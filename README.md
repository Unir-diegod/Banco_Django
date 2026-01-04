# Banco / loan_system

Proyecto base en **Django + DRF** para un sistema de préstamos, diseñado con **Clean Architecture / Hexagonal**.

Incluye:
- API REST con **JWT** (`simplejwt`).
- Roles y permisos (ADMIN/ANALYST/CLIENT).
- Auditoría persistida (app `audit`).
- Logging estructurado JSON + `request_id`.
- Rate limiting en endpoints críticos.
- Soporte MySQL vía **PyMySQL** (y script E2E con Docker).
- Celery (tasks placeholder).

## Documentación técnica

- docs/ARQUITECTURA.md
- docs/API.md
- docs/SEGURIDAD_Y_AUDITORIA.md
- docs/OPERACION.md
- docs/DESARROLLO_Y_TESTS.md

## Estructura del repo

El código real vive bajo `loan_system/` y se expone con “shims” en la raíz para facilitar imports y tooling.

- `loan_system/domain/` (y shim `domain/`): reglas puras
- `loan_system/application/` (y shim `application/`): casos de uso + puertos
- `loan_system/infrastructure/` (y shim `infrastructure/`): Django ORM/config/repos
- `loan_system/interfaces/` (y shim `interfaces/`): DRF (views/serializers/permissions)
- `loan_system/events/` (y shim `events/`): Celery tasks
- `loan_system/tests/`: tests con pytest

## Requisitos

- Python 3.11+ recomendado
- Docker Desktop (Windows) recomendado para MySQL end-to-end

## Configuración (`.env`)

El proyecto lee variables desde `.env` (ver `.env.example`).

Prioridad de base de datos:
1) Si existe `MYSQL_NAME` → usa MySQL.
2) Si no existe `MYSQL_NAME` → usa `DATABASE_URL` si está definido.
3) Si no existe `DATABASE_URL` → fallback a sqlite (`loan_system/db.sqlite3`).

Variables mínimas:
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`

## Quickstart (dev)

### 1) Instalar dependencias

Windows PowerShell:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2) Configurar entorno

```powershell
copy .env.example .env
```

Edita `.env` y cambia `DJANGO_SECRET_KEY` y credenciales.

### 3) Migraciones y servidor

```powershell
python loan_system\manage.py migrate
python loan_system\manage.py runserver
```

### 4) Tests

```bash
pytest
```

## Flujo automático MySQL + JWT + Endpoints (E2E)

El script **auto-contenido** crea/arranca MySQL en Docker (puerto host `3307`), aplica migraciones, hace seed, levanta `runserver`, prueba JWT y endpoints y valida duplicado (`409`).

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\e2e_mysql.ps1
```

## Comandos útiles

- Seed (admin/cliente + préstamo + cuota):
	```bash
	python loan_system/manage.py seed_initial_data
	```

## Endpoints (resumen)

- POST `/api/auth/token/`
- POST `/api/auth/token/refresh/`
- POST `/api/loans/quote/`
- POST `/api/loans/`
- POST `/api/loans/<loan_id>/decision/`
- POST `/api/payments/`

Ver detalles y ejemplos en docs/API.md.
