// frontend/src/api/index.js

import axios from 'axios';

// 1. Configura a URL base da nossa API (que está rodando em http://127.0.0.1:8000)
// O Vite/React (rodando na porta 5173) fará a chamada para o FastAPI (rodando na porta 8000)
const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1', // Nosso prefixo de API do backend
});

/**
 * Busca os dados de analytics da nossa API
 * @param {object} queryConfig - O objeto com metrics, dimensions, filters
 */
export const fetchAnalyticsData = async (queryConfig) => {
  try {
    const response = await apiClient.post('/analytics', queryConfig);
    return response.data; // Retorna o objeto { data: [...], metadata: {...} }
  } catch (error) {
    console.error('Erro ao buscar dados da API:', error);
    throw error; // Repassa o erro para quem chamou
  }
};

// --- ADICIONE ESTAS NOVAS FUNÇÕES ---

/**
 * Busca as métricas disponíveis
 */
export const fetchMetrics = async () => {
  try {
    const response = await apiClient.get('/metadata/metrics');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    throw error;
  }
};

/**
 * Busca as dimensões disponíveis
 */
export const fetchDimensions = async () => {
  try {
    const response = await apiClient.get('/metadata/dimensions');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar dimensões:', error);
    throw error;
  }
};

/**
 * Busca os estados únicos das lojas
 */
export const fetchStates = async () => {
  try {
    const response = await apiClient.get('/metadata/states');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar estados:', error);
    throw error;
  }
};

/**
 * Busca as cidades (opcionalmente filtrando por estado)
 */
export const fetchCities = async (state) => {
  try {
    const params = state ? { params: { state } } : {};
    const response = await apiClient.get('/metadata/cities', params);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar cidades:', error);
    throw error;
  }
};