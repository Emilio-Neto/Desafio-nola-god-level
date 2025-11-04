This repository contains the God Level coding challenge solution skeleton.

Note: see `Markdowns (Excluir depois)/README.md` for the full problem statement and quickstart.

Important local dev note:

If you have PostgreSQL running locally on the host, Docker's default mapping of port `5432` may conflict with your local server.
Two options to avoid that:

1. Stop the local Postgres instance (via services.msc or `Stop-Service`) so the container can bind to 5432.
2. Or remap the container port to a different host port (example: `5433:5432`) in `docker-compose.yml` and update `backend/.env` to point to `localhost:5433`.

This will prevent `psql` from accidentally connecting to a different Postgres server and causing authentication errors.

How to run the backend and tests (Windows PowerShell)

# 1. Clone
git clone https://github.com/lucasvieira94/nola-god-level.git
cd nola-god-level


docker compose down -v 2>/dev/null || true
docker compose build --no-cache data-generator
docker compose up -d postgres
docker compose run --rm data-generator
docker compose --profile tools up -d pgadmin
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

Environment file (.env)
-----------------------

This project reads configuration from `backend/.env` (loaded by python-dotenv in `database.py`).
The repository intentionally does not include `backend/.env` (it is ignored by git). To make it easy
for contributors, a template file is provided at `backend/.env.example`.

Quick steps to prepare your `.env`:

1. Copy the example to a real `.env` file:

```powershell
cd .\backend
Copy-Item .env.example .env
```

2. Edit `backend/.env` and set the proper `DATABASE_URL` for your environment. Examples are in `.env.example`:
- If you run the Postgres service with `docker-compose` from the repository and map the port `5433:5432`,
	use: `postgresql+asyncpg://challenge:challenge_2024@localhost:5433/challenge_db`.
- If you run the backend inside Docker (as a compose service), use the internal hostname `postgres` and port
	`5432` in the URL: `postgresql+asyncpg://challenge:challenge_2024@postgres:5432/challenge_db`.

3. After `.env` is present and correct, start the API (from `backend`):

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Notes:
- Keep `backend/.env` out of version control. Only commit `backend/.env.example`.
- If you prefer not to create a file, you can set the env var in PowerShell temporarily:

```powershell
$env:DATABASE_URL = 'postgresql+asyncpg://challenge:challenge_2024@localhost:5433/challenge_db'
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
