"""
Comando para generar datos de demostración completos con múltiples clientes, préstamos y cuotas.
"""
from __future__ import annotations

import random
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from infrastructure.django_apps.accounts.models import ClientProfile
from infrastructure.django_apps.loans.models import Installment, Loan


class Command(BaseCommand):
    help = "Genera datos de demostración: múltiples clientes, préstamos y cuotas"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clients",
            type=int,
            default=10,
            help="Número de clientes a crear (default: 10)"
        )

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        num_clients = options["clients"]

        first_names = ["Juan", "María", "Carlos", "Ana", "Pedro", "Laura", "Diego", "Carmen", "Luis", "Elena",
                       "José", "Isabel", "Miguel", "Rosa", "Antonio", "Patricia"]
        last_names = ["García", "Rodríguez", "Martínez", "López", "González", "Pérez", "Sánchez", "Ramírez",
                     "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Cruz", "Morales", "Reyes"]

        cities = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga", "Murcia", "Palma"]
        streets = ["Calle Mayor", "Av. Principal", "Calle Real", "Paseo Central", "Calle Nueva"]

        self.stdout.write(f"Generando {num_clients} clientes de demostración...")

        created_count = 0
        for i in range(1, num_clients + 1):
            username = f"cliente{i}"
            
            # Verificar si ya existe
            if User.objects.filter(username=username).exists():
                self.stdout.write(self.style.WARNING(f"Cliente {username} ya existe, saltando..."))
                continue

            # Crear usuario
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            
            user = User.objects.create_user(
                username=username,
                email=f"{username}@example.com",
                password="cliente123",
                first_name=first_name,
                last_name=last_name,
                role="CLIENT",
                is_staff=False,
                is_superuser=False
            )

            # Crear perfil de cliente
            phone = f"+34 {random.randint(600, 699)} {random.randint(100000, 999999)}"
            address = f"{random.choice(streets)} {random.randint(1, 200)}, {random.choice(cities)}"
            
            profile = ClientProfile.objects.create(
                user=user,
                phone=phone,
                address=address,
                status=random.choice([ClientProfile.Status.ACTIVE, ClientProfile.Status.ACTIVE, 
                                     ClientProfile.Status.ACTIVE, ClientProfile.Status.SUSPENDED]),
                is_delinquent=random.choice([False, False, False, True]),
                payment_capacity_monthly=Decimal(str(random.randint(1000, 10000)))
            )

            # Crear entre 1-4 préstamos por cliente
            num_loans = random.randint(1, 4)
            for j in range(num_loans):
                status = random.choice([
                    Loan.Status.APPROVED, Loan.Status.APPROVED, Loan.Status.APPROVED,
                    Loan.Status.PENDING, Loan.Status.REJECTED
                ])
                
                principal = Decimal(str(random.randint(500, 50000)))
                term_months = random.choice([6, 12, 18, 24, 36])
                monthly_rate = Decimal(str(random.uniform(0.01, 0.05)))
                
                loan = Loan.objects.create(
                    client_profile=profile,
                    principal_amount=principal,
                    currency="USD",
                    monthly_rate=monthly_rate,
                    term_months=term_months,
                    status=status
                )

                # Si está aprobado, crear cuotas
                if status == Loan.Status.APPROVED:
                    installment_amount = principal / term_months
                    
                    # Crear entre 1 y todas las cuotas
                    num_installments = random.randint(1, min(term_months, 6))
                    for k in range(1, num_installments + 1):
                        installment_status = Installment.Status.PENDING
                        
                        # Algunas cuotas pueden estar pagadas o vencidas
                        if k < num_installments - 1:
                            installment_status = random.choice([
                                Installment.Status.PAID, Installment.Status.PAID,
                                Installment.Status.PENDING, Installment.Status.LATE
                            ])
                        
                        Installment.objects.create(
                            loan=loan,
                            number=k,
                            due_date=date.today() + timedelta(days=30 * k),
                            amount=installment_amount,
                            currency="USD",
                            status=installment_status
                        )

            created_count += 1
            if created_count % 5 == 0:
                self.stdout.write(f"  {created_count}/{num_clients} clientes creados...")

        self.stdout.write(self.style.SUCCESS(f"\n✓ Seed completado: {created_count} clientes creados"))
        self.stdout.write(f"Credenciales: cliente1-cliente{num_clients} / cliente123")
        
        # Estadísticas
        total_clients = ClientProfile.objects.count()
        total_loans = Loan.objects.count()
        total_installments = Installment.objects.count()
        
        self.stdout.write(f"\nEstadísticas:")
        self.stdout.write(f"  Total clientes: {total_clients}")
        self.stdout.write(f"  Total préstamos: {total_loans}")
        self.stdout.write(f"  Total cuotas: {total_installments}")
