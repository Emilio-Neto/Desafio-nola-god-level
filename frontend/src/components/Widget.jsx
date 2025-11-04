// frontend/src/components/Widget.jsx

/*
  Widget.jsx

  Comentários (PT-BR):
  - Componente reutilizável que exibe um widget do dashboard com título,
    gráfico (ECharts) e um modal de configuração.
  - Props:
    - id: identificador único do widget
    - title: título exibido no topo
    - queryConfig: objeto que descreve métricas/dimensões/filters do widget
    - onUpdate: callback chamado ao salvar configurações (id, novoTitulo, novaQuery)
    - metadata: { metrics, dimensions } — lista de opções usadas nos selects
  - Comportamentos principais:
    - Busca dados via `useAnalyticsQuery(queryConfig)` e exibe loaders/erros
    - Modal de configuração permite escolher métricas/dimensões e filtros
    - Ao alterar estado/cidade, atualiza `tempConfig.filters` adequadamente
    - Força resize do ECharts quando os dados mudam para evitar tamanhos 0x0
*/
import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Spin, Alert, Button, Modal, Select, Input } from 'antd';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { transformDataToBarChart } from '../utils/chartHelpers';
import { fetchStates, fetchCities } from '../api';
import { SettingOutlined } from '@ant-design/icons';

/**
 * Configurable Widget component.
 * Props:
 *  - id (string)
 *  - title (string)
 *  - queryConfig (object)
 *  - onUpdate(id, newTitle, newQueryConfig) (function)
 *  - metadata? { metrics, dimensions } (optional)
 */
const { Option } = Select;

