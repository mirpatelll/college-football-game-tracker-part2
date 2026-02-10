import os
import psycopg2

def get_db():
    return psycopg2.connect(
        os.environ.get("DATABASE_URL"),
        sslmode="require"
    )
