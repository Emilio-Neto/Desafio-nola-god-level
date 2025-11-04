import { useState, useEffect } from 'react';
import { fetchMetrics, fetchDimensions } from '../api';

export const useMetadata = () => {
  const [metrics, setMetrics] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadMetadata = async () => {
      setLoading(true);
      try {
        const [metricsData, dimensionsData] = await Promise.all([
          fetchMetrics(),
          fetchDimensions(),
        ]);
        if (!mounted) return;
        setMetrics(metricsData);
        setDimensions(dimensionsData);
      } catch (error) {
        console.error('Erro ao carregar metadados', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadMetadata();

    return () => {
      mounted = false;
    };
  }, []); // Roda apenas uma vez

  return { metrics, dimensions, loading };
};