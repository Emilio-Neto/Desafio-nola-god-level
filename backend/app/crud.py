# backend/app/crud.py

from sqlalchemy import select, func
from sqlalchemy.sql.sqltypes import Date, DateTime
from datetime import datetime, date, time
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

# Importa os schemas Pydantic e as definições de tabela
from . import schemas
from .models import stores, channels, products, sales, product_sales

# -------------------------------------------------------------
# Comentários (PT-BR):
# - Este arquivo implementa o construtor dinâmico de queries analíticas.
# - METRIC_MAP: mapeia ids de métricas (strings) para expressões SQL (funções agregadas).
# - DIMENSION_MAP: mapeia ids de dimensões para colunas/expressões SQL usadas em GROUP BY.
# - FILTER_MAP: mapeia campos vindos da API para colunas SQL que podem ser filtradas.
# - get_analytics_data: função principal que monta a query, aplica filtros
#   (com coerção de tipos para datas quando necessário) e executa a consulta
#   retornando uma lista de dicionários adequada para serialização JSON.
# - Helpers internos (ex: _to_datetime) garantem que valores 'date-like' sejam
#   convertidos para `datetime` antes de serem passados ao driver do banco,
#   evitando erros de operador entre TIMESTAMP e VARCHAR.
# -------------------------------------------------------------

# =============================================================================
# CAMADA SEMÂNTICA: Mapeamento de IDs da API para Lógica SQL
# =============================================================================

# 1. MAPEAMENTO DE MÉTRICAS
METRIC_MAP = {
    "total_revenue": func.sum(
        product_sales.c.base_price * product_sales.c.quantity
    ).label("total_revenue"),
    "order_count": func.count(func.distinct(sales.c.id)).label("order_count"),
    # avg_order_value: soma dos itens / número de pedidos distintos (protege divisão por zero com NULLIF)
    "avg_order_value": (
        func.sum(product_sales.c.base_price * product_sales.c.quantity) /
        func.nullif(func.count(func.distinct(sales.c.id)), 0)
    ).label("avg_order_value"),
}

# 2. MAPEAMENTO DE DIMENSÕES (para agrupamento e seleção)
DIMENSION_MAP = {
    "product_name": products.c.name.label("product_name"),
    "product_category": products.c.category.label("product_category"),
    "channel_name": channels.c.name.label("channel_name"),
    "store_name": stores.c.name.label("store_name"),
    # sales.created_at maps to the original order_time
    "order_day_of_week": func.to_char(sales.c.created_at, 'Day').label("order_day_of_week"),
    "order_hour": func.extract('hour', sales.c.created_at).label("order_hour"),
    # schema does not include a 'region' column on sales; map to store city if needed
    # Prefer a 'district' column (bairro) if present; then 'city'; otherwise
    # fall back to store name so the 'region' dimension always resolves to a
    # valid column. Using 'district' gives a more granular location (bairro).
    "region": (
        stores.c.district.label("region") if hasattr(stores.c, 'district')
        else (stores.c.city.label("region") if hasattr(stores.c, 'city') else stores.c.name.label("region"))
    ),
}

# 3. MAPEAMENTO DE CAMPOS FILTRÁVEIS (para a cláusula WHERE)
# CORREÇÃO: Separado do DIMENSION_MAP para permitir filtros em campos não agrupados (como data)
FILTER_MAP = {
    **DIMENSION_MAP,  # Inclui todas as dimensões
    # Campos de IDs e datas que podem ser úteis em filtros diretos
    "order_time": sales.c.created_at,
    "order_id": sales.c.id,
    "store_id": stores.c.id,
    "store_state": stores.c.state,
    "store_city": stores.c.city,
    "channel_id": channels.c.id,
    "product_id": products.c.id,
}


# =============================================================================
# FUNÇÃO PRINCIPAL DO CONSTRUTOR DE QUERIES (UNIFICADA)
# =============================================================================

