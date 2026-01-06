"""
Middleware de seguridad adicional para headers HTTP seguros
"""
from django.conf import settings


class SecurityHeadersMiddleware:
    """
    Agrega headers de seguridad adicionales a todas las respuestas
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Content Security Policy
        if not settings.DEBUG:
            csp_directives = [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https:",
                "font-src 'self'",
                "connect-src 'self'",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "upgrade-insecure-requests",
            ]
            response["Content-Security-Policy"] = "; ".join(csp_directives)

        # Permissions Policy (anteriormente Feature-Policy)
        response["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )

        # Protección adicional contra clickjacking
        response["X-Frame-Options"] = "DENY"

        # Prevenir MIME type sniffing
        response["X-Content-Type-Options"] = "nosniff"

        # Habilitar filtro XSS del navegador (legacy pero útil)
        response["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy estricta
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        return response


class RateLimitHeadersMiddleware:
    """
    Agrega información de rate limiting en los headers de respuesta
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Agregar headers informativos de rate limiting
        if hasattr(request, 'limited') and request.limited:
            response['X-RateLimit-Limit'] = getattr(request, 'limit', 'N/A')
            response['X-RateLimit-Remaining'] = '0'
            response['Retry-After'] = '60'

        return response
