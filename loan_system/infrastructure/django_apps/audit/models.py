from __future__ import annotations

import uuid

from django.db import models


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=100)
    occurred_at = models.DateTimeField()
    before = models.JSONField(default=dict)
    after = models.JSONField(default=dict)
    meta = models.JSONField(default=dict)

    class Meta:
        indexes = [models.Index(fields=["action", "occurred_at"])]
