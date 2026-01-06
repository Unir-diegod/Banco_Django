# 🏗️ Arquitectura

Este documento describe la arquitectura del Sistema de Préstamos Bancarios, implementado siguiendo principios de **Clean Architecture / Hexagonal**.

---

## 📋 Índice

- [Visión General](#-visión-general)
- [Capas de la Arquitectura](#-capas-de-la-arquitectura)
- [Diagramas UML](#-diagramas-uml)
- [Flujos de Datos](#-flujos-de-datos)
- [Decisiones de Diseño](#-decisiones-de-diseño)

---

## 🎯 Visión General

La arquitectura separa el código en capas concéntricas donde las dependencias apuntan hacia el centro (dominio). Esto permite:

- ✅ **Testabilidad**: El dominio se prueba sin framework
- ✅ **Flexibilidad**: Cambiar DB/Framework sin tocar negocio
- ✅ **Mantenibilidad**: Código organizado por responsabilidad
- ✅ **Escalabilidad**: Añadir features sin afectar existentes

```mermaid
graph TB
    subgraph "Capas de la Arquitectura"
        direction TB
        
        subgraph OUTER["🔧 Infrastructure (Outer)"]
            DB[(Database)]
            ORM[Django ORM]
            CONFIG[Settings]
        end
        
        subgraph ADAPTERS["🌐 Interfaces (Adapters)"]
            API[REST API]
            SERIAL[Serializers]
            VIEWS[Views]
        end
        
        subgraph APP["📱 Application"]
            UC[Use Cases]
            PORTS[Ports/Interfaces]
        end
        
        subgraph DOMAIN["💎 Domain (Core)"]
            ENT[Entities]
            VO[Value Objects]
            RULES[Business Rules]
        end
    end
    
    OUTER --> ADAPTERS --> APP --> DOMAIN
    
    style DOMAIN fill:#fff3e0,stroke:#ff9800
    style APP fill:#e3f2fd,stroke:#2196f3
    style ADAPTERS fill:#e8f5e9,stroke:#4caf50
    style OUTER fill:#fce4ec,stroke:#e91e63
```

---

## 📁 Capas de la Arquitectura

### 💎 Domain (`loan_system/domain/`)

El **núcleo** del sistema. Contiene reglas de negocio puras sin dependencias externas.

```mermaid
classDiagram
    class Money {
        +Decimal amount
        +str currency
        +__add__(other: Money) Money
        +__sub__(other: Money) Money
        +validate()
    }
    
    class Rate {
        +Decimal value
        +validate()
        +to_decimal() Decimal
    }
    
    class Loan {
        +UUID loan_id
        +UUID client_id
        +Money principal
        +Rate monthly_rate
        +int term_months
        +LoanStatus status
        +approve()
        +reject(reason: str)
        +calculate_payment() Money
    }
    
    class Installment {
        +UUID installment_id
        +UUID loan_id
        +int number
        +Money amount
        +date due_date
        +InstallmentStatus status
        +mark_as_paid()
    }
    
    class Payment {
        +UUID payment_id
        +UUID installment_id
        +str reference
        +Money amount
        +datetime paid_at
    }
    
    class Client {
        +UUID client_id
        +str name
        +str email
        +bool is_delinquent
    }
    
    Loan --> Money : principal
    Loan --> Rate : monthly_rate
    Loan "1" --> "*" Installment : has
    Installment --> Money : amount
    Installment "1" --> "0..1" Payment : paid_by
    Payment --> Money : amount
    Client "1" --> "*" Loan : has
```

**Archivos principales:**
- `entities.py` - Entidades de dominio (Loan, Installment, Payment, Client)
- `value_objects.py` - Value Objects (Money, Rate)
- `exceptions.py` - Excepciones de dominio (ValidationError, BusinessRuleViolation)

### 📱 Application (`loan_system/application/`)

Orquesta la lógica de negocio mediante **Use Cases** y define contratos con el exterior mediante **Ports**.

```mermaid
classDiagram
    class Actor {
        <<interface>>
        +str user_id
        +Role role
    }
    
    class LoanRepository {
        <<interface>>
        +save(loan: Loan)
        +get(loan_id: UUID) Loan
        +list() List~Loan~
        +exists(client_id, principal, term) bool
    }
    
    class InstallmentRepository {
        <<interface>>
        +save(installment: Installment)
        +get_for_update(id: UUID) Installment
        +list_by_loan(loan_id: UUID) List
    }
    
    class PaymentRepository {
        <<interface>>
        +save(payment: Payment)
        +exists_by_reference(ref: str) bool
    }
    
    class AuditRepository {
        <<interface>>
        +log(event: AuditEvent)
    }
    
    class CreateLoanUseCase {
        -LoanRepository loan_repo
        -InstallmentRepository inst_repo
        -AuditRepository audit
        +execute(actor, command) LoanResult
    }
    
    class DecideLoanUseCase {
        -LoanRepository loan_repo
        -AuditRepository audit
        +execute(actor, loan_id, approve, reason)
    }
    
    class RegisterPaymentUseCase {
        -InstallmentRepository inst_repo
        -PaymentRepository payment_repo
        -AuditRepository audit
        +execute(actor, command) PaymentResult
    }
    
    class QuoteLoanUseCase {
        +execute(principal, rate, term) QuoteResult
    }
    
    CreateLoanUseCase --> LoanRepository
    CreateLoanUseCase --> InstallmentRepository
    CreateLoanUseCase --> AuditRepository
    DecideLoanUseCase --> LoanRepository
    RegisterPaymentUseCase --> InstallmentRepository
    RegisterPaymentUseCase --> PaymentRepository
```

**Archivos principales:**
- `use_cases.py` - Casos de uso del sistema
- `ports.py` - Interfaces/Protocolos para repositorios
- `exceptions.py` - Excepciones de aplicación (NotFound, Conflict, Forbidden)

### 🌐 Interfaces (`loan_system/interfaces/`)

Adaptadores de entrada. Traducen HTTP → comandos de aplicación y errores → respuestas HTTP.

```mermaid
flowchart LR
    subgraph "HTTP Layer"
        REQ[HTTP Request]
        RES[HTTP Response]
    end
    
    subgraph "DRF Adapters"
        VIEW[APIView]
        SERIAL[Serializer]
        PERM[Permissions]
        EXC[Exception Handler]
    end
    
    subgraph "Application"
        UC[Use Case]
    end
    
    REQ --> VIEW
    VIEW --> PERM
    PERM --> SERIAL
    SERIAL --> UC
    UC --> SERIAL
    SERIAL --> VIEW
    VIEW --> EXC
    EXC --> RES
    
    style REQ fill:#e3f2fd
    style RES fill:#c8e6c9
```

**Archivos principales:**
- `api/views.py` - Vistas DRF
- `api/serializers.py` - Serializadores de entrada/salida
- `api/permissions.py` - Permisos por rol
- `api/exception_handler.py` - Mapeo de excepciones a HTTP

### 🔧 Infrastructure (`loan_system/infrastructure/`)

Adaptadores de salida. Implementaciones concretas de los ports.

```mermaid
flowchart TB
    subgraph "Ports (Interfaces)"
        LP[LoanRepository]
        IP[InstallmentRepository]
        PP[PaymentRepository]
        AP[AuditRepository]
    end
    
    subgraph "Django Implementations"
        DLR[DjangoLoanRepository]
        DIR[DjangoInstallmentRepository]
        DPR[DjangoPaymentRepository]
        DAR[DjangoAuditRepository]
    end
    
    subgraph "Django ORM"
        LM[LoanModel]
        IM[InstallmentModel]
        PM[PaymentModel]
        AM[AuditLogModel]
    end
    
    subgraph "Database"
        DB[(MySQL/SQLite)]
    end
    
    LP -.-> DLR
    IP -.-> DIR
    PP -.-> DPR
    AP -.-> DAR
    
    DLR --> LM --> DB
    DIR --> IM --> DB
    DPR --> PM --> DB
    DAR --> AM --> DB
    
    style LP fill:#e3f2fd
    style DLR fill:#c8e6c9
```

**Estructura:**
```
infrastructure/
├── config/              # Configuración Django
│   ├── settings.py
│   ├── urls.py
│   └── celery.py
├── django_apps/         # Apps Django
│   ├── accounts/        # Usuarios y perfiles
│   ├── loans/           # Modelos de préstamos
│   └── audit/           # Auditoría
├── repositories/        # Implementaciones de ports
│   ├── django_repositories.py
│   └── clock.py
└── security/            # Middlewares de seguridad
    ├── request_id.py
    └── security_middleware.py
```

---

## 🔄 Flujos de Datos

### Crear Préstamo

```mermaid
sequenceDiagram
    participant C as Cliente HTTP
    participant V as LoanViewSet
    participant S as Serializer
    participant UC as CreateLoanUseCase
    participant LR as LoanRepository
    participant IR as InstallmentRepository
    participant AR as AuditRepository
    participant DB as Database
    
    C->>V: POST /api/loans/ {data}
    V->>S: Validar payload
    S-->>V: Datos validados
    
    V->>UC: execute(actor, command)
    
    Note over UC: Verificar duplicados
    UC->>LR: exists(client_id, principal, term)
    LR->>DB: SELECT...
    DB-->>LR: False
    LR-->>UC: No existe
    
    Note over UC: Crear préstamo
    UC->>UC: Loan.create(...)
    UC->>UC: Generate installments
    
    UC->>LR: save(loan)
    LR->>DB: INSERT loan
    
    UC->>IR: save(installments)
    IR->>DB: INSERT installments
    
    UC->>AR: log(LOAN_CREATED)
    AR->>DB: INSERT audit
    
    UC-->>V: LoanResult
    V->>S: Serializar respuesta
    S-->>V: JSON
    V-->>C: 201 {loan_id, monthly_payment}
```

### Registrar Pago

```mermaid
sequenceDiagram
    participant C as Cliente HTTP
    participant V as PaymentView
    participant TX as Transaction
    participant UC as RegisterPaymentUseCase
    participant IR as InstallmentRepository
    participant PR as PaymentRepository
    participant DB as Database
    
    C->>V: POST /api/payments/ {data}
    V->>TX: BEGIN TRANSACTION
    
    TX->>UC: execute(actor, command)
    
    Note over UC: Verificar referencia única
    UC->>PR: exists_by_reference(ref)
    PR->>DB: SELECT...
    DB-->>PR: False
    
    Note over UC: Bloquear cuota (SELECT FOR UPDATE)
    UC->>IR: get_for_update(installment_id)
    IR->>DB: SELECT ... FOR UPDATE
    DB-->>IR: Installment (locked)
    
    Note over UC: Validar estado y monto
    UC->>UC: Validate business rules
    
    Note over UC: Procesar pago
    UC->>UC: installment.mark_as_paid()
    UC->>UC: Payment.create(...)
    
    UC->>IR: save(installment)
    UC->>PR: save(payment)
    IR->>DB: UPDATE installment
    PR->>DB: INSERT payment
    
    UC-->>TX: PaymentResult
    TX->>DB: COMMIT
    TX-->>V: Success
    V-->>C: 201 {payment_id}
```

---

## 🎨 Decisiones de Diseño

### 1. Decimal para Cantidades Financieras

```python
# ❌ Mal - Errores de punto flotante
amount = 0.1 + 0.2  # = 0.30000000000000004

# ✅ Bien - Precisión exacta
from decimal import Decimal
amount = Decimal("0.1") + Decimal("0.2")  # = Decimal("0.3")
```

Usamos `Decimal` en los Value Objects `Money` y `Rate` para evitar errores de precisión en cálculos financieros.

### 2. Transacciones y Bloqueo Optimista

Para operaciones críticas como pagos, usamos:

```python
with transaction.atomic():
    # SELECT ... FOR UPDATE bloquea la fila
    installment = repo.get_for_update(installment_id)
    
    if installment.status == 'paid':
        raise Conflict("Already paid")
    
    # Procesar pago
    installment.mark_as_paid()
    repo.save(installment)
```

Esto previene condiciones de carrera donde dos pagos podrían procesarse simultáneamente para la misma cuota.

### 3. Mapeo de Excepciones

```mermaid
flowchart LR
    subgraph "Domain/Application"
        E1[ValidationError]
        E2[BusinessRuleViolation]
        E3[Forbidden]
        E4[NotFound]
        E5[Conflict]
    end
    
    subgraph "HTTP"
        H1[400 Bad Request]
        H2[422 Unprocessable]
        H3[403 Forbidden]
        H4[404 Not Found]
        H5[409 Conflict]
    end
    
    E1 --> H1
    E2 --> H2
    E3 --> H3
    E4 --> H4
    E5 --> H5
```

### 4. Shims de Import

Los directorios en la raíz (`domain/`, `application/`, etc.) son "shims" que redirigen a `loan_system/`:

```python
# domain/__init__.py
from pathlib import Path
import sys

# Extiende __path__ para incluir loan_system/domain
__path__.append(str(Path(__file__).parent.parent / "loan_system" / "domain"))
```

Esto permite:
- Ejecutar `pytest` desde la raíz
- Imports consistentes: `from domain.entities import Loan`
- Compatibilidad con herramientas de desarrollo

### 5. MySQL en Modo Estricto

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}
```

Esto previene coerciones silenciosas de datos que podrían causar pérdida de información financiera.

---

## 📚 Referencias

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture - Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Domain-Driven Design - Eric Evans](https://domainlanguage.com/ddd/)
