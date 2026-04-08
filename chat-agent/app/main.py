# Backward-compatibility shim — allows `uvicorn app.main:app` to still work.
# The actual application lives in main.py at the project root.
from main import app  # noqa: F401
