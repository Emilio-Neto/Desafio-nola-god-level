# backend/app/models.py

from sqlalchemy import (
    Table, MetaData, Column, String, DateTime, Integer, Numeric, ForeignKey
)

# MetaData é um catálogo que armazena a definição das nossas tabelas.
metadata = MetaData()

# NOTE: The project's provided SQL schema uses different table names
# (e.g. `sales`, `product_sales`) and integer `id` primary keys.
# We map a minimal subset of those tables here so the analytics
# queries in `crud.py` can join the actual DB objects created by
# `database-schema.sql` / Docker init scripts.

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

# sales replaces the previously-named `orders` table in older drafts
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

# product_sales contains the individual product rows for each sale
product_sales = Table('product_sales', metadata,
    Column('id', Integer, primary_key=True),
    Column('sale_id', Integer, ForeignKey('sales.id')),
    Column('product_id', Integer, ForeignKey('products.id')),
    Column('quantity', Integer),
    Column('base_price', Numeric),
    Column('total_price', Numeric)
)