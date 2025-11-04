// frontend/src/App.jsx

import React, { useState } from 'react';
import NolaLogo from './assets/Nola Logo.png';
import NolaFavicon from './assets/Nola Favicon.png';
import { DesktopOutlined, BarChartOutlined, SettingOutlined } from '@ant-design/icons';
import { Layout, Menu, theme, DatePicker } from 'antd';
import 'antd/dist/reset.css'; // Importa o CSS base do Ant Design
import './App.css'; // Importa nossos estilos customizados
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import DashboardGrid from './components/DashboardGrid';
import Files from './components/Files';
import Settings from './components/Settings';
import { useAppStore } from './store'; // Importa o store do Zustand

const { Header, Content, Footer, Sider } = Layout;
const { RangePicker } = DatePicker;

// Define os itens do menu da barra lateral
function getItem(label, key, icon, children) {
  return {
    key,
    icon,
    children,
    label,
  };
}

const menuItems = [
  getItem('Painel', '1', <BarChartOutlined />),
  getItem('Arquivos', '2', <DesktopOutlined />),
  getItem('Configurações', '3', <SettingOutlined />),
];

const App = () => {
  const [collapsed, setCollapsed] = useState(false); // Estado para controlar se o Sider está recolhido
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // PEGUE A AÇÃO setDateRange DO STORE
  const setDateRange = useAppStore((state) => state.setDateRange);

  const [selectedKey, setSelectedKey] = useState('1');
  const [activeLogo, setActiveLogo] = useState(() => {
    try {
      return localStorage.getItem('nola_active_logo_v1') || NolaLogo;
    } catch (e) {
      return NolaLogo;
    }
  });

  const handleUseAsLogo = (url) => {
    try {
      setActiveLogo(url);
      localStorage.setItem('nola_active_logo_v1', url);
    } catch (e) {
      // ignore
    }
  };

  // CRIE O HANDLER PARA MUDANÇA DE DATA
  const onDateChange = (dates, dateStrings) => {
    // dateStrings será algo como ["2025-10-01", "2025-10-31"]
    setDateRange(dateStrings);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={220}
        collapsedWidth={80}
      >
        <div className={`logo-placeholder ${collapsed ? 'collapsed' : ''}`} style={{ background: colorBgContainer }}>
          {collapsed ? (
            <img src={NolaFavicon} alt="Nola" className="sidebar-favicon" />
          ) : (
            <img src={activeLogo || NolaLogo} alt="Nola Logo" className="sidebar-logo" />
          )}
        </div>
        <div className="sidebar-menu-wrapper">
          <Menu
            theme="dark"
            selectedKeys={[selectedKey]}
            defaultSelectedKeys={["1"]}
            mode="inline"
            inlineCollapsed={collapsed}
            items={menuItems}
            onClick={({ key }) => setSelectedKey(key)}
          />
        </div>
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 className="header-greeting">Olá, Maria.</h2>

          {/* ADICIONE O RANGEPICKER AQUI */}
          <div>
            <span style={{ marginRight: 8 }}>Filtrar por Data:</span>
            <RangePicker onChange={onDateChange} />
          </div>
        </Header>
        <Content style={{ margin: '16px' }}>
            <div
              style={{
                padding: 24,
                minHeight: '75vh', // Altura mínima para a área de conteúdo
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
              }}
            >
              {selectedKey === '1' && <DashboardGrid />}
              {selectedKey === '2' && <Files onUseAsLogo={handleUseAsLogo} />}
              {selectedKey === '3' && <Settings />}
            </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Nola Analytics ©2025 - God Level Coder Challenge
        </Footer>
      </Layout>
    </Layout>
  );
};

export default App;