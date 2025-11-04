# God level Coder Challenge

Este repositório contém as instruções para a execução do projeto:

**Nota importante para desenvolvedores locais:**

Se você tiver o PostgreSQL em execução localmente no host, o mapeamento padrão da porta `5432` do Docker pode entrar em conflito com o seu servidor local.

Duas opções para evitar isso:

  

1. Pare a instância local do Postgres (via services.msc ou `Stop-Service`) para que o contêiner possa se conectar à porta 5432.

2. Ou remapeie a porta do contêiner para uma porta diferente do host (exemplo: `5433:5432`) em `docker-compose.yml` e atualize `backend/.env` para apontar para `localhost:5433`.

  

Isso impedirá que o `psql` se conecte acidentalmente a um servidor Postgres diferente e cause erros de autenticação.  

## Criação do container no Docker

A criação do container e a geração de dados usados seguiu a documentação fornecida no projeto:

    git clone https://github.com/lucasvieira94/nola-god-level.git
    
    cd nola-god-level  
    
    docker compose down -v 2>/dev/null || true
    
    docker compose build --no-cache data-generator
    
    docker compose up -d postgres
    
    docker compose run --rm data-generator
    
    docker compose --profile tools up -d pgadmin

## Execução do Backend:

1. Crie e ative um ambiente virtual Python (PowerShell):

  

```powershell

cd .\backend

python -m venv venv

.\venv\Scripts\Activate.ps1

```

  

2. Instale as dependências de tempo de execução e teste:

  

```powershell

# instala as dependências de tempo de execução e teste listadas em backend/requirements.txt

python -m pip install --upgrade pip

python -m pip install -r requirements.txt

```


Este projeto lê a configuração de `backend/.env` (carregado por python-dotenv em `database.py`).

  

O repositório intencionalmente não inclui `backend/.env` (ele é ignorado pelo git). Para facilitar para os colaboradores, um arquivo de modelo é fornecido em `backend/.env.example`.

  

Passos rápidos para preparar seu `.env`:

  

 - Copie o exemplo para um arquivo `.env` real:

  

```powershell

cd .\backend

Copy-Item .env.example .env

```

  

 - Edite `backend/.env` e defina o `DATABASE_URL` correto para o seu
   ambiente. Os exemplos estão em `.env.example`:
 - Se você executar o serviço Postgres com `docker-compose` a partir do repositório e mapear a porta `5433:5432`,

use: `postgresql+asyncpg://challenge:challenge_2024@localhost:5433/challenge_db`.

  

- Se você executar o backend dentro do Docker (como um serviço compose), use o hostname interno `postgres` e a porta

`5432` na URL: `postgresql+asyncpg://challenge:challenge_2024@postgres:5432/challenge_db`.

  

3. Após o arquivo `.env` estar presente e correto, inicie a API (a partir do `backend`):

  

```powershell

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

```

  

Observações:

- Mantenha o arquivo `backend/.env` fora do controle de versão. Inclua apenas o arquivo `backend/.env.example` no commit.

  

- Se preferir não criar um arquivo, você pode definir a variável de ambiente temporariamente no PowerShell:

  

```powershell

$env:DATABASE_URL = 'postgresql+asyncpg://challenge:challenge_2024@localhost:5433/challenge_db'

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

```

  

Observações:

- O arquivo `requirements.txt` inclui as dependências de teste (pytest, httpx), portanto, as execuções locais e em CI se comportam da mesma maneira.

  

- Se o seu PostgreSQL local estiver em execução e você preferir não pará-lo, use a abordagem de remapeamento para a porta 5433 descrita acima.

## Execução do Frontend
1. Certifique-se de que o backend esteja funcionando e esteja ativo, com isso acesse a pasta frontend:
  ```powershell

cd .\frontend

```
2. Após isso, instale o npm (Node Package Manager) e inicie o servidor local:


```powershell

# Executa a instalação do npm:

npm install   

# Inicia o servidor local:

npm run dev   

```
3. Para verificar o resultado final, acesse `http://localhost:5173/`

