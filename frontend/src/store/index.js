// frontend/src/store/index.js

import { create } from 'zustand';

/**
 * Store global para gerenciar o estado da aplicação.
 */
export const useAppStore = create((set) => ({
  // Estado inicial para o filtro de data (ex: nulo)
  dateRange: [null, null],
  
  // Ação para atualizar o filtro de data
  setDateRange: (newDateRange) => set({ dateRange: newDateRange }),
}));