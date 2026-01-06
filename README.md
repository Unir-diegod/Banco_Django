<div align="center">

# 🏦 Sistema de Préstamos Bancarios

**API REST moderna para gestión de préstamos construida con Django + Clean Architecture**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.x-green.svg)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18.x-61DAFB.svg)](https://reactjs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Instalación](#-instalación) •
[Arquitectura](#-arquitectura) •
[API](#-api-endpoints) •
[Documentación](#-documentación)

</div>

---

## ✨ Características

| Característica | Descripción |
|----------------|-------------|
| 🔐 **Autenticación JWT** | Tokens seguros con refresh y blacklist |
| 👥 **Roles y Permisos** | ADMIN, ANALYST, CLIENT con control granular |
| 📊 **Auditoría Completa** | Trazabilidad de todas las operaciones |
| 🛡️ **Seguridad Bancaria** | Rate limiting, CORS, CSP, HSTS |
| 🏗️ **Clean Architecture** | Dominio desacoplado del framework |
| 🐳 **Docker Ready** | MySQL containerizado para desarrollo |

---

## 🏗️ Arquitectura

El proyecto implementa **Clean Architecture / Hexagonal**, manteniendo el dominio de negocio completamente desacoplado del framework.

```mermaid
graph TB
    subgraph "🌐 Interfaces - API Layer"
        API[REST API<br/>Django REST Framework]
        ADMIN[Django Admin]
    end
    
    subgraph "📱 Application - Use Cases"
        UC1[CreateLoanUseCase]
        UC2[DecideLoanUseCase]
        UC3[RegisterPaymentUseCase]
        UC4[QuoteLoanUseCase]
    end
    
    subgraph "💎 Domain - Business Rules"
        ENT[Entities<br/>Loan, Client, Payment]
        VO[Value Objects<br/>Money, Rate]
        RULES[Business Rules]
    end
    
    subgraph "🔧 Infrastructure"
        ORM[Django ORM]
        REPO[Repositories]
        DB[(MySQL/SQLite)]
    end
    
    API --> UC1 & UC2 & UC3 & UC4
    UC1 & UC2 & UC3 & UC4 --> ENT & VO & RULES
    UC1 & UC2 & UC3 & UC4 --> REPO
    REPO --> ORM --> DB
    
    style API fill:#e1f5fe
    style ENT fill:#fff3e0
    style DB fill:#e8f5e9
```

### 📂 Estructura del Proyecto

```
Banco/
├── 📁 loan_system/              # Código principal del backend
│   ├── 📁 domain/               # 💎 Entidades y reglas de negocio
│   ├── 📁 application/          # 📱 Casos de uso y puertos
│   ├── 📁 infrastructure/       # 🔧 Django, ORM, repositorios
│   ├── 📁 interfaces/           # 🌐 API REST (DRF)
│   ├── 📁 events/               # ⚡ Tareas Celery
│   └── 📁 tests/                # ✅ Tests con pytest
│
├── 📁 frontend/                 # React + Vite
│   └── 📁 src/
│       ├── 📁 components/       # Componentes reutilizables
│       ├── 📁 pages/            # Páginas principales
│       └── 📁 services/         # Cliente API
│
├── 📁 docs/                     # 📚 Documentación técnica
└── 📁 scripts/                  # 🔧 Scripts de utilidad
```

---

## 🚀 Instalación

### Requisitos Previos

- **Python 3.11+**
- **Node.js 18+** (para frontend)
- **Docker Desktop** (opcional, para MySQL)

### 1️⃣ Clonar y Configurar Backend

```powershell
# Clonar repositorio
git clone https://github.com/tu-usuario/banco.git
cd banco

# Crear entorno virtual
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
copy .env.example .env
# Editar .env con tus credenciales
```

### 2️⃣ Inicializar Base de Datos

```powershell
# Aplicar migraciones
python loan_system/manage.py migrate

# Crear datos de prueba
python loan_system/manage.py seed_initial_data

# Iniciar servidor
python loan_system/manage.py runserver
```

### 3️⃣ Configurar Frontend

```powershell
cd frontend
npm install
npm run dev
```

### 🐳 Alternativa: Docker con MySQL

```powershell
# Ejecutar todo el flujo E2E automatizado
.\scripts\e2e_mysql.ps1
```

---

## 🔌 API Endpoints

### Diagrama de Flujo de la API

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as API REST
    participant UC as Use Cases
    participant DB as Database
    
    C->>API: POST /auth/token/
    API->>DB: Verificar credenciales
    DB-->>API: Usuario válido
    API-->>C: {access, refresh}
    
    C->>API: POST /loans/quote/
    Note over API: Bearer Token
    API->>UC: QuoteLoanUseCase
    UC-->>API: Cálculo de cuotas
    API-->>C: {monthly_payment, total}
    
    C->>API: POST /loans/
    API->>UC: CreateLoanUseCase
    UC->>DB: Guardar préstamo
    DB-->>UC: loan_id
    UC-->>API: Préstamo creado
    API-->>C: {loan_id}
```

### Endpoints Disponibles

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| `POST` | `/api/auth/token/` | Obtener JWT tokens | Público |
| `POST` | `/api/auth/token/refresh/` | Refrescar access token | Público |
| `GET` | `/api/loans/` | Listar préstamos | ADMIN, ANALYST |
| `POST` | `/api/loans/` | Crear préstamo | ADMIN, ANALYST |
| `POST` | `/api/loans/quote/` | Cotizar préstamo | ADMIN, ANALYST |
| `POST` | `/api/loans/{id}/decision/` | Aprobar/Rechazar | ADMIN, ANALYST |
| `GET` | `/api/clients/` | Listar clientes | ADMIN, ANALYST |
| `POST` | `/api/payments/` | Registrar pago | Todos |

### Ejemplos Rápidos

<details>
<summary>🔐 Obtener Token JWT</summary>

```bash
curl -X POST http://127.0.0.1:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234"}'
```

**Respuesta:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```
</details>

<details>
<summary>💰 Cotizar Préstamo</summary>

```bash
curl -X POST http://127.0.0.1:8000/api/loans/quote/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "principal_amount": "10000.00",
    "currency": "USD",
    "monthly_rate": "0.025",
    "term_months": 12
  }'
```

**Respuesta:**
```json
{
  "monthly_payment": "951.23",
  "total_payment": "11414.76",
  "total_interest": "1414.76"
}
```
</details>

<details>
<summary>📝 Crear Préstamo</summary>

```bash
curl -X POST http://127.0.0.1:8000/api/loans/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<uuid>",
    "principal_amount": "5000.00",
    "currency": "USD",
    "monthly_rate": "0.02",
    "term_months": 6
  }'
```
</details>

---

## 🔐 Seguridad

El sistema implementa múltiples capas de seguridad siguiendo estándares bancarios:

```mermaid
flowchart LR
    A[Request] --> B{Rate Limit}
    B -->|OK| C{CORS}
    B -->|Excedido| X[429 Too Many]
    C -->|Válido| D{JWT Auth}
    C -->|Inválido| Y[403 Forbidden]
    D -->|Válido| E{Permisos}
    D -->|Inválido| Z[401 Unauthorized]
    E -->|Autorizado| F[Use Case]
    E -->|No autorizado| W[403 Forbidden]
    F --> G[Audit Log]
    G --> H[Response]
    
    style A fill:#ffcdd2
    style H fill:#c8e6c9
    style X fill:#ffcdd2
    style Y fill:#ffcdd2
    style Z fill:#ffcdd2
    style W fill:#ffcdd2
```

### Controles Implementados

| Control | Descripción |
|---------|-------------|
| 🔑 **JWT + Blacklist** | Tokens con rotación y revocación |
| 🛡️ **Rate Limiting** | Protección contra abuso por IP |
| 🌐 **CORS** | Orígenes configurables por entorno |
| 📝 **Security Headers** | CSP, HSTS, X-Frame-Options, etc. |
| 🔒 **Password Hashing** | PBKDF2 con salt |
| 📊 **Audit Logging** | Registro de operaciones sensibles |
| 🔐 **HTTPS** | Obligatorio en producción |

---

## 👥 Roles y Permisos

```mermaid
graph TD
    subgraph ADMIN["👤 ADMIN"]
        A1[✅ Gestión completa]
        A2[✅ Aprobación/Rechazo]
        A3[✅ Ver clientes]
        A4[✅ Panel admin]
    end
    
    subgraph ANALYST["📊 ANALYST"]
        B1[✅ Crear préstamos]
        B2[✅ Cotizaciones]
        B3[✅ Decisiones]
        B4[❌ Panel admin]
    end
    
    subgraph CLIENT["💼 CLIENT"]
        C1[✅ Ver sus préstamos]
        C2[✅ Realizar pagos]
        C3[❌ Crear préstamos]
        C4[❌ Ver otros clientes]
    end
    
    style ADMIN fill:#e8f5e9
    style ANALYST fill:#e3f2fd
    style CLIENT fill:#fff3e0
```

---

## 🧪 Tests

```powershell
# Ejecutar todos los tests
pytest

# Con cobertura
pytest --cov=loan_system

# Solo tests de dominio
pytest loan_system/tests/domain/

# Solo tests de API
pytest loan_system/tests/application/
```

---

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| [📖 API Reference](docs/API.md) | Endpoints, payloads y ejemplos completos |
| [🏗️ Arquitectura](docs/ARQUITECTURA.md) | Clean Architecture y decisiones de diseño |
| [🔐 Seguridad](docs/SEGURIDAD.md) | Configuración, credenciales y auditoría |
| [🛠️ Desarrollo](docs/DESARROLLO.md) | Guía para desarrolladores y tests |
| [⚙️ Operaciones](docs/OPERACION.md) | Runbook, Docker y despliegue |

---

## 🛠️ Scripts Útiles

| Script | Descripción |
|--------|-------------|
| `.\scripts\run_dev.ps1` | Inicia backend + frontend |
| `.\scripts\start_backend.ps1` | Solo backend en segundo plano |
| `.\scripts\start_frontend.ps1` | Solo frontend en segundo plano |
| `.\scripts\e2e_mysql.ps1` | Test E2E con Docker MySQL |
| `.\scripts\cleanup.ps1` | Limpieza de archivos temporales |
| `python scripts\validate_security.py` | Validar configuración de seguridad |

---

## 🔧 Configuración de Entorno

El proyecto usa variables de entorno (`.env`):

```ini
# Django
DJANGO_SECRET_KEY=tu-clave-secreta-generada
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Base de datos (prioridad: MySQL > DATABASE_URL > SQLite)
MYSQL_NAME=loan_system_db
MYSQL_USER=loan_user
MYSQL_PASSWORD=tu-password-seguro
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3307

# JWT
JWT_ACCESS_MINUTES=15
JWT_REFRESH_DAYS=7

# CORS
DJANGO_CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Generar Credenciales Seguras

```powershell
python loan_system/manage.py generate_secrets --all
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

<div align="center">

**[⬆ Volver arriba](#-sistema-de-préstamos-bancarios)**

Desarrollado con ❤️ usando Django + React

</div>
