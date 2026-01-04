import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "infrastructure.config.settings")

app = Celery("loan_system")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
app.autodiscover_tasks(["events"])