async def get_analytics_data(
    query_request: schemas.AnalyticsQueryRequest, db: AsyncSession
) -> List[Dict[str, Any]]:
    """
    Constrói e executa uma query analítica dinâmica com base na requisição.

    Essa implementação é a fusão das duas versões previamente presentes no
    arquivo. Suporta seleção dinâmica de métricas/dimensões, filtros
    (incluindo 'between'), joins necessários e agrupamento quando houver
    dimensões.
    """
    # Seleciona as colunas e métricas a serem retornadas
    selected_metrics = [METRIC_MAP[metric] for metric in getattr(query_request, "metrics", []) if metric in METRIC_MAP]
    # Only include dimensions that map to a valid SQL column (not None)
    selected_dimensions = [DIMENSION_MAP[dim] for dim in getattr(query_request, "dimensions", []) if dim in DIMENSION_MAP and DIMENSION_MAP[dim] is not None]

    # Se nada for solicitado, retorna lista vazia (JSON-friendly)
    if not selected_metrics and not selected_dimensions:
        return []

    # Define a base da query com todos os JOINs necessários
    # Build query joining sales -> product_sales -> products and sales -> channels/stores
    base_query = (
        select(*selected_metrics, *selected_dimensions)
        .select_from(sales)
        .join(product_sales, sales.c.id == product_sales.c.sale_id)
        .join(products, product_sales.c.product_id == products.c.id)
        .join(channels, sales.c.channel_id == channels.c.id)
        .join(stores, sales.c.store_id == stores.c.id)
    )

    # Aplica os filtros dinamicamente e de forma segura
    for f in getattr(query_request, "filters", []) or []:
        if not hasattr(f, "field"):
            continue
        # resolve the column from the filter map
        if f.field in FILTER_MAP and FILTER_MAP[f.field] is not None:
            column = FILTER_MAP[f.field]
            # Helper: try to coerce string date values to proper datetimes when
            # column is a Date/DateTime type. This avoids sending VARCHAR binds
            # to a timestamp column (which causes the "operator does not exist"
            # error seen in asyncpg).
            def _to_datetime(val, end_of_day=False):
                # If val is already a date/datetime, normalize to datetime
                if isinstance(val, datetime):
                    return val
                if isinstance(val, date) and not isinstance(val, datetime):
                    # date -> datetime at start or end of day
                    if end_of_day:
                        return datetime.combine(val, time.max)
                    return datetime.combine(val, time.min)
                if isinstance(val, str):
                    # Try ISO formats: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
                    try:
                        # datetime.fromisoformat handles both date and datetime
                        parsed = datetime.fromisoformat(val)
                        # If a date-only string was given, fromisoformat returns date
                        if isinstance(parsed, date) and not isinstance(parsed, datetime):
                            return datetime.combine(parsed, time.max if end_of_day else time.min)
                        return parsed
                    except Exception:
                        # Fallback: try parsing YYYY-MM-DD by splitting
                        try:
                            parts = val.split('T')[0].split(' ')[0]
                            y, m, d = [int(x) for x in parts.split('-')]
                            dt = date(y, m, d)
                            return datetime.combine(dt, time.max if end_of_day else time.min)
                        except Exception:
                            return val
                return val

            # For date-like comparisons, coerce string inputs to datetime
            is_date_column = hasattr(column, 'type') and isinstance(column.type, (Date, DateTime))

            if f.operator == 'eq':
                val = _to_datetime(f.value) if is_date_column else f.value
                base_query = base_query.where(column == val)
            elif f.operator == 'neq':
                val = _to_datetime(f.value) if is_date_column else f.value
                base_query = base_query.where(column != val)
            elif f.operator == 'in':
                vals = [_to_datetime(v) for v in f.value] if is_date_column else f.value
                base_query = base_query.where(column.in_(vals))
            elif f.operator == 'notin':
                vals = [_to_datetime(v) for v in f.value] if is_date_column else f.value
                base_query = base_query.where(~column.in_(vals))
            elif f.operator == 'gt':
                val = _to_datetime(f.value) if is_date_column else f.value
                base_query = base_query.where(column > val)
            elif f.operator == 'lt':
                val = _to_datetime(f.value, end_of_day=True) if is_date_column else f.value
                base_query = base_query.where(column < val)
            elif f.operator == 'gte':
                val = _to_datetime(f.value) if is_date_column else f.value
                base_query = base_query.where(column >= val)
            elif f.operator == 'lte':
                val = _to_datetime(f.value, end_of_day=True) if is_date_column else f.value
                base_query = base_query.where(column <= val)
            elif f.operator == 'between' and isinstance(f.value, (list, tuple)) and len(f.value) == 2:
                start, end = f.value[0], f.value[1]
                if is_date_column:
                    start_dt = _to_datetime(start, end_of_day=False)
                    end_dt = _to_datetime(end, end_of_day=True)
                    base_query = base_query.where(column.between(start_dt, end_dt))
                else:
                    base_query = base_query.where(column.between(start, end))

    # Adiciona o GROUP BY se houver dimensões selecionadas
    if selected_dimensions:
        base_query = base_query.group_by(*selected_dimensions)

    # Executa a query no banco de dados
    result = await db.execute(base_query)

    # Converte o resultado em uma lista de dicionários (formato JSON-friendly)
    data = [dict(row) for row in result.mappings().all()]
    return data