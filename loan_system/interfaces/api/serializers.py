from __future__ import annotations

from rest_framework import serializers


class CreateLoanSerializer(serializers.Serializer):
    client_id = serializers.UUIDField()
    principal_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=3)
    monthly_rate = serializers.DecimalField(max_digits=7, decimal_places=6)
    term_months = serializers.IntegerField(min_value=1, max_value=600)


class DecideLoanSerializer(serializers.Serializer):
    approve = serializers.BooleanField()
    reason = serializers.CharField(required=False, allow_blank=True, max_length=250)


class RegisterPaymentSerializer(serializers.Serializer):
    installment_id = serializers.UUIDField()
    reference = serializers.CharField(max_length=100)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=3)


class QuoteLoanSerializer(serializers.Serializer):
    principal_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=3)
    monthly_rate = serializers.DecimalField(max_digits=7, decimal_places=6)
    term_months = serializers.IntegerField(min_value=1, max_value=600)
