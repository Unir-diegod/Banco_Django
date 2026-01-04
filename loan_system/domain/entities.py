from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID

from .exceptions import BusinessRuleViolation, ValidationError
from .value_objects import Money, Rate, quantize_money


class ClientStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class LoanStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class InstallmentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    LATE = "late"


@dataclass(slots=True)
class Client:
    id: UUID
    name: str
    email: str
    status: ClientStatus
    is_delinquent: bool
    payment_capacity_monthly: Money


@dataclass(slots=True)
class Loan:
    id: UUID
    client_id: UUID
    principal: Money
    rate: Rate
    term_months: int
    status: LoanStatus
    created_at: datetime

    def validate(self) -> None:
        if self.term_months <= 0:
            raise ValidationError("Plazo inválido")

    def approve(self) -> None:
        if self.status != LoanStatus.PENDING:
            raise BusinessRuleViolation("El préstamo no está en estado pendiente")
        self.status = LoanStatus.APPROVED

    def reject(self) -> None:
        if self.status != LoanStatus.PENDING:
            raise BusinessRuleViolation("El préstamo no está en estado pendiente")
        self.status = LoanStatus.REJECTED


def french_monthly_payment(principal: Money, rate: Rate, term_months: int) -> Money:
    """Cuota mensual (método francés)."""
    if term_months <= 0:
        raise ValidationError("Plazo inválido")
    r = rate.monthly_rate
    if r == 0:
        return Money(principal.amount / Decimal(term_months), principal.currency)

    # P * r * (1+r)^n / ((1+r)^n - 1)
    one_plus_r_pow_n = (Decimal(1) + r) ** Decimal(term_months)
    payment = principal.amount * r * one_plus_r_pow_n / (one_plus_r_pow_n - Decimal(1))
    return Money(quantize_money(payment), principal.currency)


@dataclass(slots=True)
class Installment:
    id: UUID
    loan_id: UUID
    number: int
    due_date: date
    amount: Money
    status: InstallmentStatus

    def mark_paid(self) -> None:
        if self.status == InstallmentStatus.PAID:
            raise BusinessRuleViolation("La cuota ya está pagada")
        self.status = InstallmentStatus.PAID


@dataclass(slots=True)
class Payment:
    id: UUID
    loan_id: UUID
    installment_id: Optional[UUID]
    reference: str
    amount: Money
    paid_at: datetime

    def validate(self) -> None:
        if not self.reference:
            raise ValidationError("Referencia requerida")


@dataclass(slots=True)
class AuditEvent:
    id: UUID
    actor_user_id: Optional[UUID]
    action: str
    occurred_at: datetime
    before: dict
    after: dict
    meta: dict
