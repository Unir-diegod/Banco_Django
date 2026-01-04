from decimal import Decimal

import pytest

from domain.exceptions import ValidationError
from domain.value_objects import Money


def test_money_quantizes_to_cents():
    m = Money(Decimal("10.005"), "USD")
    assert m.amount == Decimal("10.01")


def test_money_negative_rejected():
    with pytest.raises(ValidationError):
        Money(Decimal("-1"), "USD")
