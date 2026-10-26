from storage import save_file
from pathlib import Path

def test_save_file(tmp_path=Path("test")):
    with open("tests/test.png", "rb") as source:
        path = save_file(
            source,
            storage_root=tmp_path
        )

    assert path.exists()
    assert path.read_bytes() == Path("tests/test.png").read_bytes()