import os
import asyncio
import asyncpg


async def _check_db(db_url: str) -> bool:
    conn = await asyncpg.connect(db_url)
    try:
    # Verifica que tabelas chave existem contando linhas (vai levantar erro se tabela faltar)
        await conn.fetchval("SELECT 1 FROM sales LIMIT 1;")
        await conn.fetchval("SELECT 1 FROM product_sales LIMIT 1;")

    # Executa uma agregação mínima parecida com a analítica para garantir que os JOINs funcionem
        q = """
        SELECT
          sum(product_sales.base_price * product_sales.quantity) AS total_revenue,
          count(distinct(sales.id)) AS order_count
        FROM sales
        JOIN product_sales ON sales.id = product_sales.sale_id
        JOIN products ON product_sales.product_id = products.id
        JOIN channels ON sales.channel_id = channels.id
        JOIN stores ON sales.store_id = stores.id
        LIMIT 1
        """
        _ = await conn.fetchrow(q)
        return True
    finally:
        await conn.close()


def test_db_has_schema_and_analytics_query():
    """Verificação de integração: conecta ao DB e garante que o esquema
    e uma consulta analítica de exemplo executem corretamente.

    Este teste serve como uma rede de segurança em CI / dev local para
    capturar cedo o erro "relation does not exist". Requer uma instância
    Postgres em execução e populada com o esquema/dados do projeto.
    """
    db_url = os.getenv(
        "TEST_DB_URL",
        # default mirrors backend/.env expected value (host runs postgres mapped to 5433)
        "postgresql://challenge:challenge_2024@127.0.0.1:5433/challenge_db",
    )

    # Executa a verificação assíncrona; se alguma tabela faltar ou a query falhar,
    # o asyncpg levantará exceção e o teste falhará, expondo o erro original.
    assert asyncio.run(_check_db(db_url)) is True
