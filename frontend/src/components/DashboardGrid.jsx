// frontend/src/components/DashboardGrid.jsx

// DashboardGrid.jsx
// Comentários (PT-BR):
// - Componente que organiza e renderiza uma grade responsiva de widgets
// - Usa `react-grid-layout` para arrastar/redimensionar widgets
// - `initialWidgets`: exemplos iniciais usados quando não há nada no localStorage
// - Persiste a lista de widgets em `localStorage` (STORAGE_KEY)
// - Funções principais:
//   - onLayoutChange: atualiza layout quando o usuário rearranja os widgets
//   - handleUpdateWidget: atualiza título/config do widget específico
//   - efeito de persistência: salva a lista sempre que `widgets` muda
import React, { useState, useMemo, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import Widget from './Widget';
import { useMetadata } from '../hooks/useMetadata';
import { Spin } from 'antd';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Estado inicial dos nossos widgets
const initialWidgets = [
  {
    id: 'w1',
    title: 'Receita Total por Canal',
    layout: { i: 'w1', x: 0, y: 0, w: 6, h: 4 },
    queryConfig: {
      metrics: ['total_revenue'],
      dimensions: ['channel_name'],
      filters: [],
    },
  },
  {
    id: 'w2',
    title: 'Total de Pedidos por Região',
    layout: { i: 'w2', x: 6, y: 0, w: 6, h: 4 },
    queryConfig: {
      metrics: ['order_count'],
      dimensions: ['region'],
      filters: [],
    },
  },
];

const STORAGE_KEY = 'nola_dashboard_widgets_v1';

const DashboardGrid = () => {
  const [widgets, setWidgets] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
      return initialWidgets;
    } catch (e) {
      console.warn('Failed to load widgets from localStorage, using defaults.', e);
      return initialWidgets;
    }
  });
  const { metrics, dimensions, loading: metadataLoading } = useMetadata();

  // Função para atualizar o layout — recebe um array de layout items (lg)
  const onLayoutChange = (newLayoutArray) => {
    setWidgets((prev) =>
      prev.map((w) => {
        const found = newLayoutArray.find((l) => l.i === w.id);
        return {
          ...w,
          layout: found
            ? { i: found.i, x: found.x, y: found.y, w: found.w, h: found.h }
            : w.layout,
        };
      })
    );
  };

  // Função para atualizar a configuração de um widget
  const handleUpdateWidget = (widgetId, newTitle, newQueryConfig) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, title: newTitle, queryConfig: newQueryConfig } : w))
    );
  };

  // Persist widgets to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch (e) {
      console.warn('Failed to save widgets to localStorage', e);
    }
  }, [widgets]);

  if (metadataLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Gera os layouts para o react-grid-layout
  const currentLayouts = {
    lg: widgets.map((w) => w.layout),
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={currentLayouts}
      onLayoutChange={(layout, allLayouts) => onLayoutChange(allLayouts.lg || layout)}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={100}
      isDraggable
      isResizable
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="widget">
          <Widget
            id={widget.id}
            title={widget.title}
            queryConfig={widget.queryConfig}
            onUpdate={handleUpdateWidget}
            metadata={{ metrics, dimensions }}
          />
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};

export default DashboardGrid;