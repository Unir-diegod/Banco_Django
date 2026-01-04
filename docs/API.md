# API (REST)

Base path: `/api/`

## Autenticación (JWT)

JWT se implementa con `djangorestframework-simplejwt`.

### Obtener tokens
- **POST** `/api/auth/token/`

Request:
```json
{
  "username": "admin",
  "password": "admin1234"
}
```

Response:
```json
{
  "refresh": "...",
  "access": "..."
}
```

### Refresh
- **POST** `/api/auth/token/refresh/`

Request:
```json
{ "refresh": "..." }
```

Response:
```json
{ "access": "..." }
```

### Header
En endpoints protegidos:

`Authorization: Bearer <access>`

## Endpoints de préstamos

### Listar préstamos
- **GET** `/api/loans/`
- Permisos: `ADMIN` o `ANALYST`

Response:
```json
[
  {
    "loan_id": "<uuid>",
    "client_id": "<uuid>",
    "principal_amount": "1000.00",
    "currency": "USD",
    "monthly_rate": "0.030000",
    "term_months": 12,
    "status": "approved",
    "created_at": "2026-01-03T12:34:56.789012+00:00"
  }
]
```

### Cotización
- **POST** `/api/loans/quote/`
- Permisos: `ADMIN` o `ANALYST`

Request:
```json
{
  "principal_amount": "1000.00",
  "currency": "USD",
  "monthly_rate": "0.020000",
  "term_months": 12
}
```

Response:
```json
{
  "monthly_payment": "94.56",
  "total_payment": "1134.72",
  "total_interest": "134.72"
}
```

### Crear préstamo
- **POST** `/api/loans/`
- Permisos: `ADMIN` o `ANALYST`

Request:
```json
{
  "client_id": "<uuid>",
  "principal_amount": "500.00",
  "currency": "USD",
  "monthly_rate": "0.020000",
  "term_months": 6
}
```

Response:
```json
{
  "loan_id": "<uuid>",
  "monthly_payment": "..."
}
```

### Decidir préstamo (aprobar/rechazar)
- **POST** `/api/loans/<loan_id>/decision/`
- Permisos: `ADMIN` o `ANALYST`

Request:
```json
{
  "approve": false,
  "reason": "seed-e2e"
}
```

Response:
```json
{ "status": "ok" }
```

## Endpoints de pagos

### Registrar pago
- **POST** `/api/payments/`
- Permisos: cualquier usuario autenticado (`ADMIN`, `ANALYST`, `CLIENT`)

Request:
```json
{
  "installment_id": "<uuid>",
  "reference": "REF-123",
  "amount": "100.00",
  "currency": "USD"
}
```

Response:
```json
{ "payment_id": "<uuid>" }
```

## Códigos de error

El handler personalizado mapea excepciones a códigos HTTP:

- `ValidationError` (domain) → **400**
- `BusinessRuleViolation` (domain) → **422**
- `Forbidden` (application) → **403**
- `NotFound` (application) → **404**
- `Conflict` (application) → **409**
- Rate limit (`django-ratelimit`) → **429**

Formato común:
```json
{ "detail": "mensaje" }
```

## Rate limiting (por IP)

- `/api/auth/token/`: 10/min
- `/api/loans/quote/`: 60/min
- `/api/loans/`: 20/min

## Endpoints de clientes

### Listar clientes
- **GET** `/api/clients/`
- Permisos: `ADMIN` o `ANALYST`

Response:
```json
[
  {
    "client_id": "<uuid>",
    "name": "Cliente 1",
    "email": "client1@example.com",
    "status": "active",
    "is_delinquent": false
  }
]
```
- `/api/loans/<id>/decision/`: 20/min
- `/api/payments/`: 30/min

## Ejemplos cURL

Token:
```bash
curl -s http://127.0.0.1:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234"}'
```

Quote:
```bash
curl -s http://127.0.0.1:8000/api/loans/quote/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS>" \
  -d '{"principal_amount":"1000.00","currency":"USD","monthly_rate":"0.020000","term_months":12}'
```
