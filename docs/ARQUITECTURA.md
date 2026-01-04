# Arquitectura

Este proyecto implementa un sistema base de préstamos en Django siguiendo **Clean Architecture / Hexagonal**: el dominio y los casos de uso están desacoplados del framework, y Django/DRF actúan como adaptadores.

## Capas y responsabilidades

### Domain (`loan_system/domain/` y shims `domain/`)
- Contiene **reglas de negocio puras** (sin dependencias de Django).
- Define entidades, value objects e invariantes.
- No conoce HTTP, ORM, ni detalles de infraestructura.

**Piezas principales**
- `Money`, `Rate`: Value Objects basados en `Decimal` para evitar errores de punto flotante.
- Entidades: `Client`, `Loan`, `Installment`, `Payment`.
- Excepciones: `ValidationError`, `BusinessRuleViolation`.

### Application (`loan_system/application/` y shims `application/`)
- Orquesta reglas de negocio mediante **Use Cases**.
- Define **puertos** (interfaces/protocolos) para repositorios/servicios externos.
- Maneja autorización por rol a nivel de caso de uso (por ejemplo, pago/decisión).

**Piezas principales**
- `ports.py`: Protocolos de repositorios y `Actor` (usuario/rol).
- `use_cases.py`: casos de uso (`CreateLoanUseCase`, `DecideLoanUseCase`, `RegisterPaymentUseCase`, `QuoteLoanUseCase`).
- Excepciones de aplicación: `NotFound`, `Conflict`, `Forbidden`.

### Infrastructure (`loan_system/infrastructure/` y shims `infrastructure/`)
- Adaptadores concretos: Django ORM, configuración, repositorios, seguridad y logging.
- `django_apps/` contiene apps internas Django:
  - `accounts`: modelo de usuario y perfil de cliente.
  - `loans`: modelos ORM para préstamos/cuotas/pagos.
  - `audit`: modelo ORM de auditoría.
- `repositories/`: adaptadores de repositorios (ORM → entidades dominio).

**Transacciones y concurrencia**
- El endpoint de registro de pago abre `transaction.atomic()` y el repositorio de cuotas obtiene registros con `select_for_update()` para prevenir pagos concurrentes sobre la misma cuota.

### Interfaces (`loan_system/interfaces/` y shims `interfaces/`)
- Adaptadores de entrada/salida (DRF): serialización, permisos, vistas, manejo de errores.
- Traduce HTTP → comandos de aplicación y mapea errores → HTTP.

### Events (`loan_system/events/` y shims `events/`)
- Tareas Celery (placeholders) para procesos asíncronos.

## Flujo típico: registro de pago

1. DRF valida payload (`RegisterPaymentSerializer`).
2. Se abre transacción (`transaction.atomic()`).
3. Caso de uso `RegisterPaymentUseCase`:
   - Autoriza por rol.
   - Valida referencia única (duplicados → `Conflict`).
   - Bloquea la cuota (select_for_update) y valida estado/monto.
   - Marca cuota como pagada y crea `Payment`.
   - Emite evento de auditoría.
4. Respuesta HTTP incluye `payment_id`.

## Shims de import en la raíz

En la raíz existen paquetes `domain/`, `application/`, `infrastructure/`, `interfaces/`, `events/` que extienden `__path__` para apuntar a `loan_system/...`. Esto facilita imports y tooling (por ejemplo, `pytest-django`) cuando el working directory está en la raíz del repositorio.

## Decisiones de diseño

- **Decimal** para cantidades y tasas (finanzas).
- **SQL estricto en MySQL**: `STRICT_TRANS_TABLES` para evitar coerciones silenciosas.
- **Errores tipados** en domain/application y mapeo consistente a HTTP.
