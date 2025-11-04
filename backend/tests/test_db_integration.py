import os
import asyncio
import asyncpg


async def _check_db(db_url: str) -> bool:
    conn = await asyncpg.connect(db_url)
    try:
        # Check that key tables exist by counting rows (will raise if table missing)
        await conn.fetchval("SELECT 1 FROM sales LIMIT 1;")
        await conn.fetchval("SELECT 1 FROM product_sales LIMIT 1;")

        # Run a minimal analytics-like aggregation to ensure joins work
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
    """Integration check: connects to DB and ensures schema + sample analytics query execute.

    This test is intended as a safety net in CI / local dev to catch the
    "relation does not exist" error early. It requires a running Postgres
    instance populated with the project's schema/data.
    """
    db_url = os.getenv(
        "TEST_DB_URL",
        # default mirrors backend/.env expected value (host runs postgres mapped to 5433)
        "postgresql://challenge:challenge_2024@127.0.0.1:5433/challenge_db",
    )

    # Run the async check; if any table is missing or the query errors,
    # asyncpg will raise and the test will fail, surface the original error.
    assert asyncio.run(_check_db(db_url)) is True
