import { api } from './client';

export interface ECOStats {
    total: number;
    active: number;
    completed: number;
    avgApprovalTime: number; // in hours
    byStatus: Record<string, number>;
}

export interface AuditLog {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    comments: string;
    createdAt: string;
}

export const reportsApi = {
    getECOStats: async () => {
        const response = await api.get<any>('/reports/eco-stats');
        return response.data.data;
    },
    getAuditLogs: async () => {
        const response = await api.get<any>('/reports/audit-logs');
        return response.data.data?.logs || [];
    },
    getArchivedProducts: async () => {
        const response = await api.get<any>('/reports/archived-products');
        return response.data.data?.products || [];
    },
    getActiveProductMatrix: async () => {
        const response = await api.get<any>('/reports/active-matrix');
        return response.data.data;
    }
};
