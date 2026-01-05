from __future__ import annotations

import random
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
        parser.add_argument("--with-historical-data", action="store_true", help="Genera datos históricos para gráficos")

    def create_historical_loans(self, profile):
        """Crea préstamos históricos de los últimos 6 meses para dashboards"""
        now = timezone.now()
        statuses = [Loan.Status.APPROVED, Loan.Status.PENDING, Loan.Status.REJECTED, Loan.Status.APPROVED]
        
        created_loans = []
        for months_ago in range(6, -1, -1):  # 6 meses atrás hasta ahora
            # Crear entre 1-3 préstamos por mes
            num_loans = random.randint(1, 3)
            for _ in range(num_loans):
                created_date = now - timedelta(days=30 * months_ago + random.randint(0, 25))
                status = random.choice(statuses)
                
                loan = Loan.objects.create(
                    client_profile=profile,
                    principal_amount=Decimal(str(random.randint(500, 5000))),
                    currency="USD",
                    monthly_rate=Decimal("0.030000"),
                    term_months=random.choice([6, 12, 24]),
                    status=status,
                )
                # Actualizar created_at manualmente
                Loan.objects.filter(id=loan.id).update(created_at=created_date)
                
                # Si está aprobado, crear algunas cuotas
                if status == Loan.Status.APPROVED:
                    for i in range(1, min(loan.term_months + 1, 4)):  # Max 3 cuotas
                        Installment.objects.create(
                            loan=loan,
                            number=i,
                            due_date=(created_date + timedelta(days=30 * i)).date(),
                            amount=loan.principal_amount / loan.term_months,
                            currency=loan.currency,
                            status=Installment.Status.PENDING,
                        )
                
                created_loans.append(loan)
        
        return created_loans

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

        # Crear datos históricos si se especifica
        historical_loans = []
        if options.get("with_historical_data"):
            self.stdout.write("Generando datos históricos...")
            historical_loans = self.create_historical_loans(profile)
            self.stdout.write(self.style.SUCCESS(f"Creados {len(historical_loans)} préstamos históricos"))

        self.stdout.write(self.style.SUCCESS("Seed completado"))
        self.stdout.write(f"ADMIN username={admin.username} password={options['admin_password']}")
        self.stdout.write(f"CLIENT username={client_user.username} password={options['client_password']}")
        self.stdout.write(f"client_id={profile.id}")
        self.stdout.write(f"loan_id={loan.id}")
        self.stdout.write(f"installment_id={installment.id}")
        if historical_loans:
            self.stdout.write(f"historical_loans_count={len(historical_loans)}")
