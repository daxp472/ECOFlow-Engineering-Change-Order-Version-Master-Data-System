import { api } from './client';
export const operationsApi = {
    getActiveProducts: async () => {
        const response = await api.get<any>('/operations/products');
        return response.data.data.products;
    },
    getActiveBOMs: async () => {
        const response = await api.get<any>('/operations/boms');
        return response.data.data.boms;
    },
    getActiveMatrix: async () => {
        const response = await api.get('/operations/active-matrix');
        return response.data.data;
    }
};
