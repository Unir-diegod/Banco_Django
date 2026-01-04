# Seguridad y Auditoría

## JWT

- Autenticación principal: `JWTAuthentication` (DRF).
- Duración configurable por variables de entorno:
  - `JWT_ACCESS_MINUTES`
  - `JWT_REFRESH_DAYS`
- Refresh rotation: `ROTATE_REFRESH_TOKENS=True`.

## Roles y permisos

El sistema usa un campo `role` en el usuario.

- Permisos a nivel API (DRF):
  - `AdminOrAnalyst`: endpoints de creación/decisión/cotización.
  - `AnyAuthenticated`: endpoints de pago.

Adicionalmente, los casos de uso validan rol (defensa en profundidad).

## Rate limiting

Se usa `django-ratelimit` en endpoints críticos para mitigar abuso:
- Token, cotización, creación/decisión y pagos (ver docs/API.md).

## CORS

- Configurable con `DJANGO_CORS_ALLOWED_ORIGINS`.
- `CORS_ALLOW_CREDENTIALS=True`.

## Hardening (settings)

Dependiente de `DJANGO_DEBUG`:
- En `DEBUG=0` se activan:
  - `SECURE_SSL_REDIRECT`
  - cookies seguras (`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`)
  - HSTS (`SECURE_HSTS_SECONDS`, includeSubdomains, preload)
  - `SECURE_CONTENT_TYPE_NOSNIFF`

## Logging estructurado + Request ID

- Formatter JSON (`python-json-logger`).
- Middleware `RequestIdMiddleware` añade `request_id` por request.
- Filter `RequestIdLogFilter` injecta `request_id` al log.

Objetivo: trazabilidad en producción y correlación de solicitudes.

## Auditoría

Existe una app `audit` que persiste eventos tipo `AuditLog`.

- Origen: los casos de uso emiten `AuditEvent`.
- Persistencia: repositorio Django (`DjangoAuditRepository`).
- Se usa para:
  - registro de pagos
  - aprobaciones/rechazos
  - creación de préstamos

Recomendación operativa: tratar `AuditLog` como tabla de cumplimiento (retención y backups).
