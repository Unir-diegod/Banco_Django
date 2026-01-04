from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from infrastructure.django_apps.accounts.models import ClientProfile
from infrastructure.django_apps.loans.models import Installment, Loan


class Command(BaseCommand):
    help = "Crea datos mínimos (admin+cliente+loan+installment) para pruebas end-to-end."

    def add_arguments(self, parser):
        parser.add_argument("--admin-username", default="admin")
        parser.add_argument("--admin-email", default="admin@example.com")
        parser.add_argument("--admin-password", default="admin1234")
        parser.add_argument("--client-username", default="client1")
        parser.add_argument("--client-email", default="client1@example.com")
        parser.add_argument("--client-password", default="client1234")

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()

        admin, created_admin = User.objects.get_or_create(
            username=options["admin_username"],
            defaults={
                "email": options["admin_email"],
                "is_staff": True,
                "is_superuser": True,
                "role": "ADMIN",
            },
        )
        if created_admin:
            admin.set_password(options["admin_password"])
            admin.save(update_fields=["password", "email", "is_staff", "is_superuser", "role"])
        else:
            if getattr(admin, "role", "") != "ADMIN":
                admin.role = "ADMIN"
                admin.is_staff = True
                admin.is_superuser = True
                admin.save(update_fields=["role", "is_staff", "is_superuser"])

        client_user, created_client_user = User.objects.get_or_create(
            username=options["client_username"],
            defaults={
                "email": options["client_email"],
                "is_staff": False,
                "is_superuser": False,
                "role": "CLIENT",
            },
        )
        if created_client_user:
            client_user.set_password(options["client_password"])
            client_user.save(update_fields=["password", "email", "role"])

        profile, _ = ClientProfile.objects.get_or_create(
            user=client_user,
            defaults={
                "status": ClientProfile.Status.ACTIVE,
                "is_delinquent": False,
                "payment_capacity_monthly": Decimal("5000.00"),
            },
        )

        loan, _ = Loan.objects.get_or_create(
            client_profile=profile,
            status=Loan.Status.APPROVED,
            defaults={
                "principal_amount": Decimal("1000.00"),
                "currency": "USD",
                "monthly_rate": Decimal("0.030000"),
                "term_months": 12,
            },
        )

        installment, _ = Installment.objects.get_or_create(
            loan=loan,
            number=1,
            defaults={
                "due_date": date.today() + timedelta(days=30),
                "amount": Decimal("100.00"),
                "currency": "USD",
                "status": Installment.Status.PENDING,
            },
        )

        if installment.status != Installment.Status.PENDING:
            next_number = (Installment.objects.filter(loan=loan).aggregate(m=Max("number"))["m"] or 0) + 1
            installment = Installment.objects.create(
                loan=loan,
                number=next_number,
                due_date=date.today() + timedelta(days=30 * next_number),
                amount=Decimal("100.00"),
                currency="USD",
                status=Installment.Status.PENDING,
            )

        self.stdout.write(self.style.SUCCESS("Seed completado"))
        self.stdout.write(f"ADMIN username={admin.username} password={options['admin_password']}")
        self.stdout.write(f"CLIENT username={client_user.username} password={options['client_password']}")
        self.stdout.write(f"client_id={profile.id}")
        self.stdout.write(f"loan_id={loan.id}")
        self.stdout.write(f"installment_id={installment.id}")
