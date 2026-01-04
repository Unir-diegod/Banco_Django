from __future__ import annotations

import contextvars
import uuid
from typing import Callable

from django.http import HttpRequest, HttpResponse


_request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)


def get_request_id() -> str | None:
    return _request_id_ctx.get()


class RequestIdMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        rid = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        token = _request_id_ctx.set(rid)
        try:
            response = self.get_response(request)
            response["X-Request-Id"] = rid
            return response
        finally:
            _request_id_ctx.reset(token)


class RequestIdLogFilter:
    def filter(self, record) -> bool:
        record.request_id = get_request_id() or "-"
        return True