const Widget = ({ id, title, queryConfig, onUpdate, metadata = {} }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [tempConfig, setTempConfig] = useState(queryConfig);
  const [availableStates, setAvailableStates] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);

  const { data, loading, error, refetch } = useAnalyticsQuery(queryConfig);
  const chartRef = useRef(null);

  // ensure echarts resize after mount or when data updates (fixes 0x0 DOM warnings)
  useEffect(() => {
    // Comentário: aqui tentamos redimensionar a instância do ECharts
    // após montagens/atualizações para garantir que o gráfico ocupe
    // o espaço correto no layout (corrige problemas de render 0x0).
    const tryResize = () => {
      try {
        const inst = chartRef.current && chartRef.current.getEchartsInstance && chartRef.current.getEchartsInstance();
        if (inst && typeof inst.resize === 'function') inst.resize();
      } catch (e) {
        // ignore
      }
    };
    // small delay to allow layout to settle
    const t = setTimeout(tryResize, 150);
    // also try on next animation frame
    requestAnimationFrame(tryResize);
    return () => clearTimeout(t);
  }, [data]);

  const showModal = () => {
    setTempTitle(title);
    setTempConfig(queryConfig);
    // derive selected state/city from existing filters if present
    const fs = (queryConfig?.filters || []).find(f => f.field === 'store_state');
    const fc = (queryConfig?.filters || []).find(f => f.field === 'store_city');
    const stateVal = fs ? fs.value : null;
    const cityVal = fc ? fc.value : null;
    setSelectedState(stateVal);
    setSelectedCity(cityVal);

  // Carrega lista de estados e (se aplicável) cidades para popular os selects
    (async () => {
      try {
        const s = await fetchStates();
        setAvailableStates(s || []);
        if (stateVal) {
          const c = await fetchCities(stateVal);
          setAvailableCities(c || []);
        } else {
          setAvailableCities([]);
        }
      } catch (e) {
        // ignore fetch errors for now
      }
    })();
    setIsModalVisible(true);
  };

  const handleSave = () => {
    // Salva alterações: chama o callback `onUpdate` fornecido pelo pai
    // passando id, novo título e nova configuração da query.
    if (typeof onUpdate === 'function') onUpdate(id, tempTitle, tempConfig);
    setIsModalVisible(false);
  };

  const handleCancel = () => setIsModalVisible(false);

  const renderChart = () => {
    if (loading) return <div className="widget-loading"><Spin /></div>;
    if (error) {
      return (
        <div style={{ padding: 12 }}>
          <Alert message={`Erro ao carregar ${title}`} description={error.message} type="error" />
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <Button onClick={() => refetch && refetch()} type="primary">Tentar novamente</Button>
          </div>
        </div>
      );
    }
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return <Alert message="Sem dados para exibir" type="info" />;
    }

  // Observação: a transformação dos dados para opções do ECharts pode
  // lançar exceção se houver incompatibilidade entre métrica/dimensão.
  // Por isso o try/catch abaixo exibe uma mensagem amigável ao usuário.
    let chartOptions;
    try {
      chartOptions = transformDataToBarChart(data, queryConfig, metadata);
    } catch (err) {
      // show helpful error and allow retry
      return (
        <div style={{ padding: 12 }}>
          <Alert
            message={`Erro ao gerar gráfico: ${err?.message || 'Erro interno'}`}
            description={
              <div>
                <div>Houve um problema ao processar os dados para a métrica selecionada.</div>
                <div style={{ marginTop: 8 }}><small>Verifique se a métrica é compatível com a dimensão selecionada.</small></div>
              </div>
            }
            type="error"
          />
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <Button onClick={() => refetch && refetch()} type="primary">Tentar novamente</Button>
          </div>
        </div>
      );
    }
    const heightPx = (queryConfig && queryConfig.height) ? queryConfig.height : 320;
    return (
      <ReactECharts
        ref={chartRef}
        option={chartOptions}
        style={{ height: `${heightPx}px`, width: '100%' }}
        notMerge={true}
        lazyUpdate={true}
      />
    );
  };

  return (
    <div className="widget-container">
      <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {/* Prevent grid drag handlers from intercepting the click */}
        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={showModal}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          title="Configurar widget"
        />
      </div>

      <div className="widget-body">{renderChart()}</div>

      <Modal title="Configurar Widget" open={isModalVisible} onOk={handleSave} onCancel={handleCancel} okText="Salvar" cancelText="Cancelar">
        <strong>Título do Widget:</strong>
        <Input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} style={{ marginBottom: 16 }} />

        <strong>Métricas:</strong>
        <Select mode="multiple" style={{ width: '100%', marginBottom: 16 }} placeholder="Selecione as métricas" value={tempConfig?.metrics || []} onChange={(value) => setTempConfig(prev => ({ ...(prev || {}), metrics: value }))}>
          {metadata.metrics?.map(m => (
            <Option key={m.id} value={m.id}>{m.name}</Option>
          ))}
        </Select>

        <strong>Dimensões:</strong>
        <Select mode="multiple" style={{ width: '100%' }} placeholder="Selecione as dimensões" value={tempConfig?.dimensions || []} onChange={(value) => setTempConfig(prev => ({ ...(prev || {}), dimensions: value }))}>
          {metadata.dimensions?.map(d => (
            <Option key={d.id} value={d.id}>{d.name}</Option>
          ))}
        </Select>
        { (tempConfig?.dimensions || []).includes('region') && (
          <>
            <hr style={{ margin: '12px 0' }} />
            <strong>Filtrar por Estado:</strong>
            <Select allowClear style={{ width: '100%', marginBottom: 12 }} placeholder="Selecione o estado" value={selectedState} onChange={async (val) => {
              setSelectedState(val);
              setSelectedCity(null);
              // update tempConfig.filters: set or replace store_state
              setTempConfig(prev => {
                const prevFilters = Array.isArray(prev?.filters) ? [...prev.filters] : [];
                const other = prevFilters.filter(f => f.field !== 'store_state' && f.field !== 'store_city');
                if (val) other.push({ field: 'store_state', operator: 'eq', value: val });
                return { ...(prev || {}), filters: other };
              });
              try {
                const cities = await fetchCities(val);
                setAvailableCities(cities || []);
              } catch (e) {
                setAvailableCities([]);
              }
            }}>
              {availableStates.map(s => <Option key={s} value={s}>{s}</Option>)}
            </Select>

            <strong>Filtrar por Cidade:</strong>
            <Select allowClear style={{ width: '100%' }} placeholder="Selecione a cidade" value={selectedCity} onChange={(val) => {
              setSelectedCity(val);
              setTempConfig(prev => {
                const prevFilters = Array.isArray(prev?.filters) ? [...prev.filters] : [];
                const other = prevFilters.filter(f => f.field !== 'store_city');
                if (val) other.push({ field: 'store_city', operator: 'eq', value: val });
                return { ...(prev || {}), filters: other };
              });
            }}>
              {availableCities.map(c => <Option key={c} value={c}>{c}</Option>)}
            </Select>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Widget;