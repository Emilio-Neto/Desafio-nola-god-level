/**
 * Transforma os dados da API em um formato de 'option' para um gráfico de barras ECharts.
 * @param {Array} apiData - O array 'data' da nossa API
 * @param {object} queryConfig - A consulta que gerou esses dados
 * @returns {object} - O objeto 'option' para o ECharts
 */
export const transformDataToBarChart = (apiData = [], queryConfig = {}, metadata = {}) => {
  // Support queryConfig.dimensions/metrics being arrays or single values.
  // Suporta queryConfig.dimensions/metrics sendo arrays ou valores únicos.
  const dims = Array.isArray(queryConfig.dimensions) ? queryConfig.dimensions : (queryConfig.dimensions ? [queryConfig.dimensions] : []);
  const mets = Array.isArray(queryConfig.metrics) ? queryConfig.metrics : (queryConfig.metrics ? [queryConfig.metrics] : []);

  // Seleciona a primeira dimensão/métrica como principal para gráficos de barras simples. Se múltiplas métricas
  // forem fornecidas, renderiza uma série por métrica.
  const primaryDim = dims[0];
  if (!primaryDim || mets.length === 0) {
    return {
      tooltip: { trigger: 'item' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: [],
      grid: { left: 80, right: 20, top: 20, bottom: 80 },
    };
  }

  // Constrói as categorias (eixo x) e os dados das séries
  const categories = apiData.map(item => {
    const v = item[primaryDim];
    // normalize null/undefined
    if (v === null || v === undefined) return '—';
    return String(v);
  });

  // Auxiliar: faz parse de números vindos da API que podem ser strings usando separadores locais
  // de milhares/decimais (ex.: '1.234.567' ou '1.234,56'). Retorna NaN quando o parse falha.
  const parseNumber = (raw) => {
    if (raw === null || raw === undefined) return NaN;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      let s = raw.trim();
      // se tanto '.' quanto ',' estiverem presentes, assume '.' para milhares e ',' para decimal
      if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
        s = s.replace(/\./g, '').replace(/,/g, '.');
      } else if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
        // '1234,56' -> '1234.56'
        s = s.replace(/,/g, '.');
      } else if ((s.match(/\./g) || []).length > 1) {
        // múltiplos pontos como '1.234.567' -> remover pontos
        s = s.replace(/\./g, '');
      }
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    }
  // fallback para objetos (ex.: Decimal serializado pelo backend)
    try {
      const s = raw.toString();
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    } catch (e) {
      return NaN;
    }
  };

  // constrói mapas de rótulos a partir do metadata (se fornecido)
  const metricLabelMap = (metadata.metrics || []).reduce((acc, m) => { acc[m.id] = m.name; return acc; }, {});
  const dimensionLabelMap = (metadata.dimensions || []).reduce((acc, d) => { acc[d.id] = d.name; return acc; }, {});

  // Rótulos locais em PT-BR (usados se metadata estiver ausente ou não contiver um nome amigável)
  const LOCAL_METRIC_LABELS = {
    total_revenue: 'Receita Total',
    order_count: 'Total de Pedidos',
    avg_order_value: 'Ticket Médio',
  };

  const LOCAL_DIMENSION_LABELS = {
    channel_name: 'Canal',
    region: 'Região',
    product_name: 'Produto',
    product_category: 'Categoria do Produto',
    store_name: 'Loja',
    order_day_of_week: 'Dia da Semana',
    order_hour: 'Hora do Pedido',
  };

  // Preferir rótulos PT-BR locais primeiro, depois metadata do backend, depois o id cru
  const series = mets.map(metricId => ({
    name: LOCAL_METRIC_LABELS[metricId] || metricLabelMap[metricId] || metricId,
    type: 'bar',
    data: apiData.map(item => {
      const raw = item[metricId];
      const parsed = parseNumber(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    }),
    // largura padrão agradável para barras e espaçamento
    barWidth: '40%',
    // cor de destaque para as barras para combinar com a identidade visual
    itemStyle: {
      color: '#fd6263',
    },
  }));

  // Formatador do rótulo do eixo Y (separador de milhares)
  const yAxisFormatter = (val) => {
    try {
      if (Math.abs(val) >= 1000) return Math.round(val).toLocaleString();
      return val;
    } catch (e) {
      return val;
    }
  };

  // calcula o valor máximo entre as séries para dar uma folga ao gráfico e garantir visibilidade das barras
  const allValues = series.reduce((acc, s) => acc.concat(s.data), []);
  const maxVal = allValues.length ? Math.max(...allValues) : 0;
  const suggestedMax = maxVal > 0 ? Math.ceil(maxVal * 1.1) : undefined;

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      // formata os números do tooltip
      formatter: function (params) {
        // params é um array quando o disparador é por eixo
        if (Array.isArray(params)) {
          const name = params[0]?.axisValueLabel ?? '';
          const lines = params.map(p => `${p.seriesName}: ${typeof p.data === 'number' ? p.data.toLocaleString() : p.data}`);
          return `${name}<br/>${lines.join('<br/>')}`;
        }
        return params;
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        rotate: 25,
        interval: 0,
        formatter: (val) => {
          // truncar rótulos longos
          if (typeof val === 'string' && val.length > 20) return val.slice(0, 20) + '…';
          return val;
        },
      },
      // Preferir rótulo PT-BR local, depois metadata, depois id cru
      name: LOCAL_DIMENSION_LABELS[primaryDim] || dimensionLabelMap[primaryDim] || primaryDim,
      nameLocation: 'middle',
      nameGap: 40,
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: suggestedMax,
      axisLabel: { formatter: yAxisFormatter },
    },
    series,
    grid: { left: 80, right: 20, top: 20, bottom: 80 }, // more left padding for y ticks
  };
};