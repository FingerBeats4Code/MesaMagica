import axios from 'axios';

// API Interfaces from Swagger
export interface StartSessionRequest {
    qrCodeUrl: string | null;
}

export interface SessionResponse {
    sessionId: string | null;
    jwt: string | null;
}

export interface MenuItemResponse {
    itemId: string;
    name: string | null;
    description: string | null;
    price: number;
    categoryId: string;
    categoryName: string | null;
    isAvailable: boolean;
    imageUrl: string | null;
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

export const startSession = async (qrCodeUrl: string, tenantSlug: string, apiKey: string, tableId: string): Promise<SessionResponse> => {
    const response = await api.post('/api/Sessions/start', { qrCodeUrl, tableId }, {
        headers: { 'X-Tenant-Slug': tenantSlug, 'X-Tenant-Key': apiKey },
    });
    return response.data;
};

export const getMenuItems = async (tenantSlug: string, apiKey: string, token: string): Promise<MenuItemResponse[]> => {
    const response = await api.get('/api/menu/items', {
        headers: { 'X-Tenant-Slug': tenantSlug, 'X-Tenant-Key': apiKey, 'Authorization': `Bearer ${token}` },
    });
    return response.data;
};

// Function to fetch categories
export const getCategories = async (tenantSlug: string, apiKey: string, jwt: string): Promise<Category[]> => {
    const response = await api.get(`/api/Categories`, {
        headers: {
            'X-Tenant-Slug': tenantSlug,
            'X-Tenant-Key': apiKey,
            'Authorization': `Bearer ${jwt}`,
        },
    });
    debugger;
    return response.data;
};

// Interface for Category
export interface Category {
    categoryId: string;
    name: string;
    description: string;
    isActive: boolean;
}

export default api;