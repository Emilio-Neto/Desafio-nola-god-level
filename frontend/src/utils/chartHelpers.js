// frontend/src/utils/chartHelpers.js

/**
 * Transforma os dados da API em um formato de 'option' para um gráfico de barras ECharts.
 * @param {Array} apiData - O array 'data' da nossa API
 * @param {object} queryConfig - A consulta que gerou esses dados
 * @returns {object} - O objeto 'option' para o ECharts
 */
export const transformDataToBarChart = (apiData = [], queryConfig = {}, metadata = {}) => {
  // Support queryConfig.dimensions/metrics being arrays or single values.
  const dims = Array.isArray(queryConfig.dimensions) ? queryConfig.dimensions : (queryConfig.dimensions ? [queryConfig.dimensions] : []);
  const mets = Array.isArray(queryConfig.metrics) ? queryConfig.metrics : (queryConfig.metrics ? [queryConfig.metrics] : []);

  // Pick the first dimension/metric as primary for simple bar charts. If multiple metrics are provided,
  // render one series per metric.
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

  // Build categories (x axis) and series data
  const categories = apiData.map(item => {
    const v = item[primaryDim];
    // normalize null/undefined
    if (v === null || v === undefined) return '—';
    return String(v);
  });

  // Helper: parse numbers coming from API which may be strings using localized
  // thousand/decimal separators (e.g. '1.234.567' or '1.234,56'). Returns NaN
  // when parsing fails.
  const parseNumber = (raw) => {
    if (raw === null || raw === undefined) return NaN;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      let s = raw.trim();
      // if both '.' and ',' present, assume '.' thousands and ',' decimal
      if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
        s = s.replace(/\./g, '').replace(/,/g, '.');
      } else if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
        // '1234,56' -> '1234.56'
        s = s.replace(/,/g, '.');
      } else if ((s.match(/\./g) || []).length > 1) {
        // multiple dots like '1.234.567' -> remove dots
        s = s.replace(/\./g, '');
      }
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    }
    // fallback for objects (e.g. Decimal from backend stringified)
    try {
      const s = raw.toString();
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    } catch (e) {
      return NaN;
    }
  };

  // build label maps from metadata (if provided)
  const metricLabelMap = (metadata.metrics || []).reduce((acc, m) => { acc[m.id] = m.name; return acc; }, {});
  const dimensionLabelMap = (metadata.dimensions || []).reduce((acc, d) => { acc[d.id] = d.name; return acc; }, {});

  // Local PT-BR fallbacks (used if metadata is missing or doesn't contain a friendly name)
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

  // Prefer local PT-BR labels first, then backend metadata, then raw id
  const series = mets.map(metricId => ({
    name: LOCAL_METRIC_LABELS[metricId] || metricLabelMap[metricId] || metricId,
    type: 'bar',
    data: apiData.map(item => {
      const raw = item[metricId];
      const parsed = parseNumber(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    }),
    // nicer default bar width and gap
    barWidth: '40%',
    // set accent color for bars to match brand
    itemStyle: {
      color: '#fd6263',
    },
  }));

  // Y axis label formatter (thousands separator)
  const yAxisFormatter = (val) => {
    try {
      if (Math.abs(val) >= 1000) return Math.round(val).toLocaleString();
      return val;
    } catch (e) {
      return val;
    }
  };

  // compute max value across series to give the chart some headroom so bars are visible
  const allValues = series.reduce((acc, s) => acc.concat(s.data), []);
  const maxVal = allValues.length ? Math.max(...allValues) : 0;
  const suggestedMax = maxVal > 0 ? Math.ceil(maxVal * 1.1) : undefined;

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      // format tooltip numbers
      formatter: function (params) {
        // params is an array when axis trigger
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
          // truncate long labels
          if (typeof val === 'string' && val.length > 20) return val.slice(0, 20) + '…';
          return val;
        },
      },
      // Prefer PT-BR local label, then metadata, then raw id
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