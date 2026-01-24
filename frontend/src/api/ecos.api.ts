import { api } from './client';

export interface ECO {
    id: string;
    title: string;
    type: 'PRODUCT' | 'BOM';
    productId: string;
    bomId?: string;
    createdBy: string;
    status: 'DRAFT' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'APPLIED';
    currentStage: string;
    versionUpdate: boolean;
    draftData: any;
    createdAt: string;
    updatedAt: string;
}

export const ecosApi = {
    getAll: async () => {
        try {
            const response = await api.get<any>('/ecos');
            return response.data.data?.ecos || [];
        } catch (error) {
            console.error('Failed to fetch ECOs:', error);
            return [];
        }
    },
    getById: async (id: string) => {
        try {
            const response = await api.get<any>(`/ecos/${id}`);
            return response.data.data?.eco || null;
        } catch (error) {
            console.error('Failed to fetch ECO:', error);
            return null;
        }
    },
    create: async (data: Partial<ECO>) => {
        const response = await api.post<any>('/ecos', data);
        return response.data.data?.eco;
    },
    update: async (id: string, data: Partial<ECO>) => {
        const response = await api.put<any>(`/ecos/${id}`, data);
        return response.data.data?.eco;
    },
    submit: async (id: string) => {
        const response = await api.post<any>(`/ecos/${id}/submit`);
        return response.data.data?.eco;
    },
    review: async (id: string, status: 'APPROVED' | 'REJECTED', comments: string) => {
        const response = await api.post<any>(`/ecos/${id}/review`, { status, comments });
        return response.data.data;
    },
    apply: async (id: string) => {
        const response = await api.post<any>(`/ecos/${id}/apply`);
        return response.data.data;
    }
};
