import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Existing API Interfaces (unchanged)
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

export interface LoginRequest {
  username: string;
  password: string;
  tenantSlug: string;
}

export interface LoginResponse {
  token: string;
  role: string; // 'admin' or 'staff'
}

export interface ActiveOrderResponse {
  orderId: string;
  sessionId: string;
  tableId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItemResponse[];
  paymentStatus: string;
}

export interface UpdateOrderRequest {
  orderId: string;
  status: string;
}

export interface CreateTableRequest {
  tableNumber: string;
  seatCapacity: number;
}

export interface CreateTableResponse {
  tableId: string;
  qrCodeUrl: string;
}

export interface Staff {
  id: string;
  username: string;
  role: string;
}

export interface AddStaffRequest {
  username: string;
  password: string;
  role: string;
}

export interface EditCartRequest {
  sessionId: string;
  itemId: string;
  quantity: number;
}

export interface EditOrderRequest {
  orderId: string;
  items: { itemId: string; quantity: number }[];
}

export interface PaymentResponse {
  orderId: string;
  paymentStatus: string;
  amountPaid: number;
  transactionId: string;
}

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management utilities
const TokenManager = {
  getCustomerToken: () => localStorage.getItem('jwt'),
  getAdminToken: () => localStorage.getItem('adminToken'),
  
  clearCustomerAuth: () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('sessions');
  },
  
  clearAdminAuth: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminTenant');
  },
  
  isAdminRoute: (url?: string) => {
    return url?.includes('/admin') || url?.includes('/auth/login');
  }
};

// Request ID generator for tracking
const generateRequestId = () => 
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 🔐 Enhanced Request Interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const timestamp = new Date().toISOString();
    const isAdminRoute = TokenManager.isAdminRoute(config.url);
    
    // Add request tracking
    config.headers['X-Request-ID'] = generateRequestId();
    
    // Inject appropriate token
    if (isAdminRoute) {
      const adminToken = TokenManager.getAdminToken();
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
        console.log(`[${timestamp}] 🔑 Admin Request: ${config.method?.toUpperCase()} ${config.url}`);
      }
    } else {
      const customerToken = TokenManager.getCustomerToken();
      if (customerToken) {
        config.headers.Authorization = `Bearer ${customerToken}`;
        console.log(`[${timestamp}] 🔑 Customer Request: ${config.method?.toUpperCase()} ${config.url}`);
      }
    }
    
    // Add metadata for performance tracking
    (config as any).metadata = { startTime: Date.now() };
    
    return config;
  },
  (error: AxiosError) => {
    console.error(`[${new Date().toISOString()}] ❌ Request interceptor error:`, error.message);
    return Promise.reject(error);
  }
);

