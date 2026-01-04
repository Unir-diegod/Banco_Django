from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from .exceptions import ValidationError


MONEY_QUANT = Decimal("0.01")


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


@dataclass(frozen=True, slots=True)
class Money:
    amount: Decimal
    currency: str = "USD"

    def __post_init__(self) -> None:
        if self.amount.is_nan():
            raise ValidationError("Monto inválido")
        if self.amount < 0:
            raise ValidationError("El monto no puede ser negativo")
        if not self.currency or len(self.currency) != 3:
            raise ValidationError("Moneda inválida")

        object.__setattr__(self, "amount", quantize_money(self.amount))

    def __add__(self, other: "Money") -> "Money":
        self._assert_same_currency(other)
        return Money(self.amount + other.amount, self.currency)

    def __sub__(self, other: "Money") -> "Money":
        self._assert_same_currency(other)
        if self.amount < other.amount:
            raise ValidationError("Saldo insuficiente")
        return Money(self.amount - other.amount, self.currency)

    def _assert_same_currency(self, other: "Money") -> None:
        if self.currency != other.currency:
            raise ValidationError("Monedas distintas")


@dataclass(frozen=True, slots=True)
class Rate:
    """Tasa nominal mensual como decimal (ej: 0.03 = 3%)."""

    monthly_rate: Decimal

    def __post_init__(self) -> None:
        if self.monthly_rate < 0:
            raise ValidationError("La tasa no puede ser negativa")
