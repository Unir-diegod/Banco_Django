# 🛠️ Guía de Desarrollo

Guía para desarrolladores que trabajan en el Sistema de Préstamos Bancarios.

---

## 📋 Índice

- [Configuración del Entorno](#-configuración-del-entorno)
- [Estructura del Código](#-estructura-del-código)
- [Convenciones](#-convenciones)
- [Tests](#-tests)
- [Añadir Nuevas Features](#-añadir-nuevas-features)

---

## 🚀 Configuración del Entorno

### Requisitos

- Python 3.11+
- Node.js 18+ (para frontend)
- Docker Desktop (opcional, para MySQL)

### Instalación

```powershell
# Clonar y entrar al proyecto
git clone <repo-url>
cd banco

# Crear y activar entorno virtual
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
copy .env.example .env
# Editar .env con tus valores
```

### Iniciar Desarrollo

```powershell
# Migraciones
python loan_system/manage.py migrate

# Datos de prueba
python loan_system/manage.py seed_initial_data

# Servidor de desarrollo
python loan_system/manage.py runserver
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

---

## 📁 Estructura del Código

```
loan_system/
├── domain/           # 💎 Reglas de negocio puras
│   ├── entities.py      # Loan, Client, Installment, Payment
│   ├── value_objects.py # Money, Rate
│   └── exceptions.py    # ValidationError, BusinessRuleViolation
│
├── application/      # 📱 Casos de uso
│   ├── use_cases.py     # CreateLoan, DecideLoan, RegisterPayment, Quote
│   ├── ports.py         # Interfaces de repositorios
│   └── exceptions.py    # NotFound, Conflict, Forbidden
│
├── interfaces/       # 🌐 API REST
│   └── api/
│       ├── views.py        # Endpoints DRF
│       ├── serializers.py  # Validación entrada/salida
│       └── permissions.py  # Control de acceso
│
├── infrastructure/   # 🔧 Implementaciones concretas
│   ├── config/          # Django settings
│   ├── django_apps/     # Models Django
│   ├── repositories/    # Implementación de ports
│   └── security/        # Middlewares
│
├── events/           # ⚡ Tareas asíncronas
│   └── tasks.py         # Celery tasks
│
└── tests/            # ✅ Tests
    ├── domain/          # Tests de dominio
    └── application/     # Tests de casos de uso
```

---

## 📝 Convenciones

### Domain Layer

```python
# ✅ Código puro, sin imports de Django/DRF
from decimal import Decimal
from dataclasses import dataclass

@dataclass
class Money:
    amount: Decimal
    currency: str
    
    def __post_init__(self):
        if self.amount < 0:
            raise ValidationError("Amount cannot be negative")
```

### Application Layer

```python
# ✅ Use Cases reciben dependencias por inyección
class CreateLoanUseCase:
    def __init__(
        self,
        loan_repo: LoanRepository,
        installment_repo: InstallmentRepository,
        audit_repo: AuditRepository,
    ):
        self.loan_repo = loan_repo
        self.installment_repo = installment_repo
        self.audit_repo = audit_repo
    
    def execute(self, actor: Actor, command: CreateLoanCommand) -> LoanResult:
        # Validaciones y lógica
        if actor.role not in [Role.ADMIN, Role.ANALYST]:
            raise Forbidden("Not authorized")
        ...
```

### Infrastructure Layer

```python
# ✅ Transacciones en el adaptador de entrada
from django.db import transaction

class PaymentView(APIView):
    def post(self, request):
        with transaction.atomic():
            result = use_case.execute(actor, command)
        return Response({"payment_id": str(result.payment_id)})

# ✅ Locks para operaciones críticas
class DjangoInstallmentRepository:
    def get_for_update(self, installment_id: UUID) -> Installment:
        model = InstallmentModel.objects.select_for_update().get(id=installment_id)
        return self._to_entity(model)
```

### Interfaces Layer

```python
# ✅ Serializers validan entrada
class CreateLoanSerializer(serializers.Serializer):
    client_id = serializers.UUIDField()
    principal_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=3)
    monthly_rate = serializers.DecimalField(max_digits=8, decimal_places=6)
    term_months = serializers.IntegerField(min_value=1, max_value=360)
```

---

## 🧪 Tests

### Ejecutar Tests

```powershell
# Todos los tests
pytest

# Con cobertura
pytest --cov=loan_system --cov-report=html

# Solo dominio
pytest loan_system/tests/domain/

# Solo aplicación
pytest loan_system/tests/application/

# Verbose
pytest -v

# Test específico
pytest loan_system/tests/domain/test_entities.py::test_loan_creation
```

### Estructura de Tests

```python
# loan_system/tests/domain/test_entities.py

import pytest
from decimal import Decimal
from domain.entities import Loan
from domain.value_objects import Money, Rate
from domain.exceptions import ValidationError

class TestLoan:
    def test_create_loan_with_valid_data(self):
        loan = Loan(
            client_id=uuid4(),
            principal=Money(Decimal("1000.00"), "USD"),
            monthly_rate=Rate(Decimal("0.02")),
            term_months=12,
        )
        assert loan.status == LoanStatus.PENDING
    
    def test_create_loan_with_negative_amount_raises(self):
        with pytest.raises(ValidationError):
            Money(Decimal("-100.00"), "USD")
    
    def test_approve_loan(self):
        loan = create_test_loan()
        loan.approve()
        assert loan.status == LoanStatus.APPROVED
```

### Fixtures

```python
# loan_system/tests/conftest.py

import pytest
from decimal import Decimal
from uuid import uuid4

@pytest.fixture
def sample_loan():
    return Loan(
        client_id=uuid4(),
        principal=Money(Decimal("5000.00"), "USD"),
        monthly_rate=Rate(Decimal("0.025")),
        term_months=12,
    )

@pytest.fixture
def mock_loan_repository():
    return Mock(spec=LoanRepository)
```

---

## ➕ Añadir Nuevas Features

### 1. Nueva Entidad de Dominio

```python
# 1. Definir en domain/entities.py
@dataclass
class Guarantee:
    guarantee_id: UUID
    loan_id: UUID
    type: str
    value: Money
    
    def validate(self):
        if self.value.amount <= 0:
            raise ValidationError("Guarantee value must be positive")
```

### 2. Nuevo Caso de Uso

```python
# 2. Crear en application/use_cases.py
class AddGuaranteeUseCase:
    def __init__(self, guarantee_repo: GuaranteeRepository, audit: AuditRepository):
        self.guarantee_repo = guarantee_repo
        self.audit = audit
    
    def execute(self, actor: Actor, command: AddGuaranteeCommand) -> GuaranteeResult:
        if actor.role not in [Role.ADMIN, Role.ANALYST]:
            raise Forbidden("Not authorized")
        
        guarantee = Guarantee(
            guarantee_id=uuid4(),
            loan_id=command.loan_id,
            type=command.type,
            value=Money(command.value, command.currency),
        )
        guarantee.validate()
        
        self.guarantee_repo.save(guarantee)
        self.audit.log(AuditEvent("GUARANTEE_ADDED", actor, guarantee.guarantee_id))
        
        return GuaranteeResult(guarantee_id=guarantee.guarantee_id)
```

### 3. Nuevo Port (Interface)

```python
# 3. Definir interface en application/ports.py
class GuaranteeRepository(Protocol):
    def save(self, guarantee: Guarantee) -> None: ...
    def get(self, guarantee_id: UUID) -> Guarantee: ...
    def list_by_loan(self, loan_id: UUID) -> List[Guarantee]: ...
```

### 4. Implementar Repositorio

```python
# 4. Implementar en infrastructure/repositories/django_repositories.py
class DjangoGuaranteeRepository:
    def save(self, guarantee: Guarantee) -> None:
        GuaranteeModel.objects.update_or_create(
            id=guarantee.guarantee_id,
            defaults={
                "loan_id": guarantee.loan_id,
                "type": guarantee.type,
                "value": guarantee.value.amount,
                "currency": guarantee.value.currency,
            }
        )
```

### 5. Crear Endpoint

```python
# 5. Exponer en interfaces/api/views.py
class GuaranteeViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, AdminOrAnalyst]
    
    def create(self, request, loan_pk=None):
        serializer = AddGuaranteeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        use_case = AddGuaranteeUseCase(
            guarantee_repo=DjangoGuaranteeRepository(),
            audit=DjangoAuditRepository(),
        )
        
        result = use_case.execute(
            actor=Actor(request.user.id, request.user.role),
            command=AddGuaranteeCommand(**serializer.validated_data, loan_id=loan_pk),
        )
        
        return Response({"guarantee_id": str(result.guarantee_id)}, status=201)
```

### 6. Añadir Tests

```python
# 6. Tests en loan_system/tests/
class TestAddGuaranteeUseCase:
    def test_add_guarantee_success(self, mock_guarantee_repo, mock_audit):
        use_case = AddGuaranteeUseCase(mock_guarantee_repo, mock_audit)
        
        result = use_case.execute(
            actor=Actor(uuid4(), Role.ANALYST),
            command=AddGuaranteeCommand(loan_id=uuid4(), type="vehicle", value=Decimal("5000"), currency="USD"),
        )
        
        assert result.guarantee_id is not None
        mock_guarantee_repo.save.assert_called_once()
```

---

## 🔧 Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `python manage.py makemigrations` | Crear migraciones |
| `python manage.py migrate` | Aplicar migraciones |
| `python manage.py createsuperuser` | Crear admin |
| `python manage.py seed_initial_data` | Datos de prueba |
| `python manage.py generate_secrets` | Generar credenciales |
| `python manage.py shell` | Django shell |
| `pytest -v` | Tests verbose |
| `pytest --cov` | Tests con cobertura |
