from __future__ import annotations

import logging
import traceback
from typing import Any

from django.core.exceptions import PermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler

from application.exceptions import Conflict, Forbidden, NotFound
from domain.exceptions import BusinessRuleViolation, ValidationError

logger = logging.getLogger(__name__)


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """
    Manejador personalizado de excepciones con logging y respuestas estructuradas.
    """
    # Intentar con el handler por defecto de DRF primero
    response = exception_handler(exc, context)
    
    # Extraer información del request
    request = context.get('request')
    view = context.get('view')
    
    # Información de contexto para logging
    user = getattr(request, 'user', None)
    user_id = getattr(user, 'id', 'AnonymousUser') if user else 'AnonymousUser'
    path = getattr(request, 'path', 'unknown')
    method = getattr(request, 'method', 'unknown')
    
    # Si DRF ya manejó la excepción
    if response is not None:
        # Enriquecer la respuesta con información adicional
        error_data = {
            'error': True,
            'status_code': response.status_code,
            'message': response.data.get('detail', str(exc)) if isinstance(response.data, dict) else str(exc),
            'errors': response.data if not isinstance(response.data, str) else None,
        }
        
        # Log solo errores del servidor (5xx)
        if response.status_code >= 500:
            logger.error(
                f"Server Error: {exc.__class__.__name__} | "
                f"User: {user_id} | Path: {method} {path} | "
                f"Message: {str(exc)}",
                exc_info=True
            )
        
        response.data = error_data
        return response
    
    # Manejo de excepciones personalizadas de la aplicación
    if isinstance(exc, ValidationError):
        logger.warning(f"Validation Error: {str(exc)} | User: {user_id} | Path: {method} {path}")
        return Response({
            'error': True,
            'status_code': 400,
            'message': 'Error de validación',
            'detail': str(exc)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if isinstance(exc, BusinessRuleViolation):
        logger.warning(f"Business Rule Violation: {str(exc)} | User: {user_id} | Path: {method} {path}")
        return Response({
            'error': True,
            'status_code': 422,
            'message': 'Regla de negocio violada',
            'detail': str(exc)
        }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    
    if isinstance(exc, Forbidden):
        logger.warning(f"Forbidden: {str(exc)} | User: {user_id} | Path: {method} {path}")
        return Response({
            'error': True,
            'status_code': 403,
            'message': 'Acceso denegado',
            'detail': str(exc)
        }, status=status.HTTP_403_FORBIDDEN)
    
    if isinstance(exc, NotFound):
        logger.info(f"Not Found: {str(exc)} | User: {user_id} | Path: {method} {path}")
        return Response({
            'error': True,
            'status_code': 404,
            'message': 'Recurso no encontrado',
            'detail': str(exc)
        }, status=status.HTTP_404_NOT_FOUND)
    
    if isinstance(exc, Conflict):
        logger.warning(f"Conflict: {str(exc)} | User: {user_id} | Path: {method} {path}")
        return Response({
            'error': True,
            'status_code': 409,
            'message': 'Conflicto en la operación',
            'detail': str(exc)
        }, status=status.HTTP_409_CONFLICT)
    
    # Excepciones de Django
    if isinstance(exc, Http404):
        logger.info(f"Http404: {str(exc)} | User: {user_id} | Path: {method} {path}")
        return Response({
            'error': True,
            'status_code': 404,
            'message': 'Página no encontrada',
            'detail': str(exc)
        }, status=status.HTTP_404_NOT_FOUND)
    
    if isinstance(exc, PermissionDenied):
        logger.warning(f"PermissionDenied: {str(exc)} | User: {user_id} | Path: {method} {path}")
        return Response({
            'error': True,
            'status_code': 403,
            'message': 'Permiso denegado',
            'detail': str(exc)
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Error no manejado - log completo con traceback
    logger.error(
        f"Unhandled Exception: {exc.__class__.__name__} | "
        f"User: {user_id} | Path: {method} {path} | "
        f"Message: {str(exc)}\n{traceback.format_exc()}"
    )
    
    return Response({
        'error': True,
        'status_code': 500,
        'message': 'Error interno del servidor',
        'detail': 'Ha ocurrido un error inesperado. Por favor contacte al administrador.'
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
