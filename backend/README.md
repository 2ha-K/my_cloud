python -m pytest tests -v
預設值也沒錯：Uvicorn 沒有指定 --host 時，預設就是 127.0.0.1。
uvicorn main:app --reload
監聽所有 IPv4 網路介面 Uvicorn 會監聽未來可能進來的連線請求。http://153.33.229.201:8000
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
python -m uvicorn main:app --host 192.168.137.1 --port 8000 --reload