from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from domain.entities import (
    AuditEvent,
    InstallmentStatus,
    Loan,
    LoanStatus,
    Payment,
    french_monthly_payment,
)
from domain.exceptions import BusinessRuleViolation
from domain.value_objects import Money, Rate

from .exceptions import Conflict, Forbidden
from .ports import (
    Actor,
    AuditRepository,
    ClientRepository,
    Clock,
    InstallmentRepository,
    LoanRepository,
    PaymentRepository,
)


@dataclass(frozen=True)
class CreateLoanCommand:
    client_id: UUID
    principal_amount: Decimal
    currency: str
    monthly_rate: Decimal
    term_months: int


@dataclass(frozen=True)
class CreateLoanResult:
    loan_id: UUID
    monthly_payment: Decimal


class CreateLoanUseCase:
    def __init__(
        self,
        loans: LoanRepository,
        clients: ClientRepository,
        audit: AuditRepository,
        clock: Clock,
    ) -> None:
        self._loans = loans
        self._clients = clients
        self._audit = audit
        self._clock = clock

    def execute(self, actor: Actor, cmd: CreateLoanCommand) -> CreateLoanResult:
        if actor.role not in {"ADMIN", "ANALYST"}:
            raise Forbidden("Rol no autorizado")

        client = self._clients.get(cmd.client_id)
        principal = Money(cmd.principal_amount, cmd.currency)
        rate = Rate(cmd.monthly_rate)

        loan = Loan(
            id=uuid4(),
            client_id=client.id,
            principal=principal,
            rate=rate,
            term_months=cmd.term_months,
            status=LoanStatus.PENDING,
            created_at=self._clock.now(),
        )
        loan.validate()

        monthly_payment = french_monthly_payment(principal, rate, cmd.term_months)
        if monthly_payment.amount > client.payment_capacity_monthly.amount:
            raise BusinessRuleViolation("Excede capacidad de pago")

        created = self._loans.create(loan)

        self._audit.append(
            AuditEvent(
                id=uuid4(),
                actor_user_id=actor.user_id,
                action="loan.created",
                occurred_at=self._clock.now(),
                before={},
                after={"loan_id": str(created.id), "status": created.status.value},
                meta={"client_id": str(client.id)},
            )
        )

        return CreateLoanResult(loan_id=created.id, monthly_payment=monthly_payment.amount)


@dataclass(frozen=True)
class QuoteLoanCommand:
    principal_amount: Decimal
    currency: str
    monthly_rate: Decimal
    term_months: int


@dataclass(frozen=True)
class QuoteLoanResult:
    monthly_payment: Decimal
    total_payment: Decimal
    total_interest: Decimal


class QuoteLoanUseCase:
    def execute(self, cmd: QuoteLoanCommand) -> QuoteLoanResult:
        principal = Money(cmd.principal_amount, cmd.currency)
        rate = Rate(cmd.monthly_rate)
        monthly = french_monthly_payment(principal, rate, cmd.term_months)
        total_payment = (monthly.amount * Decimal(cmd.term_months)).quantize(Decimal("0.01"))
        total_interest = (total_payment - principal.amount).quantize(Decimal("0.01"))
        return QuoteLoanResult(
            monthly_payment=monthly.amount,
            total_payment=total_payment,
            total_interest=total_interest,
        )


@dataclass(frozen=True)
class DecideLoanCommand:
    loan_id: UUID
    approve: bool
    reason: Optional[str] = None


class DecideLoanUseCase:
    def __init__(
        self,
        loans: LoanRepository,
        clients: ClientRepository,
        audit: AuditRepository,
        clock: Clock,
    ) -> None:
        self._loans = loans
        self._clients = clients
        self._audit = audit
        self._clock = clock

    def execute(self, actor: Actor, cmd: DecideLoanCommand) -> None:
        if actor.role not in {"ADMIN", "ANALYST"}:
            raise Forbidden("Rol no autorizado")

        loan = self._loans.get(cmd.loan_id)
        client = self._clients.get(loan.client_id)

        if cmd.approve:
            if client.is_delinquent:
                raise BusinessRuleViolation("Cliente moroso")
            monthly_payment = french_monthly_payment(loan.principal, loan.rate, loan.term_months)
            if monthly_payment.amount > client.payment_capacity_monthly.amount:
                raise BusinessRuleViolation("Excede capacidad de pago")
            if self._clients.has_active_debt(client.id):
                raise BusinessRuleViolation("Cliente con deuda activa")
            loan.approve()
            action = "loan.approved"
        else:
            loan.reject()
            action = "loan.rejected"

        self._loans.save(loan)
        self._audit.append(
            AuditEvent(
                id=uuid4(),
                actor_user_id=actor.user_id,
                action=action,
                occurred_at=self._clock.now(),
                before={},
                after={"loan_id": str(loan.id), "status": loan.status.value, "reason": cmd.reason},
                meta={"client_id": str(client.id)},
            )
        )


@dataclass(frozen=True)
class RegisterPaymentCommand:
    installment_id: UUID
    reference: str
    amount: Decimal
    currency: str


class RegisterPaymentUseCase:
    def __init__(
        self,
        installments: InstallmentRepository,
        payments: PaymentRepository,
        audit: AuditRepository,
        clock: Clock,
    ) -> None:
        self._installments = installments
        self._payments = payments
        self._audit = audit
        self._clock = clock

    def execute(self, actor: Actor, cmd: RegisterPaymentCommand) -> UUID:
        if actor.role not in {"ADMIN", "ANALYST", "CLIENT"}:
            raise Forbidden("Rol no autorizado")

        if self._payments.exists_by_reference(cmd.reference):
            raise Conflict("Pago duplicado")

        installment = self._installments.get_for_update(cmd.installment_id)
        if installment.status == InstallmentStatus.PAID:
            raise Conflict("La cuota ya está pagada")

        money = Money(cmd.amount, cmd.currency)
        if money.amount != installment.amount.amount or money.currency != installment.amount.currency:
            raise BusinessRuleViolation("Monto inválido para la cuota")

        installment.mark_paid()
        self._installments.save(installment)

        payment = Payment(
            id=uuid4(),
            loan_id=installment.loan_id,
            installment_id=installment.id,
            reference=cmd.reference,
            amount=money,
            paid_at=self._clock.now(),
        )
        payment.validate()
        created = self._payments.create(payment)

        self._audit.append(
            AuditEvent(
                id=uuid4(),
                actor_user_id=actor.user_id,
                action="payment.registered",
                occurred_at=self._clock.now(),
                before={},
                after={"payment_id": str(created.id), "reference": created.reference},
                meta={"installment_id": str(installment.id), "loan_id": str(installment.loan_id)},
            )
        )

        return created.id
