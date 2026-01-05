# Estructura del Proyecto

## 📁 Estructura Limpia

```
Banco/
├── .env                      # Variables de entorno (no en git)
├── .env.example             # Plantilla de variables de entorno
├── .gitignore               # Archivos ignorados por git
├── conftest.py              # Configuración de pytest
├── pytest.ini               # Configuración de pytest
├── README.md                # Documentación principal
├── requirements.txt         # Dependencias Python
├── sitecustomize.py         # Bootstrap de PYTHONPATH
│
├── docs/                    # Documentación técnica
│   ├── API.md
│   ├── ARQUITECTURA.md
│   ├── DESARROLLO_Y_TESTS.md
│   ├── OPERACION.md
│   └── SEGURIDAD_Y_AUDITORIA.md
│
├── scripts/                 # Scripts de utilidad
│   ├── cleanup.ps1         # Limpieza de archivos temporales
│   ├── docker_setup.ps1    # Configuración de Docker
│   ├── e2e_mysql.ps1       # Tests end-to-end con MySQL
│   ├── reset_db.py         # Resetear base de datos
│   ├── run_dev.ps1         # Ejecutar en modo desarrollo
│   ├── start_backend.ps1   # Iniciar backend en segundo plano
│   └── start_frontend.ps1  # Iniciar frontend en segundo plano
│
├── frontend/               # Aplicación React
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── loan_system/            # Código principal del backend
│   ├── manage.py
│   ├── application/       # Casos de uso y puertos
│   ├── domain/            # Entidades y lógica de negocio
│   ├── events/            # Tareas de Celery
│   ├── infrastructure/    # Django, ORM, repositorios
│   ├── interfaces/        # API REST (DRF)
│   └── tests/             # Tests con pytest
│
└── [shims]                 # Directorios shim para imports
    ├── application/
    ├── domain/
    ├── events/
    ├── infrastructure/
    └── interfaces/
```

## 🎯 Archivos Importantes

### Configuración
- `.env` - Variables de entorno (MySQL, Django, etc.)
- `requirements.txt` - Dependencias Python del proyecto

### Scripts de Desarrollo
- `scripts/run_dev.ps1` - **PRINCIPAL**: Inicia el proyecto en desarrollo
- `scripts/docker_setup.ps1` - Configura y verifica Docker/MySQL
- `scripts/cleanup.ps1` - Limpia archivos temporales

### Documentación
- `README.md` - Guía de inicio rápido
- `docs/ARQUITECTURA.md` - Arquitectura hexagonal del proyecto
- `docs/API.md` - Documentación de endpoints
- `docs/DESARROLLO_Y_TESTS.md` - Guía para desarrolladores

## 🗑️ Archivos Eliminados (Código Muerto)

Los siguientes archivos fueron eliminados por ser obsoletos o temporales:

### Scripts obsoletos
- ❌ `check_data.py` - Reemplazado por Django Admin
- ❌ `fix_passwords.py` - Script temporal de migración
- ❌ `generate_hash.py` - Utilidad única de hashing
- ❌ `test_api.py` - Reemplazado por tests en pytest
- ❌ `test_api_v2.py` - Versión duplicada
- ❌ `execute_sql.py` - Uso directo de SQL innecesario
- ❌ `validate_frontend_flow.ps1` - Script de testing obsoleto

### Archivos SQL obsoletos
- ❌ `populate_db_clean.sql` - Reemplazado por `seed_initial_data`
- ❌ `populate_db_v5.sql` - Versión antigua del seed

### Archivos temporales
- ❌ `*.pid` - IDs de procesos
- ❌ `*.out.log` - Logs de salida
- ❌ `*.err.log` - Logs de error
- ❌ `__pycache__/` - Cache de Python (en todas las carpetas)

## 📝 Comandos de Mantenimiento

### Limpieza manual
```powershell
# Ejecutar script de limpieza
.\scripts\cleanup.ps1

# Limpiar cache de Python manualmente
Get-ChildItem -Path . -Recurse -Filter __pycache__ | Remove-Item -Recurse -Force

# Limpiar logs temporales
Remove-Item scripts\*.log, scripts\*.pid -ErrorAction SilentlyContinue
```

### Verificar estructura
```powershell
# Ver estructura de directorios
tree /F /A

# Listar solo archivos importantes
Get-ChildItem -Recurse -File | Where-Object { $_.Name -notmatch '__pycache__|\.pyc|\.log|\.pid' }
```

## 🔍 Patrones Ignorados en .gitignore

El archivo `.gitignore` está configurado para ignorar:
- `__pycache__/` y `*.pyc` - Cache de Python
- `*.log`, `*.pid` - Archivos de runtime
- `.venv/`, `env/` - Entornos virtuales
- `node_modules/` - Dependencias de Node
- `db.sqlite3` - Base de datos local
- `.vscode/`, `.idea/` - Configuración de IDEs

## 🎨 Shims (Redirectores de Import)

Los directorios `application/`, `domain/`, etc. en la raíz son "shims" que redirigen imports a `loan_system/`. Esto permite:
- Ejecutar pytest desde la raíz
- Imports consistentes en todo el proyecto
- Compatibilidad con herramientas de desarrollo

**No eliminar estos directorios** - son necesarios para el funcionamiento del proyecto.

## 📦 Estructura de Dependencias

```
Frontend (React + Vite)
└── package.json (dependencias de Node)

Backend (Django + DRF)
└── requirements.txt (dependencias de Python)

Infraestructura
├── Docker (MySQL en puerto 3307)
└── Python 3.11+ (.venv)
```

---

**Última actualización:** 4 de enero de 2026
**Archivos eliminados:** 22 archivos/directorios
