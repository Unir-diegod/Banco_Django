from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from application.exceptions import Conflict, Forbidden, NotFound
from domain.exceptions import BusinessRuleViolation, ValidationError


def custom_exception_handler(exc, context):
    resp = exception_handler(exc, context)
    if resp is not None:
        return resp

    if isinstance(exc, ValidationError):
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, BusinessRuleViolation):
        return Response({"detail": str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    if isinstance(exc, Forbidden):
        return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
    if isinstance(exc, NotFound):
        return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    if isinstance(exc, Conflict):
        return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)

    return Response({"detail": "Error interno"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
