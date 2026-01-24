import { api } from './client';

export interface Product {
    id: string;
    name: string;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    currentVersionId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ProductVersion {
    id: string;
    productId: string;
    version: string;
    salePrice: number;
    costPrice: number;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    createdAt: string;
    updatedAt: string;
}

export const productsApi = {
    getAll: async () => {
        const response = await api.get<any>('/products');
        return response.data.data.products;
    },
    getById: async (id: string) => {
        const response = await api.get<any>(`/products/${id}`);
        return response.data.data.product;
    },
    create: async (data: Partial<Product>) => {
        const response = await api.post<any>('/products', data);
        return response.data.data.product;
    },
    update: async (id: string, data: Partial<Product>) => {
        const response = await api.put<any>(`/products/${id}`, data);
        return response.data.data.product;
    },
    archive: async (id: string) => {
        await api.patch(`/products/${id}/archive`);
    },
    createVersion: async (productId: string, data: Partial<ProductVersion>) => {
        const response = await api.post<any>(`/products/${productId}/versions`, data);
        return response.data.data.version;
    },
    getVersionHistory: async (productId: string) => {
        const response = await api.get<any>(`/reports/products/${productId}/version-history`);
        return response.data.data;
    }
};
