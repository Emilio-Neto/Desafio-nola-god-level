"""backend/app/api.py

Arquivo limpo do router da API. A versão legada foi movida para
`Markdowns (Excluir depois)/api_legacy_reference.md` para referência.

Contém endpoints de metadata, analytics e health.
"""

import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

# Importa todas as nossas ferramentas dos outros arquivos
from . import schemas, crud
from .database import get_db
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text, select
from .models import stores

# -------------------------------------------------------------
# Comentários (PT-BR):
# - `router` agrupa os endpoints sob o prefixo `/api/v1`.
# - METRICS_DATA / DIMENSIONS_DATA: listas que descrevem as métricas e
#   dimensões disponíveis — usadas pelo frontend para popular selects.
# - Endpoint `/analytics`: recebe `AnalyticsQueryRequest`, delega a
#   `crud.get_analytics_data` e devolve `AnalyticsQueryResponse` com dados
#   e metadados (incluindo tempo de execução).
# - Endpoints de metadata (`/metadata/metrics`, `/metadata/dimensions`,
#   `/metadata/states`, `/metadata/cities`) servem listas auxiliares para a UI.
# - Endpoint `/health`: simples checagem para confirmar conexão com o DB.
# -------------------------------------------------------------

# =============================================================================
# CONFIGURAÇÃO DO ROUTER
# =============================================================================

# Usamos um APIRouter para organizar nossos endpoints de forma modular.
router = APIRouter(
    prefix="/api/v1",
    tags=["Analytics"],
)

# =============================================================================
# ENDPOINTS DE METADADOS (Já implementados)
# =============================================================================

METRICS_DATA = [
    {"id": "total_revenue", "name": "Total Revenue", "description": "Soma do valor dos items vendidos."},
    {"id": "order_count", "name": "Order Count", "description": "Número de pedidos (distintos)."},
    {"id": "avg_order_value", "name": "Average Order Value", "description": "Ticket médio por pedido."},
]

DIMENSIONS_DATA = [
    {"id": "product_name", "name": "Product Name", "description": "Nome do produto."},
    {"id": "product_category", "name": "Product Category", "description": "Categoria do produto."},
    {"id": "channel_name", "name": "Channel Name", "description": "Nome do canal (iFood, presencial, etc)."},
    {"id": "store_name", "name": "Store Name", "description": "Nome da loja."},
    {"id": "order_day_of_week", "name": "Order Day of Week", "description": "Dia da semana da venda."},
    {"id": "order_hour", "name": "Order Hour", "description": "Hora do pedido."},
    {"id": "region", "name": "Region", "description": "Região/bairro da venda."},
]

@router.get(
    "/metadata/metrics",
    response_model=List[Dict[str, Any]],
    summary="Obter Métricas Disponíveis"
)
async def get_available_metrics():
    """
    Retorna a lista de todas as métricas de negócio disponíveis para consulta.
    O frontend usa esta lista para popular os menus de seleção de métricas.
    """
    return METRICS_DATA

@router.get(
    "/metadata/dimensions",
    response_model=List[Dict[str, Any]],
    summary="Obter Dimensões Disponíveis"
)
async def get_available_dimensions():
    """
    Retorna a lista de todas as dimensões disponíveis para agrupamento e filtragem.
    O frontend usa esta lista para popular os menus de seleção de dimensões.
    """
    return DIMENSIONS_DATA

# =============================================================================
# ENDPOINT PRINCIPAL DE ANALYTICS (A Nova Implementação)
# =============================================================================

@router.post(
    "/analytics",
    response_model=schemas.AnalyticsQueryResponse,
    summary="Executar Consulta Analítica"
)
async def execute_analytics_query(
    query_request: schemas.AnalyticsQueryRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Este é o endpoint principal da API. Ele recebe uma requisição JSON
    descrevendo as métricas, dimensões e filtros desejados, e retorna
    os dados analíticos correspondentes.
    """
    # Mede o tempo de início para calcular a duração da execução
    start_time = time.time()

    # 1. Chama a função do construtor de queries de crud.py
    # A execução da query no banco de dados acontece aqui de forma assíncrona.
    data = await crud.get_analytics_data(query_request=query_request, db=db)

    # Mede o tempo de fim e calcula a duração em milissegundos
    end_time = time.time()
    execution_time_ms = (end_time - start_time) * 1000

    # 2. Retorna os resultados no formato JSON esperado
    # O FastAPI garante que este dicionário corresponda ao `AnalyticsQueryResponse`.
    return {
        "data": data,
        "metadata": {
            "query": query_request,
            "execution_time_ms": round(execution_time_ms, 2)
        }
    }


@router.get("/health", summary="Health check da API e do banco")
async def health(db=Depends(get_db)):
    """
    Health check simples: tenta executar `SELECT 1` no banco.
    Retorna 200 quando OK e 503 em caso de falha de conexão.
    """
    try:
        # executa uma query leve usando a sessão fornecida pela dependência
        result = await db.execute(text("SELECT 1"))
        # mapeia para garantir que conseguimos ler o resultado
        _ = result.scalar()
        return {"status": "ok", "db": "connected"}
    except SQLAlchemyError as exc:
        # transforma em HTTP 503 para healthchecks
        raise HTTPException(status_code=503, detail=f"db_unavailable: {exc}")


@router.get('/metadata/states', summary='Obter lista de estados (stores.state)')
async def get_states(db: AsyncSession = Depends(get_db)):
    """Retorna a lista de estados únicos das lojas (stores.state)."""
    try:
        q = select(stores.c.state).distinct().order_by(stores.c.state)
        result = await db.execute(q)
        rows = [r[0] for r in result.fetchall() if r[0] is not None]
        return rows
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get('/metadata/cities', summary='Obter lista de cidades (stores.city)')
async def get_cities(state: str = None, db: AsyncSession = Depends(get_db)):
    """Retorna a lista de cidades únicas. Se 'state' for informado, filtra por esse estado."""
    try:
        if state:
            q = select(stores.c.city).where(stores.c.state == state).distinct().order_by(stores.c.city)
        else:
            q = select(stores.c.city).distinct().order_by(stores.c.city)
        result = await db.execute(q)
        rows = [r[0] for r in result.fetchall() if r[0] is not None]
        return rows
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail=str(exc))