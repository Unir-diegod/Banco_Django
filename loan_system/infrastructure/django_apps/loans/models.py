from __future__ import annotations

import uuid

from django.db import models


class Loan(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        APPROVED = "approved", "Aprobado"
        REJECTED = "rejected", "Rechazado"
        CANCELLED = "cancelled", "Cancelado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client_profile = models.ForeignKey(
        "accounts.ClientProfile",
        on_delete=models.PROTECT,
        related_name="loans",
    )
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    monthly_rate = models.DecimalField(max_digits=7, decimal_places=6)
    term_months = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["client_profile", "status"]),
            models.Index(fields=["created_at"]),
        ]


class Installment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        PAID = "paid", "Pagada"
        LATE = "late", "Atrasada"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    loan = models.ForeignKey(Loan, on_delete=models.PROTECT, related_name="installments")
    number = models.PositiveIntegerField()
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["loan", "number"], name="uniq_installment_per_loan")]
        indexes = [models.Index(fields=["loan", "status"])]


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    loan = models.ForeignKey(Loan, on_delete=models.PROTECT, related_name="payments")
    installment = models.ForeignKey(
        Installment, on_delete=models.PROTECT, null=True, blank=True, related_name="payments"
    )
    reference = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    paid_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Historial inmutable: una vez creado, no se permite modificar el registro.
        if self.pk and self.__class__.objects.filter(pk=self.pk).exists():
            raise ValueError("Payment es inmutable; use eventos de ajuste controlados")
        return super().save(*args, **kwargs)

    class Meta:
        indexes = [models.Index(fields=["loan", "paid_at"])]