// 🔐 Enhanced Response Interceptor
api.interceptors.response.use(
  (response) => {
    // Log response time for monitoring
    const config = response.config as any;
    if (config.metadata?.startTime) {
      const duration = Date.now() - config.metadata.startTime;
      console.log(`[${new Date().toISOString()}] ✅ Response: ${config.url} (${duration}ms)`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const timestamp = new Date().toISOString();
    const originalRequest = error.config as any;
    
    // Handle network errors
    if (!error.response) {
      console.error(`[${timestamp}] 🌐 Network error: ${error.message}`);
      return Promise.reject({
        message: 'Network error. Please check your internet connection.',
        error,
      });
    }

    const { status } = error.response;
    const isAdminRoute = TokenManager.isAdminRoute(originalRequest?.url);

    // Handle 401 Unauthorized
    if (status === 401) {
      console.error(`[${timestamp}] ❌ 401 Unauthorized - Token expired or invalid`);
      
      if (isAdminRoute) {
        console.log(`[${timestamp}] 🚪 Clearing admin session and redirecting to login`);
        TokenManager.clearAdminAuth();
        
        // Prevent redirect loop
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      } else {
        console.log(`[${timestamp}] 🔄 Clearing customer session and reloading`);
        TokenManager.clearCustomerAuth();
        
        // Prevent reload loop
        if (!originalRequest._isRetry) {
          window.location.reload();
        }
      }
      
      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (status === 403) {
      console.error(`[${timestamp}] 🚫 403 Forbidden: Insufficient permissions`);
      return Promise.reject({
        message: 'You do not have permission to access this resource.',
        status: 403,
        error,
      });
    }

    // Handle 404 Not Found
    if (status === 404) {
      console.error(`[${timestamp}] 🔍 404 Not Found: ${originalRequest?.url}`);
      return Promise.reject({
        message: 'The requested resource was not found.',
        status: 404,
        error,
      });
    }

    // Handle 429 Too Many Requests
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.error(`[${timestamp}] ⏱️ 429 Too Many Requests - Retry after: ${retryAfter}s`);
      return Promise.reject({
        message: `Too many requests. Please try again ${retryAfter ? `after ${retryAfter} seconds` : 'later'}.`,
        status: 429,
        retryAfter,
        error,
      });
    }

    // Handle 500+ Server Errors
    if (status >= 500) {
      console.error(`[${timestamp}] 🔥 ${status} Server Error:`, error.response.data);
      return Promise.reject({
        message: 'Server error. Please try again later.',
        status,
        error,
      });
    }

    // Handle 400 Bad Request
    if (status === 400) {
      console.error(`[${timestamp}] ⚠️ 400 Bad Request:`, error.response.data);
      const errorData = error.response.data as { message?: string };
      return Promise.reject({
        message: errorData?.message || 'Invalid request.',
        status: 400,
        error,
      });
    }

    // Generic error handling
    console.error(`[${timestamp}] ❌ Error ${status}:`, error.response.data);
    return Promise.reject(error);
  }
);

// 🟢 Start session
export const startSession = async (payload: StartSessionRequest): Promise<SessionResponse> => {
  try {
    console.log(`[${new Date().toISOString()}] 🚀 Starting session for tableId: ${payload.tableId}`);
    const response = await api.post('/api/Sessions/start', payload);
    console.log(`[${new Date().toISOString()}] ✅ Session created:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error starting session:`, error.response?.data || error.message);
    throw error;
  }
};

// 🟢 Get menu items
export const getMenuItems = async (categoryId?: string): Promise<MenuItemResponse[]> => {
  try {
    const url = categoryId ? `api/menu/categories/${categoryId}/items` : '/api/menu/items';
    console.log(`[${new Date().toISOString()}] 📋 Fetching menu items from: ${url}`);
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching menu items:`, error.response?.data || error.message);
    throw error;
  }
};

// 🟢 Get categories
export const getCategories = async (): Promise<Category[]> => {
  try {
    console.log(`[${new Date().toISOString()}] 📂 Fetching categories`);
    const response = await api.get('/api/Categories');
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching categories:`, error.response?.data || error.message);
    throw error;
  }
};

// 🟢 Get cart
export const getCart = async (sessionId: string): Promise<CartItem[]> => {
  try {
    console.log(`[${new Date().toISOString()}] 🛒 Fetching cart for sessionId: ${sessionId}`);
    const response = await api.get(`/api/cart?sessionId=${sessionId}`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching cart:`, error.response?.data || error.message);
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
    console.log(`[${new Date().toISOString()}] ➕ Adding to cart - SessionId: ${sessionId}, ItemId: ${itemId}, Qty: ${quantity}`);
    await api.post('/api/cart/add', { sessionId, itemId, quantity });
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error adding to cart:`, error.response?.data || error.message);
    throw error;
  }
};

// 🟢 Remove from cart
export const removeFromCartBackend = async (
  sessionId: string,
  itemId: string
): Promise<void> => {
  try {
    console.log(`[${new Date().toISOString()}] ➖ Removing from cart - SessionId: ${sessionId}, ItemId: ${itemId}`);
    await api.post('/api/cart/add', { sessionId, itemId, quantity: -1 });
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error decreasing cart item quantity:`, error.response?.data || error.message);
    throw error;
  }
};

// 🟢 Submit order
export const submitOrder = async (
  sessionId: string,    
  orderData: { tableId: string }
): Promise<OrderResponse> => {
  try {
    console.log(`[${new Date().toISOString()}] 📤 Submitting order - SessionId: ${sessionId}, TableId: ${orderData.tableId}`);
    const response = await api.post('/api/cart/submit', {
      sessionId,
      tableId: orderData.tableId,
    });
    console.log(`[${new Date().toISOString()}] ✅ Order submitted successfully:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error submitting order:`, error.response?.data || error.message);
    throw error;
  }
};

// 🔐 Admin: Login
export const login = async (payload: LoginRequest): Promise<LoginResponse> => {
  try {
    // const response = await api.post('/api/auth/login', payload);
    // return response.data;
    console.log(`[${new Date().toISOString()}] 🔐 Hardcoded login for ${payload.username}`);
    if (payload.username === 'admin' && payload.password === 'password') {
      return {
        token: `admin-token-${payload.tenantSlug}-${Date.now()}`,
        role: 'admin',
      };
    } else if (payload.username === 'staff' && payload.password === 'password') {
      return {
        token: `staff-token-${payload.tenantSlug}-${Date.now()}`,
        role: 'staff',
      };
    }
    throw new Error('Invalid credentials');
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error logging in:`, error);
    throw error;
  }
};

