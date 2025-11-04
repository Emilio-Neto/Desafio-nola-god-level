from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import router as api_router  
from .database import engine
from sqlalchemy import text
import logging
from contextlib import asynccontextmanager
import asyncio

logger = logging.getLogger("nola")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handler de lifespan que valida a conexão com o banco durante o startup.

    Substitui o uso antigo de `@app.on_event("startup")` que está deprecado.
    """
    max_attempts = 10
    for attempt in range(1, max_attempts + 1):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("Conexão com o banco validada com sucesso.")
            break
        except Exception as exc:
            wait = min(2 * attempt, 10)
            logger.warning(
                "Tentativa %s/%s de conectar ao DB falhou: %s — aguardando %ss antes da próxima tentativa",
                attempt,
                max_attempts,
                exc,
                wait,
            )
            if attempt == max_attempts:
                logger.exception("Falha ao conectar no banco de dados durante startup: %s", exc)
                raise
            await asyncio.sleep(wait)

    # application started
    yield

    # application shutdown (no-op for now, place to clean resources if needed)

# Cria a instância principal da aplicação FastAPI com lifespan
app = FastAPI(
    title="Nola Analytics API",
    description="A API para a plataforma de analytics de restaurantes.",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Permite as origens da lista
    allow_credentials=True,    # Permite cookies (se usarmos no futuro)
    allow_methods=["*"],       # Permite todos os métodos (POST, GET, OPTIONS, etc)
    allow_headers=["*"],       # Permite todos os cabeçalhos
)

# Inclui as rotas definidas no arquivo api.py na aplicação principal
app.include_router(api_router)

# Endpoint raiz para verificar se a API está no ar
@app.get("/")
async def root():
    return {"message": "Bem-vindo à API da Nola Analytics!"}