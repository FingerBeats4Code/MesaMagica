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
    name: string;
    description: string;
    price: number;
    categoryId: string;
    categoryName: string;
    isAvailable: boolean;
    imageUrl: string;
}

export interface CartItem {
    id: string;
    sessionId: string;
    itemId: string;
    quantity: number;
    addedAt: string;
    menuItem: MenuItemResponse;
}

export interface Category {
    categoryId: string;
    name: string;
    description: string;
    isActive: boolean;
}

export interface OrderResponse {
    orderId: string;
    sessionId: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    items: OrderItemResponse[];
}

export interface OrderItemResponse {
    orderItemId: string;
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

export const startSession = async (qrCodeUrl: string, tenantSlug: string, apiKey: string, tableId: string): Promise<SessionResponse> => {
  try {
    const response = await api.post('/api/Sessions/start', { qrCodeUrl, tableId }, {
      headers: {
        'X-Tenant-Slug': tenantSlug,
        'X-Tenant-Key': apiKey,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error starting session:', error);
    throw error;
  }
};

export const getMenuItems = async (tenantSlug: string, apiKey: string, token: string, categoryId?: string): Promise<MenuItemResponse[]> => {
  try {
    const url = categoryId ? `/api/menu/items?categoryId=${categoryId}` : '/api/menu/items';
    const response = await api.get(url, {
      headers: {
        'X-Tenant-Slug': tenantSlug,
        'X-Tenant-Key': apiKey,
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching menu items:', error);
    throw error;
  }
};

export const getCategories = async (tenantSlug: string, apiKey: string, jwt: string): Promise<Category[]> => {
  try {
    const response = await api.get(`/api/Categories`, {
      headers: {
        'X-Tenant-Slug': tenantSlug,
        'X-Tenant-Key': apiKey,
        'Authorization': `Bearer ${jwt}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const getCart = async (tenantSlug: string, apiKey: string, token: string, sessionId: string): Promise<CartItem[]> => {
    try {
        const response = await api.get(`/api/cart?sessionId=${sessionId}`, {
            headers: {
                'X-Tenant-Slug': tenantSlug,
                'X-Tenant-Key': apiKey,
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching cart:', error);
        throw error;
    }
};

export const addToCartBackend = async (tenantSlug: string, apiKey: string, token: string, sessionId: string, itemId: string, quantity: number): Promise<void> => {
    try {
        await api.post('/api/cart/add', { sessionId, itemId, quantity }, {
            headers: {
                'X-Tenant-Slug': tenantSlug,
                'X-Tenant-Key': apiKey,
                'Authorization': `Bearer ${token}`,
            },
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        throw error;
    }
};

export const removeFromCartBackend = async (tenantSlug: string, apiKey: string, token: string, sessionId: string, itemId: string): Promise<void> => {
    try {
        await api.post('/api/cart/remove', { sessionId, itemId }, {
            headers: {
                'X-Tenant-Slug': tenantSlug,
                'X-Tenant-Key': apiKey,
                'Authorization': `Bearer ${token}`,
            },
        });
    } catch (error) {
        console.error('Error removing from cart:', error);
        throw error;
    }
};

export const submitOrder = async (jwt: string, tenantSlug: string, apiKey: string, sessionId: string, orderData: { tableId: string; tenantSlug: string }): Promise<OrderResponse> => {
    try {
        const response = await api.post('/api/cart/submit', { sessionId, tableId: orderData.tableId, tenantSlug: orderData.tenantSlug }, {
            headers: {
                'X-Tenant-Slug': tenantSlug,
                'X-Tenant-Key': apiKey,
                'Authorization': `Bearer ${jwt}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error submitting order:', error);
        throw error;
    }
};
/*
export const submitOrder = async (jwt: string, tenantSlug: string, apiKey: string, sessionId: string, orderData: any) => {
  try {
    const response = await api.post(`/api/Orders`, { ...orderData, sessionId }, {
      headers: {
        'X-Tenant-Slug': tenantSlug,
        'X-Tenant-Api-Key': apiKey,
        'Authorization': `Bearer ${jwt}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting order:', error);
    throw error;
  }
};
*/
export default api;