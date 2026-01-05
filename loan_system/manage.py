#!/usr/bin/env python
import os
import sys
import pymysql

pymysql.install_as_MySQLdb()

# Monkeypatch to bypass MariaDB version check for XAMPP
from django.db.backends.mysql.base import DatabaseWrapper
DatabaseWrapper.check_database_version_supported = lambda self: None

# Monkeypatch to disable RETURNING clause for older MariaDB versions
from django.db.backends.mysql.features import DatabaseFeatures
DatabaseFeatures.can_return_columns_from_insert = False

def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "infrastructure.config.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
