from __future__ import annotations

from datetime import timedelta

from django.db import models, transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
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
from infrastructure.django_apps.accounts.models import User
from infrastructure.django_apps.loans.models import Loan as LoanModel, Payment, Installment

from .permissions import AdminOrAnalyst, AnyAuthenticated
from .serializers import (
    CreateClientSerializer,
    CreateLoanSerializer,
    DecideLoanSerializer,
    QuoteLoanSerializer,
    RegisterPaymentSerializer,
)


def _unique_username_from_email(email: str) -> str:
    base = (email or "").split("@", 1)[0].strip().lower() or "client"
    candidate = base
    i = 1
    while User.objects.filter(username=candidate).exists():
        i += 1
        candidate = f"{base}{i}"
    return candidate


def _actor_from_request(request) -> Actor:
    user = request.user
    return Actor(user_id=getattr(user, "id", None), role=getattr(user, "role", ""))


class AuthTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]

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
                    "phone": cp.phone,
                    "address": cp.address,
                    "status": cp.status,
                    "is_delinquent": cp.is_delinquent,
                }
                for cp in qs
            ]
        )

    @method_decorator(ratelimit(key="ip", rate="20/m", block=True))
    def post(self, request):
        serializer = CreateClientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        name = serializer.validated_data["name"].strip()
        email = serializer.validated_data["email"].strip().lower()
        phone = serializer.validated_data.get("phone", "") or ""
        address = serializer.validated_data.get("address", "") or ""

        parts = [p for p in name.split() if p]
        first_name = parts[0] if parts else ""
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        with transaction.atomic():
            username = _unique_username_from_email(email)
            user = User.objects.create(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=User.Role.CLIENT,
                is_active=True,
            )
            user.set_unusable_password()
            user.save(update_fields=["password"])

            cp = ClientProfile.objects.create(
                user=user,
                phone=phone,
                address=address,
            )

        return Response(
            {
                "client_id": str(cp.id),
                "name": user.get_full_name() or user.username,
                "email": user.email,
                "phone": cp.phone,
                "address": cp.address,
                "status": cp.status,
                "is_delinquent": cp.is_delinquent,
            },
            status=201,
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


class AnalyticsDashboardView(APIView):
    """Endpoint data-driven para alimentar el Dashboard.

    Responde con métricas agregadas y series temporales simples para gráficos.
    """

    permission_classes = [AdminOrAnalyst]

    @method_decorator(ratelimit(key="ip", rate="120/m", block=True))
    def get(self, request):
        now = timezone.now()
        today = now.date()

        # Totales (estado actual)
        total_clients = ClientProfile.objects.count()
        active_clients = ClientProfile.objects.filter(status=ClientProfile.Status.ACTIVE).count()
        loans_qs = LoanModel.objects.all()
        total_loans = loans_qs.count()

        total_principal = loans_qs.aggregate(total=Sum("principal_amount"))["total"]
        total_principal_str = str(total_principal or 0)

        delinquent_clients = ClientProfile.objects.filter(is_delinquent=True).count()
        delinquent_rate = (delinquent_clients / total_clients) if total_clients else 0.0

        # Métricas de pagos
        total_payments = Payment.objects.count()
        total_paid_amount = Payment.objects.aggregate(total=Sum("amount"))["total"]
        total_paid_str = str(total_paid_amount or 0)

        # Cuotas pendientes y pagadas
        total_installments = Installment.objects.count()
        pending_installments = Installment.objects.filter(status=Installment.Status.PENDING).count()
        paid_installments = Installment.objects.filter(status=Installment.Status.PAID).count()
        late_installments = Installment.objects.filter(status=Installment.Status.LATE).count()

        # Cuotas vencidas (pending + due_date < today)
        overdue_installments = Installment.objects.filter(
            status=Installment.Status.PENDING,
            due_date__lt=today
        ).count()

        # Préstamos por moneda
        loans_by_currency = dict(
            loans_qs.values("currency").annotate(count=Count("id")).values_list("currency", "count")
        )

        # Promedio de monto de préstamo
        avg_loan_amount = loans_qs.aggregate(avg=models.Avg("principal_amount"))["avg"]
        avg_loan_str = str(avg_loan_amount or 0)

        # Clientes con más de un préstamo
        from django.db.models import Count as CountFunc
        clients_with_multiple_loans = ClientProfile.objects.annotate(
            loan_count=CountFunc("loans")
        ).filter(loan_count__gt=1).count()

        # Distribución por estado
        loans_by_status_rows = (
            loans_qs.values("status").annotate(count=Count("id")).order_by("status")
        )
        loans_by_status = {row["status"]: row["count"] for row in loans_by_status_rows}

        # Serie por mes (últimos 7 meses incluyendo el actual):
        # solicitudes = total creados en el mes
        # aprobados = aprobados creados en el mes
        start = (now - timedelta(days=31 * 6)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_rows = (
            loans_qs.filter(created_at__gte=start)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(
                solicitudes=Count("id"),
                aprobados=Count("id", filter=Q(status=LoanModel.Status.APPROVED)),
                rechazados=Count("id", filter=Q(status=LoanModel.Status.REJECTED)),
            )
            .order_by("month")
        )

        monthly_series = [
            {
                "month": row["month"].date().isoformat() if row["month"] else None,
                "solicitudes": row["solicitudes"],
                "aprobados": row["aprobados"],
                "rechazados": row["rechazados"],
            }
            for row in monthly_rows
        ]

        # Serie de pagos por mes
        payment_monthly = (
            Payment.objects.filter(paid_at__gte=start)
            .annotate(month=TruncMonth("paid_at"))
            .values("month")
            .annotate(
                total=Count("id"),
                amount=Sum("amount")
            )
            .order_by("month")
        )

        payment_series = [
            {
                "month": row["month"].date().isoformat() if row["month"] else None,
                "total": row["total"],
                "amount": str(row["amount"] or 0),
            }
            for row in payment_monthly
        ]

        # Top 5 clientes por monto total prestado
        top_clients = (
            ClientProfile.objects.annotate(
                total_borrowed=Sum("loans__principal_amount")
            )
            .filter(total_borrowed__isnull=False)
            .order_by("-total_borrowed")[:5]
        )

        top_clients_data = [
            {
                "client_id": str(c.id),
                "username": c.user.username,
                "total_amount": str(c.total_borrowed or 0),
                "loan_count": c.loans.count(),
            }
            for c in top_clients
        ]

        return Response(
            {
                "totals": {
                    "clients": total_clients,
                    "active_clients": active_clients,
                    "loans": total_loans,
                    "principal_sum": total_principal_str,
                    "delinquent_clients": delinquent_clients,
                    "delinquent_rate": delinquent_rate,
                    "total_payments": total_payments,
                    "total_paid_amount": total_paid_str,
                    "total_installments": total_installments,
                    "pending_installments": pending_installments,
                    "paid_installments": paid_installments,
                    "late_installments": late_installments,
                    "overdue_installments": overdue_installments,
                    "avg_loan_amount": avg_loan_str,
                    "clients_with_multiple_loans": clients_with_multiple_loans,
                },
                "distributions": {
                    "loans_by_status": loans_by_status,
                    "loans_by_currency": loans_by_currency,
                },
                "series": {
                    "loans_by_month": monthly_series,
                    "payments_by_month": payment_series,
                },
                "top_clients": top_clients_data,
            }
        )
