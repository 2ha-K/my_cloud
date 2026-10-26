
from fastapi import FastAPI, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from database import init_db
from file_service import upload_file, list_files, get_file_path


"""
uvicorn main:app --reload
"""

@asynccontextmanager
async def lifespan(_app: FastAPI): #這個參數是必要的，但我目前不會使用它。
    print("1. Server starting")
    init_db()
    yield
    print("3. Server shutting down")


app = FastAPI(lifespan=lifespan)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/upload")
def upload(
    file: UploadFile,
    created_at: str | None = Form(None)
):
    try:
        file_id = upload_file(
            source=file.file,
            filename=file.filename,
            mime_type=file.content_type,
            created_at=created_at
        )

        return {
            "message": "Upload successful",
            "file_id": file_id
        }

    except ValueError as e:
        # 檔案超過大小限制，或日期格式錯誤
        raise HTTPException(
            status_code=400,
            detail=str(e)
        ) from e

    except Exception as e:
        # Storage 或 Database 發生其他錯誤
        print(f"Upload failed: {e}")

        raise HTTPException(
            status_code=500,
            detail="Upload failed"
        ) from e


# 取得所有檔案的 Metadata
@app.get("/files")
def get_files():
    try:
        return list_files()

    except Exception as e:
        print(f"Failed to list files: {e}")

        raise HTTPException(
            status_code=500,
            detail="Failed to list files"
        ) from e


# 取得指定檔案的原始內容
@app.get("/files/{file_id}")
def download_file(file_id: str):
    try:
        result = get_file_path(file_id)

        # SQLite 找不到該檔案
        if result is None:
            raise HTTPException(
                status_code=404,
                detail="File not found"
            )

        file_path, original_name = result

        return FileResponse(
            path=file_path,
            filename=original_name,
            media_type="application/octet-stream"
        )

    except FileNotFoundError as e:
        print(f"Storage inconsistency: {e}")

        raise HTTPException(
            status_code=500,
            detail="File storage error"
        ) from e
