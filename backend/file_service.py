from typing import BinaryIO

from config import STORAGE_ROOT
from storage import save_file
from database import connect_db, add_file
from metadata import extract_taken_at

def upload_file(source: BinaryIO, filename: str, mime_type: str = None, created_at: str | None = None):
    file_path = None
    conn = None

    try:
        # Step 1：儲存原始檔案
        file_path = save_file(source)

        # Step 2：準備 Metadata
        file_id = file_path.name
        storage_path = file_path.relative_to(STORAGE_ROOT).as_posix()
        size = file_path.stat().st_size

        # Step 3：讀取照片拍攝時間
        taken_at = extract_taken_at(file_path) or created_at  # ← 新增

        # Step 4：寫入 SQLite
        conn = connect_db()
        with conn:
            add_file(
                conn,
                file_id=file_id,
                filename=filename,
                storage_path=storage_path,
                size=size,
                mime_type=mime_type,
                taken_at=taken_at  # ← 新增
            )

        return file_id

    except Exception:
        if file_path is not None:
            file_path.unlink(missing_ok=True)
        raise

    finally:
        if conn is not None:
            conn.close()

from pathlib import Path
from database import get_file, get_all_files


def list_files():
    conn = connect_db()

    try:
        rows = get_all_files(conn)

        return [
            {
                "file_id": row[0],
                "original_name": row[1],
                "storage_path": row[2],
                "size": row[3],
                "mime_type": row[4],
                "taken_at": row[5],
                "uploaded_at": row[6]
            }
            for row in rows
        ]

    finally:
        conn.close()


def get_file_path(file_id: str):
    conn = connect_db()

    try:
        row = get_file(conn, file_id)

        if row is None:
            return None

        file_path = STORAGE_ROOT / row[2]

        # 避免資料庫內的路徑指向 Storage 外部
        if not file_path.resolve().is_relative_to(STORAGE_ROOT.resolve()):
            raise ValueError("Invalid storage path")

        if not file_path.is_file():
            raise FileNotFoundError(
                f"File exists in database but missing from storage: {file_id}"
            )

        return file_path, row[1]

    finally:
        conn.close()