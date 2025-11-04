import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAnalyticsData } from '../api';
import { useAppStore } from '../store';

/**
 * Hook para buscar dados do endpoint /analytics.
 * Ele suporta:
 * - filtro de data global vindo do store (dateRange)
 * - retries automáticos em caso de erro de rede
 * - refetch manual
 *
 * @param {object} queryConfig - { metrics: [], dimensions: [], filters: [] }
 */
export const useAnalyticsQuery = (queryConfig) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // filtro de data global vindo do store de nível de aplicação
  const dateRange = useAppStore((state) => state.dateRange);

  // gatilho simples para refetch
  const refetchTick = useRef(0);

  // Constrói uma chave estável para o queryConfig usar nas dependências (checagem profunda simples)
  const queryKey = React.useMemo(() => {
    try {
      return JSON.stringify(queryConfig || {});
    } catch {
      return String(queryConfig);
    }
  }, [queryConfig]);

  const doFetch = useCallback(
    async (opts = { aborted: false }) => {
      // compõe a query final incluindo o dateRange do store
      if (!queryConfig || !queryConfig.metrics || !queryConfig.dimensions) {
        setData(null);
        setLoading(false);
        return;
      }

      const finalQuery = {
        ...queryConfig,
        filters: Array.isArray(queryConfig.filters) ? [...queryConfig.filters] : [],
      };

      if (Array.isArray(dateRange) && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
        finalQuery.filters.push({ field: 'order_time', operator: 'between', value: dateRange });
      }

      setLoading(true);
      setError(null);

      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (opts.aborted) return;
        try {
          const resp = await fetchAnalyticsData(finalQuery);
          if (opts.aborted) return;
          // NOTA: logs de depuração foram removidos após verificação para manter o console limpo.
          setData(resp.data);
          setLoading(false);
          setError(null);
          return;
        } catch (err) {
          const isNetworkError = !err.response;
          if (attempt === maxAttempts || !isNetworkError) {
            if (opts.aborted) return;
            setError(err);
            setLoading(false);
            return;
          }
          // recuo (backoff)
          await new Promise((r) => setTimeout(r, 200 * attempt));
        }
      }
    },
  [queryKey, JSON.stringify(dateRange || [])]
  );

  // efeito: executa quando query, dateRange ou refetch mudam
  useEffect(() => {
    const controller = { aborted: false };
    doFetch(controller);
    return () => {
      controller.aborted = true;
    };
  }, [doFetch, refetchTick.current]);

  const refetch = () => {
    refetchTick.current += 1;
    // forçar um novo fetch imediatamente
    doFetch({ aborted: false });
  };

  return { data, loading, error, refetch };
};