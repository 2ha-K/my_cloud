import sqlite3
from config import DATABASE_PATH


def connect_db():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(DATABASE_PATH)


def init_db():
    conn = connect_db()

    try:
        # 檢查 Table 是否已存在
        cursor = conn.execute("""
            SELECT name FROM sqlite_master
            WHERE type = 'table' AND name = 'files'
        """)

        if cursor.fetchone():
            print("Table already exists!")
            return False

        # 建立 Table
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS files (
                    file_id TEXT PRIMARY KEY,
                    original_name TEXT NOT NULL,
                    storage_path TEXT NOT NULL UNIQUE,
                    size INTEGER NOT NULL CHECK (size >= 0),
                    mime_type TEXT,
                    created_at TEXT,
                    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)

        print("Table created successfully!")
        return True

    finally:
        conn.close()


def add_file(conn, file_id, filename, storage_path, size, mime_type=None, taken_at=None):
    conn.execute(
        """
        INSERT INTO files (
            file_id, original_name, storage_path,
            size, mime_type, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (file_id, filename, storage_path, size, mime_type, taken_at)
    )


def get_file(conn, file_id):
    cursor = conn.execute(
        "SELECT * FROM files WHERE file_id = ?",
        (file_id,)
    )
    return cursor.fetchone()

def get_all_files(conn):
    cursor = conn.execute("""
        SELECT *
        FROM files
        ORDER BY COALESCE(created_at, uploaded_at) DESC
    """)
    return cursor.fetchall()


def delete_file(conn, file_id):
    conn.execute(
        "DELETE FROM files WHERE file_id = ?",
        (file_id,)
    )


if __name__ == "__main__":
    init_db()