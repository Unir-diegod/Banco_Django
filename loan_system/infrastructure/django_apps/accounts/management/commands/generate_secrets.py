"""
Management command para generar credenciales seguras
"""
import secrets
from django.core.management.base import BaseCommand
from django.core.management.utils import get_random_secret_key


class Command(BaseCommand):
    help = 'Genera credenciales seguras para variables de entorno'

    def add_arguments(self, parser):
        parser.add_argument(
            '--secret-key',
            action='store_true',
            help='Generar Django SECRET_KEY',
        )
        parser.add_argument(
            '--password',
            action='store_true',
            help='Generar contraseña segura para base de datos',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Generar todas las credenciales',
        )

    def handle(self, *args, **options):
        if options['all'] or options['secret_key']:
            secret_key = get_random_secret_key()
            self.stdout.write(self.style.SUCCESS('Django SECRET_KEY:'))
            self.stdout.write(f'DJANGO_SECRET_KEY={secret_key}\n')

        if options['all'] or options['password']:
            # Generar password de 32 caracteres seguro
            password = secrets.token_urlsafe(32)
            self.stdout.write(self.style.SUCCESS('Database Password (32 chars):'))
            self.stdout.write(f'MYSQL_PASSWORD={password}\n')
            
            # Generar password root más fuerte
            root_password = secrets.token_urlsafe(48)
            self.stdout.write(self.style.SUCCESS('MySQL Root Password (48 chars):'))
            self.stdout.write(f'MYSQL_ROOT_PASSWORD={root_password}\n')

        if not any([options['all'], options['secret_key'], options['password']]):
            self.stdout.write(self.style.WARNING(
                'Uso: python manage.py generate_secrets --all|--secret-key|--password'
            ))
