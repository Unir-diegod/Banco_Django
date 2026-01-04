try:
	import pymysql

	pymysql.install_as_MySQLdb()
except Exception:
	# PyMySQL es opcional (solo requerido si se usa MySQL).
	pass

from .celery import app as celery_app

__all__ = ("celery_app",)
