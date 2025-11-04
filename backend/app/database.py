''' PRIMEIRA VERSÃO DO ARQUIVO

# backend/app/database.py

import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# 1. Carregar as variáveis de ambiente do arquivo.env
load_dotenv()

# 2. Obter a URL de conexão do banco de dados a partir das variáveis de ambiente
DATABASE_URL = os.getenv("DATABASE_URL")

# 3. Validar se a URL foi encontrada
if not DATABASE_URL:
    raise ValueError("A variável de ambiente DATABASE_URL não foi definida.")

# 4. Criar o "engine" assíncrono do SQLAlchemy
# O engine é o ponto central de comunicação com o banco de dados.
# O `echo=True` é útil para desenvolvimento, pois imprime no console
# todas as queries SQL que são executadas. Remova ou comente em produção.
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
)

# 5. Criar uma fábrica de sessões assíncronas
# A sessão é a sua "conversa" com o banco de dados. Esta fábrica
# criará novas sessões sob demanda.
# `expire_on_commit=False` é importante para o padrão do FastAPI,
# para que os dados continuem acessíveis após o commit.
AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)

# 6. Criar uma dependência para ser usada nos endpoints da API
# Esta função irá gerar uma sessão para cada requisição que chegar na API
# e garantir que ela seja fechada ao final, liberando a conexão.
async def get_db() -> AsyncSession:
    async with AsyncSessionFactory() as session:
        try:
            yield session
        finally:
            await session.close()

'''

# backend/app/database.py

import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Carrega as variáveis de ambiente do arquivo.env
load_dotenv()

# Obtém a URL de conexão do banco de dados a partir das variáveis de ambiente
_raw_db_url = os.getenv("DATABASE_URL")

# Remove aspas acidentais e espaços em branco para evitar problemas quando
# a variável for colocada entre aspas no .env (ex: DATABASE_URL="...")
if _raw_db_url:
    DATABASE_URL = _raw_db_url.strip().strip('"').strip("'")
else:
    DATABASE_URL = None

# Validação: Garante que a aplicação pare se a URL do DB não for encontrada.
if not DATABASE_URL:
    raise ValueError("A variável de ambiente DATABASE_URL não foi definida no arquivo .env ou está vazia")

# Cria o "engine" assíncrono do SQLAlchemy.
# O engine é o ponto central de comunicação com o banco de dados.
# echo=True é útil para desenvolvimento, pois imprime as queries SQL executadas.
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
)

# Cria uma fábrica de sessões assíncronas.
# `expire_on_commit=False` é importante para o padrão do FastAPI.
AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)

# Dependência do FastAPI: Gera uma sessão por requisição e garante seu fechamento.
async def get_db() -> AsyncSession:
    """
    Cria e fornece uma sessão de banco de dados por requisição,
    garantindo que ela seja fechada no final.
    """
    async with AsyncSessionFactory() as session:
        try:
            yield session
        finally:
            await session.close()