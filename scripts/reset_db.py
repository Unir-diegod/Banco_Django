import os
import sys
import pymysql

# Add project root to path to import settings if needed, but we can just read env vars or hardcode for this script since we know them.
# Actually, let's just use the values we know are in .env

DB_CONFIG = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': '',
    'db': 'banco_db',
    'port': 3306,
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def reset_database():
    print("Connecting to database...")
    try:
        connection = pymysql.connect(**DB_CONFIG)
        with connection.cursor() as cursor:
            print("Disabling foreign key checks...")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            
            print("Fetching tables...")
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            
            if not tables:
                print("No tables found.")
            else:
                for table in tables:
                    table_name = list(table.values())[0]
                    print(f"Dropping table: {table_name}")
                    cursor.execute(f"DROP TABLE IF EXISTS `{table_name}`")
            
            print("Enabling foreign key checks...")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        connection.commit()
        connection.close()
        print("Database reset successfully.")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    reset_database()
