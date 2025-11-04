from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import List, Any, Literal, Optional
from datetime import datetime, date, time

# -------------------------------------------------------------
# Comentários (PT-BR):
# - Este arquivo define os modelos Pydantic usados pela API.
# - `_parse_date_value`: função auxiliar para tentar normalizar valores que
#   representam datas/horários para objetos `datetime` (usada pelo validador).
# - `Filter`: modelo que descreve um filtro individual enviado pelo frontend
#   (campo, operador, valor). Contém um `model_validator` que já normaliza
#   valores date-like antes do restante da validação.
# - `AnalyticsQueryRequest`: modelo do corpo da requisição para o endpoint
#   de analytics (métricas, dimensões, filtros e time_grain).
# - `AnalyticsQueryResponse` e `ResponseMetadata`: modelos para a resposta
#   que descrevem a estrutura retornada ao frontend.
# -------------------------------------------------------------


def _parse_date_value(val, *, end_of_day=False):
    """Tenta parsear um valor para um datetime.
    - Se val já for datetime/date, converte adequadamente.
    - Se val for uma string em formato ISO (data ou datetime), faz o parse.
    - Caso contrário retorna o valor inalterado.
    """
    if isinstance(val, datetime):
        return val
    if isinstance(val, date) and not isinstance(val, datetime):
        return datetime.combine(val, time.max if end_of_day else time.min)
    if isinstance(val, str):
        try:
        # Trata formatos 'YYYY-MM-DD' e 'YYYY-MM-DDTHH:MM:SS'
            parsed = datetime.fromisoformat(val)
        # fromisoformat pode retornar date para strings só com data; aqui
        # garantimos que iremos retornar um datetime
            if isinstance(parsed, date) and not isinstance(parsed, datetime):
                return datetime.combine(parsed, time.max if end_of_day else time.min)
            return parsed
        except Exception:
            # Tentativa alternativa para strings como 'YYYY-MM-DD ...'
            try:
                part = val.split('T')[0].split(' ')[0]
                y, m, d = [int(x) for x in part.split('-')]
                dt = date(y, m, d)
                return datetime.combine(dt, time.max if end_of_day else time.min)
            except Exception:
                return val

# ===================================================================
# Modelos para a REQUISIÇÃO (o que o Frontend envia)
# ===================================================================

class Filter(BaseModel):
    """Define a estrutura de um único filtro a ser aplicado na consulta."""
    field: str = Field(..., description="O campo do banco de dados a ser filtrado. Ex: 'channel_name'")
    operator: Literal[
        'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'notin', 'between'
    ] = Field(..., description="O operador de comparação. Ex: 'eq' para igual, 'in' para lista.")
    value: Any = Field(..., description="O valor para o filtro. Pode ser uma string, número, lista, etc.")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"field": "store_id", "operator": "in", "value": ["uuid-store-1"]},
                {"field": "channel_name", "operator": "eq", "value": "iFood"},
                {"field": "order_time", "operator": "between", "value": ["2025-01-01", "2025-01-31"]}
            ]
        }
    )

    @model_validator(mode='before')
    def _normalize_date_filters(cls, values: dict):
        """Normalize date-like filter values into datetimes before validation.

        Heuristic: if the field name contains 'time' or 'date' treat the value as
        date-like and attempt to parse strings into datetimes. For 'between', the
        end value is converted to end-of-day so date ranges are intuitive.
        """
        field = values.get('field')
        op = values.get('operator')
        val = values.get('value')

        if not field or val is None:
            return values

        is_date_like = any(x in field.lower() for x in ('time', 'date'))
        if not is_date_like:
            return values

        # between: expect [start, end]
        if op == 'between' and isinstance(val, (list, tuple)) and len(val) == 2:
            start, end = val[0], val[1]
            values['value'] = [_parse_date_value(start, end_of_day=False), _parse_date_value(end, end_of_day=True)]
            return values

        # in / notin: list of values
        if op in ('in', 'notin') and isinstance(val, (list, tuple)):
            values['value'] = [_parse_date_value(v, end_of_day=False) for v in val]
            return values

        # single-value comparisons: choose end_of_day for lte/lt for intuitive ranges
        if op in ('lt', 'lte'):
            values['value'] = _parse_date_value(val, end_of_day=True)
        else:
            values['value'] = _parse_date_value(val, end_of_day=False)

        return values


class AnalyticsQueryRequest(BaseModel):
    """Define o corpo da requisição para o endpoint principal de analytics."""
    metrics: List[str] = Field(
       ...,
        description="Lista de métricas a serem calculadas.",
        json_schema_extra={"example": ["total_revenue", "order_count"]}
    )
    dimensions: List[str] = Field(
       ...,
        description="Lista de dimensões para agrupar os dados.",
        json_schema_extra={"example": ["product_name", "channel_name"]}
    )
    filters: List[Filter] = Field(
        default=[],
        description="Lista de filtros a serem aplicados na consulta."
    )
    time_grain: Optional[Literal['day', 'week', 'month']] = Field(
        default=None,
        description="Agrupamento de tempo para séries temporais (opcional)."
    )


# ===================================================================
# Modelos para a RESPOSTA (o que o Backend devolve)
# ===================================================================

class ResponseMetadata(BaseModel):
    """Metadados sobre a consulta executada."""
    query: AnalyticsQueryRequest
    execution_time_ms: float


class AnalyticsQueryResponse(BaseModel):
    """Define a estrutura completa da resposta do endpoint de analytics."""
    data: List[Any]
    metadata: ResponseMetadata