
import json
import subprocess
from pathlib import Path
from datetime import datetime


def extract_taken_at(file_path: Path) -> str | None:
    # 使用 ExifTool 讀取照片或影片的 Metadata
    try:
        result = subprocess.run(
            [
                "exiftool",
                "-json",
                "-DateTimeOriginal",
                "-CreationDate",
                "-CreateDate",
                str(file_path)
            ],
            capture_output=True, #接收輸出
            text=True,
            check=True
        )

        metadata = json.loads(result.stdout)[0]

        # 依照優先順序尋找拍攝時間
        for key in ("DateTimeOriginal", "CreationDate", "CreateDate"):
            value = metadata.get(key)

            if not value:
                continue

            try:
                # ExifTool 日期格式：2026:10:20 15:30:00
                dt = datetime.strptime( #String → datetime
                    value[:19],
                    "%Y:%m:%d %H:%M:%S"
                )

                return dt.strftime("%Y-%m-%d %H:%M:%S")

            except (ValueError, TypeError):
                continue

        # 沒有拍攝時間
        return None

    except (subprocess.CalledProcessError, json.JSONDecodeError, IndexError) as e:
        print(f"Failed to extract metadata: {e}")
        return None
