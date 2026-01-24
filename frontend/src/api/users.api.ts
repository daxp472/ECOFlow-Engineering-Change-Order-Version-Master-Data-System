/**
 * Users API Service
 */
import { api } from './client';

export interface User {
    id: string;
    email: string;
    name: string;
    roles: string[];
    status: 'ACTIVE' | 'DISABLED' | 'PENDING';
    createdAt: string;
    updatedAt: string;
}

export interface UserListResponse {
    users: User[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const usersApi = {
    getAll: async (params?: { page?: number; limit?: number; search?: string; role?: string }) => {
        const response = await api.get<any>('/users', { params });
        return response.data.data;
    },
    updateStatus: async (id: string, status: 'ACTIVE' | 'DISABLED' | 'PENDING') => {
        const response = await api.patch<any>(`/users/${id}/status`, { status });
        return response.data.data.user;
    },
    update: async (id: string, data: Partial<User> & { role?: string }) => {
        const response = await api.put<any>(`/users/${id}`, data);
        return response.data.data.user;
    }
};
