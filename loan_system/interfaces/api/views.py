from __future__ import annotations

from django.db import transaction
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from application.ports import Actor
from application.use_cases import (
    CreateLoanCommand,
    CreateLoanUseCase,
    DecideLoanCommand,
    DecideLoanUseCase,
    QuoteLoanCommand,
    QuoteLoanUseCase,
    RegisterPaymentCommand,
    RegisterPaymentUseCase,
)
from infrastructure.repositories.clock import SystemClock
from infrastructure.repositories.django_repositories import (
    DjangoAuditRepository,
    DjangoClientRepository,
    DjangoInstallmentRepository,
    DjangoLoanRepository,
    DjangoPaymentRepository,
)
from infrastructure.django_apps.accounts.models import ClientProfile
from infrastructure.django_apps.loans.models import Loan as LoanModel

from .permissions import AdminOrAnalyst, AnyAuthenticated
from .serializers import CreateLoanSerializer, DecideLoanSerializer, QuoteLoanSerializer, RegisterPaymentSerializer


def _actor_from_request(request) -> Actor:
    user = request.user
    return Actor(user_id=getattr(user, "id", None), role=getattr(user, "role", ""))


class AuthTokenObtainPairView(TokenObtainPairView):
    @method_decorator(ratelimit(key="ip", rate="10/m", block=True))
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LoanQuoteView(APIView):
    permission_classes = [AdminOrAnalyst]

    @method_decorator(ratelimit(key="ip", rate="60/m", block=True))
    def post(self, request):
        serializer = QuoteLoanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = QuoteLoanUseCase()
        result = uc.execute(QuoteLoanCommand(**serializer.validated_data))
        return Response(
            {
                "monthly_payment": str(result.monthly_payment),
                "total_payment": str(result.total_payment),
                "total_interest": str(result.total_interest),
            }
        )


class ClientsListView(APIView):
    permission_classes = [AdminOrAnalyst]

    @method_decorator(ratelimit(key="ip", rate="120/m", block=True))
    def get(self, request):
        qs = ClientProfile.objects.select_related("user").order_by("user__username")
        return Response(
            [
                {
                    "client_id": str(cp.id),
                    "name": cp.user.get_full_name() or cp.user.username,
                    "email": cp.user.email,
                    "status": cp.status,
                    "is_delinquent": cp.is_delinquent,
                }
                for cp in qs
            ]
        )


class LoanCreateView(APIView):
    permission_classes = [AdminOrAnalyst]

    @method_decorator(ratelimit(key="ip", rate="120/m", block=True))
    def get(self, request):
        qs = LoanModel.objects.select_related("client_profile__user").order_by("-created_at")
        return Response(
            [
                {
                    "loan_id": str(loan.id),
                    "client_id": str(loan.client_profile_id),
                    "principal_amount": str(loan.principal_amount),
                    "currency": loan.currency,
                    "monthly_rate": str(loan.monthly_rate),
                    "term_months": loan.term_months,
                    "status": loan.status,
                    "created_at": loan.created_at.isoformat(),
                }
                for loan in qs
            ]
        )

    @method_decorator(ratelimit(key="ip", rate="20/m", block=True))
    def post(self, request):
        serializer = CreateLoanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = CreateLoanUseCase(
            loans=DjangoLoanRepository(),
            clients=DjangoClientRepository(),
            audit=DjangoAuditRepository(),
            clock=SystemClock(),
        )
        result = uc.execute(_actor_from_request(request), CreateLoanCommand(**serializer.validated_data))
        return Response({"loan_id": str(result.loan_id), "monthly_payment": str(result.monthly_payment)})


class LoanDecisionView(APIView):
    permission_classes = [AdminOrAnalyst]

    @method_decorator(ratelimit(key="ip", rate="20/m", block=True))
    def post(self, request, loan_id):
        serializer = DecideLoanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = DecideLoanUseCase(
            loans=DjangoLoanRepository(),
            clients=DjangoClientRepository(),
            audit=DjangoAuditRepository(),
            clock=SystemClock(),
        )
        uc.execute(
            _actor_from_request(request),
            DecideLoanCommand(loan_id=loan_id, **serializer.validated_data),
        )
        return Response({"status": "ok"})


class RegisterPaymentView(APIView):
    permission_classes = [AnyAuthenticated]

    @method_decorator(ratelimit(key="ip", rate="30/m", block=True))
    def post(self, request):
        serializer = RegisterPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = RegisterPaymentUseCase(
            installments=DjangoInstallmentRepository(),
            payments=DjangoPaymentRepository(),
            audit=DjangoAuditRepository(),
            clock=SystemClock(),
        )

        with transaction.atomic():
            payment_id = uc.execute(
                _actor_from_request(request),
                RegisterPaymentCommand(**serializer.validated_data),
            )
        return Response({"payment_id": str(payment_id)})
