This repository contains the God Level coding challenge solution skeleton.

Note: see `Markdowns (Excluir depois)/README.md` for the full problem statement and quickstart.

Important local dev note:

If you have PostgreSQL running locally on the host, Docker's default mapping of port `5432` may conflict with your local server.
Two options to avoid that:

1. Stop the local Postgres instance (via services.msc or `Stop-Service`) so the container can bind to 5432.
2. Or remap the container port to a different host port (example: `5433:5432`) in `docker-compose.yml` and update `backend/.env` to point to `localhost:5433`.

This will prevent `psql` from accidentally connecting to a different Postgres server and causing authentication errors.

How to run the backend and tests (Windows PowerShell)
---------------------------------------------------

Quick steps to get the backend running locally and to run tests. Run these from the repository root.

1. Create and activate a Python virtualenv (PowerShell):

```powershell
cd .\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. Install runtime + test dependencies:

```powershell
# installs runtime and test deps listed in backend/requirements.txt
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

3. Run the API locally (uses the .env in backend/):

```powershell
# from backend\
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

4. Run tests (from backend):

```powershell
python -m pytest -q
```

Notes:
- `requirements.txt` includes testing deps (pytest, httpx) so CI and local runs behave the same.
- If your local PostgreSQL is running and you prefer not to stop it, use the remap-to-5433 approach described above.
- The repository also contains a GitHub Actions workflow at `.github/workflows/python-app.yml` which runs the tests on push/PR.
