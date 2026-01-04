from __future__ import annotations

from application.exceptions import NotFound
from domain.entities import (
    AuditEvent,
    Client,
    ClientStatus,
    Installment,
    InstallmentStatus,
    Loan,
    LoanStatus,
    Payment,
)
from domain.value_objects import Money, Rate
from infrastructure.django_apps.accounts.models import ClientProfile
from infrastructure.django_apps.audit.models import AuditLog
from infrastructure.django_apps.loans.models import Installment as InstallmentModel
from infrastructure.django_apps.loans.models import Loan as LoanModel
from infrastructure.django_apps.loans.models import Payment as PaymentModel


class DjangoClientRepository:
    def get(self, client_id):
        try:
            cp = ClientProfile.objects.select_related("user").get(id=client_id)
        except ClientProfile.DoesNotExist as exc:
            raise NotFound("Cliente no encontrado") from exc

        return Client(
            id=cp.id,
            name=cp.user.get_full_name() or cp.user.username,
            email=cp.user.email,
            status=ClientStatus(cp.status),
            is_delinquent=cp.is_delinquent,
            payment_capacity_monthly=Money(cp.payment_capacity_monthly, "USD"),
        )

    def has_active_debt(self, client_id):
        return LoanModel.objects.filter(
            client_profile_id=client_id,
            status=LoanModel.Status.APPROVED,
            installments__status__in=[InstallmentModel.Status.PENDING, InstallmentModel.Status.LATE],
        ).exists()


class DjangoLoanRepository:
    def create(self, loan: Loan) -> Loan:
        obj = LoanModel.objects.create(
            id=loan.id,
            client_profile_id=loan.client_id,
            principal_amount=loan.principal.amount,
            currency=loan.principal.currency,
            monthly_rate=loan.rate.monthly_rate,
            term_months=loan.term_months,
            status=loan.status.value,
        )
        return self._to_domain(obj)

    def get(self, loan_id) -> Loan:
        try:
            obj = LoanModel.objects.get(id=loan_id)
        except LoanModel.DoesNotExist as exc:
            raise NotFound("Préstamo no encontrado") from exc
        return self._to_domain(obj)

    def save(self, loan: Loan) -> None:
        LoanModel.objects.filter(id=loan.id).update(status=loan.status.value)

    def _to_domain(self, obj: LoanModel) -> Loan:
        return Loan(
            id=obj.id,
            client_id=obj.client_profile_id,
            principal=Money(obj.principal_amount, obj.currency),
            rate=Rate(obj.monthly_rate),
            term_months=obj.term_months,
            status=LoanStatus(obj.status),
            created_at=obj.created_at,
        )


class DjangoInstallmentRepository:
    def list_by_loan(self, loan_id):
        qs = InstallmentModel.objects.filter(loan_id=loan_id).order_by("number")
        return [self._to_domain(i) for i in qs]

    def get_for_update(self, installment_id):
        try:
            obj = InstallmentModel.objects.select_for_update().get(id=installment_id)
        except InstallmentModel.DoesNotExist as exc:
            raise NotFound("Cuota no encontrada") from exc
        return self._to_domain(obj)

    def save(self, installment: Installment) -> None:
        InstallmentModel.objects.filter(id=installment.id).update(status=installment.status.value)

    def _to_domain(self, obj: InstallmentModel) -> Installment:
        return Installment(
            id=obj.id,
            loan_id=obj.loan_id,
            number=obj.number,
            due_date=obj.due_date,
            amount=Money(obj.amount, obj.currency),
            status=InstallmentStatus(obj.status),
        )


class DjangoPaymentRepository:
    def exists_by_reference(self, reference: str) -> bool:
        return PaymentModel.objects.filter(reference=reference).exists()

    def create(self, payment: Payment) -> Payment:
        obj = PaymentModel.objects.create(
            id=payment.id,
            loan_id=payment.loan_id,
            installment_id=payment.installment_id,
            reference=payment.reference,
            amount=payment.amount.amount,
            currency=payment.amount.currency,
            paid_at=payment.paid_at,
        )
        return Payment(
            id=obj.id,
            loan_id=obj.loan_id,
            installment_id=obj.installment_id,
            reference=obj.reference,
            amount=Money(obj.amount, obj.currency),
            paid_at=obj.paid_at,
        )


class DjangoAuditRepository:
    def append(self, event: AuditEvent) -> None:
        AuditLog.objects.create(
            id=event.id,
            actor_id=event.actor_user_id,
            action=event.action,
            occurred_at=event.occurred_at,
            before=event.before,
            after=event.after,
            meta=event.meta,
        )

