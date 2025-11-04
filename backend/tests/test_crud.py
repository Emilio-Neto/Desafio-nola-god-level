import asyncio
from types import SimpleNamespace

from app import crud


class DummyResult:
    def mappings(self):
        return self

    def all(self):
        return []


class DummySession:
    def __init__(self):
        self.last_q = None

    async def execute(self, query):
        # store the query so the test can inspect its SQL/text form
        self.last_q = query
        return DummyResult()


def test_get_analytics_builds_query_and_returns_empty():
    """Verifica que a query contém as labels solicitadas e que o retorno é lista vazia.

    Essa é uma verificação leve: não precisa de banco real. O AsyncSession é
    stubado para capturar a query e retornar um resultado vazio.
    """
    # monta uma requisição simples compatível com o expected schema
    query_request = SimpleNamespace(
        metrics=["total_revenue"],
        dimensions=["product_category"],
        filters=[],
    )

    session = DummySession()

    result = asyncio.run(crud.get_analytics_data(query_request, session))

    # função deve retornar lista vazia (pois DummyResult retorna [])
    assert result == []

    # inspeção básica da query para garantir que as colunas solicitadas estão presentes
    assert session.last_q is not None, "A query não foi executada pelo stub de sessão"
    q_text = str(session.last_q)
    assert "total_revenue" in q_text.lower(), "total_revenue não encontrado na query construída"
    assert "product_category" in q_text.lower(), "product_category não encontrado na query construída"
