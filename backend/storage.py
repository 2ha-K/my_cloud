from pathlib import Path
from config import FILES_ROOT
from typing import BinaryIO
from uuid import uuid4

CHUNK_SIZE = 1024 * 1024  # 1 MB
MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024


def save_file(
    source: BinaryIO,
    storage_root: Path = None
) -> Path:

    if storage_root is None:
        storage_root = FILES_ROOT
    else:
        storage_root = FILES_ROOT / storage_root

    storage_root.mkdir(parents=True, exist_ok=True)

    file_id = str(uuid4())
    file_path = storage_root / file_id

    total_size = 0
    created = False

    try:
        with file_path.open("xb") as destination: #Exclusive Creation：只允許建立新檔案。如果檔案已存在，就拋出 FileExistsError，不會覆蓋。
            created = True

            while chunk := source.read(CHUNK_SIZE):
                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    raise ValueError(
                        f"File exceeds {MAX_FILE_SIZE / 1024**3} GB limit"
                    )

                destination.write(chunk)

    except Exception:
        if created:
            file_path.unlink(missing_ok=True) #刪除
        raise

    return file_path