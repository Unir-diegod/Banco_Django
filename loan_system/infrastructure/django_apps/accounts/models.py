from __future__ import annotations

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        ANALYST = "ANALYST", "Analista"
        CLIENT = "CLIENT", "Cliente"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CLIENT)


class ClientProfile(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Activo"
        SUSPENDED = "suspended", "Suspendido"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.PROTECT, related_name="client_profile")
    phone = models.CharField(max_length=40, blank=True, default="")
    address = models.CharField(max_length=250, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    is_delinquent = models.BooleanField(default=False)
    payment_capacity_monthly = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        indexes = [models.Index(fields=["status", "is_delinquent"])]
