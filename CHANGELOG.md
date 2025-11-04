# CHANGELOG

Todas as mudanças importantes neste repositório estão listadas aqui em ordem cronológica (resumo).

## 2025-11-03 - Alterações principais

- Backend
  - Corrigido bug de tipos ao aplicar filtros de data: conversão defensiva de strings para Date/DateTime antes de bind no banco (evita ProgrammingError do asyncpg quando comparando timestamp com varchar). Arquivo: `backend/app/crud.py`.
  - Adicionado normalizador em Pydantic schemas para pré-processar filtros de data. Arquivo: `backend/app/schemas.py`.
  - Adicionados endpoints de metadata: `/metadata/states` e `/metadata/cities`. Arquivo: `backend/app/api.py`.

- Frontend
  - Estabilizado hook `useAnalyticsQuery` para evitar loops, integrado dateRange global e implementado retry/backoff. Arquivo: `frontend/src/hooks/useAnalyticsQuery.js`.
  - Reescrito transformador de dados para ECharts com parsing robusto e suporte a múltiplas métricas; cor padrão das barras alterada para `#fd6263`. Arquivo: `frontend/src/utils/chartHelpers.js`.
  - Implementado modal de widget com filtros por estado/cidade; execução segura do chart render com try/catch. Arquivo: `frontend/src/components/Widget.jsx`.
  - Persistência de widgets em localStorage; passagem de `id` a widgets. Arquivo: `frontend/src/components/DashboardGrid.jsx`.
  - Layout e estilo: título da página, favicon, logo no topo do sidebar, Sider fixo ao rolar, tradução do menu para PT-BR, ajuste de cores e estilos. Arquivos: `frontend/src/App.jsx`, `frontend/src/App.css`, `frontend/index.html`.
  - MVP frontend para Gerenciador de Arquivos (upload em localStorage) e Configurações (localStorage). Arquivos: `frontend/src/components/Files.jsx`, `frontend/src/components/Settings.jsx`.

## Observações

- Algumas melhorias (persistência backend para uploads/configs, testes automatizados, otimizações de UX) foram sugeridas e listadas no `Markdowns (Excluir depois)/historico.md`.

---

Este CHANGELOG foi gerado automaticamente em 2025-11-03 durante a sessão de desenvolvimento.
