import os
import asyncio
import asyncpg


async def main():
    # Allow overriding the connection URL via environment for flexibility in dev
    db_url = os.getenv(
        "TEST_DB_URL",
        "postgresql://challenge:challenge_2024@127.0.0.1:5433/challenge_db",
    )
    conn = await asyncpg.connect(db_url)
    val = await conn.fetchval("SELECT 1;")
    print("OK", val)
    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())