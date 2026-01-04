from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest

from application.exceptions import Conflict
from application.ports import Actor
from application.use_cases import RegisterPaymentCommand, RegisterPaymentUseCase
from domain.entities import Installment, InstallmentStatus
from domain.value_objects import Money


class FakeInstallments:
    def __init__(self, inst: Installment):
        self._inst = inst

    def get_for_update(self, installment_id):
        return self._inst

    def save(self, installment):
        self._inst = installment


class FakePayments:
    def __init__(self, exists: bool):
        self._exists = exists

    def exists_by_reference(self, reference: str) -> bool:
        return self._exists

    def create(self, payment):
        return payment


class FakeAudit:
    def append(self, event):
        return None


class FakeClock:
    def now(self):
        return datetime.now(tz=timezone.utc)


def test_rejects_duplicate_payment_reference():
    inst = Installment(
        id=uuid4(),
        loan_id=uuid4(),
        number=1,
        due_date=datetime.now(tz=timezone.utc).date(),
        amount=Money(Decimal("100.00"), "USD"),
        status=InstallmentStatus.PENDING,
    )

    uc = RegisterPaymentUseCase(
        installments=FakeInstallments(inst),
        payments=FakePayments(exists=True),
        audit=FakeAudit(),
        clock=FakeClock(),
    )

    with pytest.raises(Conflict):
        uc.execute(
            Actor(user_id=uuid4(), role="CLIENT"),
            RegisterPaymentCommand(
                installment_id=inst.id,
                reference="ref-1",
                amount=Decimal("100.00"),
                currency="USD",
            ),
        )
