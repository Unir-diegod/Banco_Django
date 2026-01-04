from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Protocol
from uuid import UUID

from domain.entities import AuditEvent, Client, Installment, Loan, Payment


class ClientRepository(Protocol):
    def get(self, client_id: UUID) -> Client: ...

    def has_active_debt(self, client_id: UUID) -> bool: ...


class LoanRepository(Protocol):
    def create(self, loan: Loan) -> Loan: ...

    def get(self, loan_id: UUID) -> Loan: ...

    def save(self, loan: Loan) -> None: ...


class InstallmentRepository(Protocol):
    def list_by_loan(self, loan_id: UUID) -> list[Installment]: ...

    def get_for_update(self, installment_id: UUID) -> Installment: ...

    def save(self, installment: Installment) -> None: ...


class PaymentRepository(Protocol):
    def exists_by_reference(self, reference: str) -> bool: ...

    def create(self, payment: Payment) -> Payment: ...


class AuditRepository(Protocol):
    def append(self, event: AuditEvent) -> None: ...


class Clock(Protocol):
    def now(self) -> datetime: ...


@dataclass(frozen=True, slots=True)
class Actor:
    user_id: Optional[UUID]
    role: str
