import axios from 'axios';

// API Interfaces
export interface StartSessionRequest {
  tableId: string;
  qrCodeUrl: string;
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

// 🔐 Inject JWT into every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🟢 Start session
export const startSession = async (payload: StartSessionRequest): Promise<SessionResponse> => {
  try {
    const response = await api.post('/api/Sessions/start', payload);
    return response.data;
  } catch (error) {
    console.error('Error starting session:', error);
    throw error;
  }
};

// 🟢 Get menu items
export const getMenuItems = async (categoryId?: string): Promise<MenuItemResponse[]> => {
  try {
    const url = categoryId ? `/api/menu/items?categoryId=${categoryId}` : '/api/menu/items';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching menu items:', error);
    throw error;
  }
};

// 🟢 Get categories
export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await api.get('/api/Categories');
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

// 🟢 Get cart
export const getCart = async (sessionId: string): Promise<CartItem[]> => {
  try {
    const response = await api.get(`/api/cart?sessionId=${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching cart:', error);
    throw error;
  }
};

// 🟢 Add to cart
export const addToCartBackend = async (
  sessionId: string,
  itemId: string,
  quantity: number
): Promise<void> => {
  try {
    await api.post('/api/cart/add', { sessionId, itemId, quantity });
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
};

// 🟢 Remove from cart (decrease quantity by 1)
export const removeFromCartBackend = async (
  sessionId: string,
  itemId: string
): Promise<void> => {
  try {
    // Use the same endpoint as addToCartBackend with quantity -1
    await api.post('/api/cart/add', { sessionId, itemId, quantity: -1 });
  } catch (error) {
    console.error('Error decreasing cart item quantity:', error);
    throw error;
  }
};

// 🟢 Submit order
export const submitOrder = async (
  sessionId: string,
  orderData: { tableId: string }
): Promise<OrderResponse> => {
  try {
    const response = await api.post('/api/cart/submit', {
      sessionId,
      tableId: orderData.tableId,
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting order:', error);
    throw error;
  }
};

export default api;