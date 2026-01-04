# Operación (Runbook)

## Requisitos

- Python (venv recomendado)
- Docker Desktop (Windows) para el flujo MySQL automático

## Configuración por entorno (`.env`)

El proyecto carga variables desde `.env` en la raíz.

Variables principales (ver `.env.example`):
- `DJANGO_SECRET_KEY` (obligatoria)
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`

### Base de datos: prioridad MySQL

En `loan_system/infrastructure/config/settings.py`:

1) Si existe `MYSQL_NAME` → usa MySQL con `django.db.backends.mysql`.
2) Si no existe `MYSQL_NAME` → usa `DATABASE_URL` si está definido.
3) Si tampoco existe `DATABASE_URL` → fallback a sqlite (`loan_system/db.sqlite3`).

### MySQL en modo estricto

Para consistencia financiera se fuerza:

`SET sql_mode='STRICT_TRANS_TABLES'`

Además se usa `utf8mb4`.

### PyMySQL + MySQL 8

- Driver: `PyMySQL`.
- MySQL 8 suele usar `caching_sha2_password`; para este método se requiere `cryptography` (incluida en `requirements.txt`).

## Flujo automático E2E con MySQL (Docker)

Script: `scripts/e2e_mysql.ps1`

Qué hace:
- Arranca/crea contenedor MySQL `mysql:8.0` llamado `banco-mysql` (mapea `3307 -> 3306`).
- Exporta `MYSQL_*` en la sesión.
- Corre `migrate`.
- Corre `seed_initial_data`.
- Levanta `runserver` en background.
- Ejecuta requests reales (JWT + endpoints) y valida duplicado `409`.

Ejecutar:
```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\e2e_mysql.ps1
```

Notas:
- El script usa credenciales de desarrollo (no aptas para producción).
- Si Docker no está corriendo, el script falla con un mensaje claro.

## Comandos de gestión

### Seed
- `python loan_system/manage.py seed_initial_data`

Crea:
- admin (`admin` / `admin1234`, rol `ADMIN`)
- cliente (`client1` / `client1234`, rol `CLIENT` + `ClientProfile`)
- préstamo aprobado + cuota pendiente

El seed es idempotente y, si la cuota #1 ya fue pagada, genera una nueva cuota pendiente para permitir re-ejecutar E2E.

## Celery

Config:
- `CELERY_BROKER_URL` (default `redis://localhost:6379/0`)
- `CELERY_RESULT_BACKEND` (default `redis://localhost:6379/1`)

Arranque típico (si se añade worker real):
```bash
celery -A infrastructure.config worker -l info
```

Las tasks actuales son placeholders en `loan_system/events/tasks.py`.
