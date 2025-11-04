from sqlalchemy import (
    Table, MetaData, Column, String, DateTime, Integer, Numeric, ForeignKey
)

metadata = MetaData()

# NOTA: O esquema SQL fornecido pelo projeto usa nomes de tabelas
# diferentes (ex.: `sales`, `product_sales`) e chaves primárias do tipo inteiro.
# Aqui mapeamos um subconjunto mínimo dessas tabelas para que as
# consultas analíticas em `crud.py` possam fazer JOINs com os objetos
# reais do banco criados por `database-schema.sql` / scripts de inicialização do Docker.

stores = Table('stores', metadata,
    Column('id', Integer, primary_key=True),
    Column('name', String),
    Column('city', String),
    Column('state', String),
    Column('district', String),
    Column('address_street', String),
    Column('address_number', Integer),
    Column('zipcode', String),
    Column('latitude', String),
    Column('longitude', String),
    Column('is_active', String)
)

channels = Table('channels', metadata,
    Column('id', Integer, primary_key=True),
    Column('name', String)
)

products = Table('products', metadata,
    Column('id', Integer, primary_key=True),
    Column('name', String),
    Column('category', String)
)

# sales substitui a tabela anteriormente chamada `orders` em rascunhos antigos
sales = Table('sales', metadata,
    Column('id', Integer, primary_key=True),
    Column('store_id', Integer, ForeignKey('stores.id')),
    Column('channel_id', Integer, ForeignKey('channels.id')),
    Column('customer_id', Integer),
    Column('created_at', DateTime),
    Column('value_paid', Numeric),
    Column('total_amount', Numeric),
    Column('sale_status_desc', String)
)

# product_sales contém as linhas individuais de produtos para cada venda
product_sales = Table('product_sales', metadata,
    Column('id', Integer, primary_key=True),
    Column('sale_id', Integer, ForeignKey('sales.id')),
    Column('product_id', Integer, ForeignKey('products.id')),
    Column('quantity', Integer),
    Column('base_price', Numeric),
    Column('total_price', Numeric)
)