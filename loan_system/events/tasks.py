from __future__ import annotations

from celery import shared_task


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def generate_installments_task(self, loan_id: str) -> dict:
    # Placeholder: generar cuotas para un préstamo aprobado.
    return {"status": "todo", "loan_id": loan_id}


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def recalc_interest_task(self, loan_id: str) -> dict:
    # Placeholder: recalcular intereses bajo evento controlado.
    return {"status": "todo", "loan_id": loan_id}


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def audit_export_task(self, since_iso: str) -> dict:
    # Placeholder: exportar auditoría.
    return {"status": "todo", "since": since_iso}