// 🔐 Admin: Get active orders
export const getActiveOrders = async (): Promise<ActiveOrderResponse[]> => {
  try {
    // const response = await api.get('/api/admin/orders/active');
    // return response.data;
    console.log(`[${new Date().toISOString()}] 📋 Hardcoded getActiveOrders`);
    return [
      {
        orderId: 'order-1',
        sessionId: 'session-1',
        tableId: '1',
        status: 'pending',
        totalAmount: 25.99,
        createdAt: new Date().toISOString(),
        items: [
          { orderItemId: 'oi-1', itemId: 'item-1', itemName: 'Pizza Margherita', quantity: 2, price: 12.99 },
        ],
        paymentStatus: 'pending',
      },
      {
        orderId: 'order-2',
        sessionId: 'session-2',
        tableId: '2',
        status: 'prepared',
        totalAmount: 18.50,
        createdAt: new Date().toISOString(),
        items: [
          { orderItemId: 'oi-2', itemId: 'item-2', itemName: 'Pasta', quantity: 1, price: 18.50 },
        ],
        paymentStatus: 'paid',
      },
    ];
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching active orders:`, error);
    throw error;
  }
};

// 🔐 Admin: Update order status
export const updateOrderStatus = async (payload: UpdateOrderRequest): Promise<void> => {
  try {
    // await api.put('/api/admin/order/update', payload);
    console.log(`[${new Date().toISOString()}] 📝 Hardcoded updateOrderStatus for orderId: ${payload.orderId} to ${payload.status}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error updating order status:`, error);
    throw error;
  }
};

// 🔐 Admin: Create table
export const createTable = async (payload: CreateTableRequest): Promise<CreateTableResponse> => {
  try {
    // const response = await api.post('/api/admin/tables/create', payload);
    // return response.data;
    console.log(`[${new Date().toISOString()}] 🪑 Hardcoded createTable for tableNumber: ${payload.tableNumber}`);
    return {
      tableId: `table-${payload.tableNumber}`,
      qrCodeUrl: `http://localhost.pizzapalace:8000/?tableId=${payload.tableNumber}`,
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error creating table:`, error);
    throw error;
  }
};

// 🔐 Admin: Add staff
export const addStaff = async (payload: AddStaffRequest): Promise<Staff> => {
  try {
    // const response = await api.post('/api/admin/staff/add', payload);
    // return response.data;
    console.log(`[${new Date().toISOString()}] 👤 Hardcoded addStaff for ${payload.username}`);
    return {
      id: `staff-${payload.username}-${Date.now()}`,
      username: payload.username,
      role: payload.role,
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error adding staff:`, error);
    throw error;
  }
};

// 🔐 Admin: Get staff
export const getStaff = async (): Promise<Staff[]> => {
  try {
    // const response = await api.get('/api/admin/staff');
    // return response.data;
    console.log(`[${new Date().toISOString()}] 👥 Hardcoded getStaff`);
    return [
      { id: 'staff-1', username: 'admin', role: 'admin' },
      { id: 'staff-2', username: 'staff1', role: 'staff' },
    ];
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching staff:`, error);
    throw error;
  }
};

// 🔐 Admin: Update staff role
export const updateStaffRole = async (id: string, role: string): Promise<void> => {
  try {
    // await api.put('/api/admin/staff/update', { id, role });
    console.log(`[${new Date().toISOString()}] 🔄 Hardcoded updateStaffRole for id: ${id} to ${role}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error updating staff role:`, error);
    throw error;
  }
};

// 🔐 Admin: Edit cart
export const editCart = async (payload: EditCartRequest): Promise<void> => {
  try {
    // await api.put('/api/admin/cart/edit', payload);
    console.log(`[${new Date().toISOString()}] ✏️ Hardcoded editCart for sessionId: ${payload.sessionId}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error editing cart:`, error);
    throw error;
  }
};

// 🔐 Admin: Edit order
export const editOrder = async (payload: EditOrderRequest): Promise<void> => {
  try {
    // await api.put('/api/admin/order/edit', payload);
    console.log(`[${new Date().toISOString()}] ✏️ Hardcoded editOrder for orderId: ${payload.orderId}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error editing order:`, error);
    throw error;
  }
};

// 🔐 Admin: Get payment details
export const getPaymentDetails = async (orderId: string): Promise<PaymentResponse> => {
  try {
    // const response = await api.get(`/api/admin/payment/${orderId}`);
    // return response.data;
    console.log(`[${new Date().toISOString()}] 💳 Hardcoded getPaymentDetails for orderId: ${orderId}`);
    return {
      orderId,
      paymentStatus: 'paid',
      amountPaid: 25.99,
      transactionId: `txn-${orderId}-${Date.now()}`,
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching payment details:`, error);
    throw error;
  }
};

export default api;