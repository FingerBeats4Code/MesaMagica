// mesa-magica-pwa-app/src/api/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ==================== API INTERFACES ====================

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
  tenantSlug?: string;
}

export interface LoginResponse {
  token: string;
  role: string;
  userId: string;
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
  tableNumber: string;
  qrCodeUrl: string;
  seatCapacity: number;
  isOccupied: boolean;
  createdAt: string;
}

export interface TableResponse {
  tableId: number;
  tableNumber: string;
  qrCodeUrl: string;
  seatCapacity: number;
  isOccupied: boolean;
  createdAt: string;
}

export interface Staff {
  id: string;
  username: string;
  role: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AddStaffRequest {
  username: string;
  password: string;
  role: string;
  email: string;
}

export interface UpdateStaffRequest {
  id: string;
  username: string;
  role: string;
  email: string;
  isActive: boolean;
  password?: string;
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
  paymentDate?: string;
}

export interface CurrentUserResponse {
  username: string;
  role: string;
  userId: string;
  isAuthenticated: boolean;
}

export interface ActiveSessionResponse {
  sessionId: string;
  tableId: string;
  tableNumber: string;
  startedAt: string;
  sessionCount: number;
  activeMinutes: number;
  hasOrders: boolean;
  totalOrders: number;
  unpaidOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  servedOrders: number;
  totalAmount: number;
  cartItemCount: number;
}

export interface SessionDetailsResponse {
  sessionId: string;
  tableId: string;
  tableNumber: string;
  isActive: boolean;
  startedAt: string;
  endedAt?: string;
  sessionCount: number;
  activeMinutes?: number;
  orders: Array<{
    orderId: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    items: Array<{
      orderItemId: string;
      itemId: string;
      itemName: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
  }>;
  totalOrderCount: number;
  totalOrderAmount: number;
  unpaidOrderCount: number;
  unpaidAmount: number;
  cartItems: Array<{
    id: string;
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
    subtotal: number;
    addedAt: string;
  }>;
  cartItemCount: number;
  cartTotal: number;
}

export interface CloseSessionResponse {
  message: string;
  sessionId: string;
  tableNumber: string;
  closedBy: string;
  closedAt: string;
  remainingSessionCount: number;
  tableStillOccupied: boolean;
}

// ==================== AXIOS CONFIGURATION ====================

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
    return url?.includes('/admin') || url?.includes('/auth');
  }
};

// Request ID generator for tracking
const generateRequestId = () => 
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ==================== REQUEST INTERCEPTOR ====================

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

// ==================== RESPONSE INTERCEPTOR ====================

api.interceptors.response.use(
  (response) => {
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
    
    if (!error.response) {
      console.error(`[${timestamp}] 🌐 Network error: ${error.message}`);
      return Promise.reject({
        message: 'Network error. Please check your internet connection.',
        error,
      });
    }

    const { status } = error.response;
    const isAdminRoute = TokenManager.isAdminRoute(originalRequest?.url);

    if (status === 401) {
      console.error(`[${timestamp}] ❌ 401 Unauthorized - Token expired or invalid`);
      
      if (isAdminRoute) {
        console.log(`[${timestamp}] 🚪 Clearing admin session and redirecting to login`);
        TokenManager.clearAdminAuth();
        
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      } else {
        console.log(`[${timestamp}] 🔄 Clearing customer session and reloading`);
        TokenManager.clearCustomerAuth();
        
        if (!originalRequest._isRetry) {
          window.location.reload();
        }
      }
      
      return Promise.reject(error);
    }

    if (status === 403) {
      console.error(`[${timestamp}] 🚫 403 Forbidden: Insufficient permissions`);
      return Promise.reject({
        message: 'You do not have permission to access this resource.',
        status: 403,
        error,
      });
    }

    if (status === 404) {
      console.error(`[${timestamp}] 🔍 404 Not Found: ${originalRequest?.url}`);
      return Promise.reject({
        message: 'The requested resource was not found.',
        status: 404,
        error,
      });
    }

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

    if (status >= 500) {
      console.error(`[${timestamp}] 🔥 ${status} Server Error:`, error.response.data);
      return Promise.reject({
        message: 'Server error. Please try again later.',
        status,
        error,
      });
    }

    if (status === 400) {
      console.error(`[${timestamp}] ⚠️ 400 Bad Request:`, error.response.data);
      const errorData = error.response.data as { message?: string };
   
      //-----------------CHANGE: Detect and handle session-related errors-----------------2025-01-22----------------------
      // Check if error is related to closed/invalid session
      // Keywords: 'Session', 'session', 'inactive' indicate session problems
      // When detected, clear customer auth and reload to reinitialize session
      if (errorData?.message?.includes('Session') || 
          errorData?.message?.includes('session') ||
          errorData?.message?.includes('inactive')) {
        console.log(`[${timestamp}] 🔄 Session error detected - clearing session data`);
        TokenManager.clearCustomerAuth();
        
        // Force page reload to reinitialize session
        // This creates a new session automatically via SessionInitializer
        window.location.reload();
        return Promise.reject(error);
      }
      //-----------------END CHANGE----------------------
      
      return Promise.reject({
        message: errorData?.message || 'Invalid request.',
        status: 400,
        error,
      });
    }

    console.error(`[${timestamp}] ❌ Error ${status}:`, error.response.data);
    return Promise.reject(error);
  }
);
//-----------------CHANGE: Added session validation helper function-----------------2025-01-22----------------------
// ==================== SESSION VALIDATION ====================
/**
 * Validate that the current session is still active on the server
 * Returns true if valid, false if session needs to be reinitialized
 * 
 * Purpose: Prevents operations on closed sessions by checking server-side status
 * Usage: Call before critical operations like cart modifications or order placement
 * 
 * @param sessionId - The session ID to validate
 * @returns Promise<boolean> - true if session is active, false otherwise
 */
export const validateSession = async (sessionId: string): Promise<boolean> => {
  try {
    console.log(`[${new Date().toISOString()}] 🔍 Validating session: ${sessionId}`);
    // Attempt to fetch cart - this will fail if session is inactive
    await getCart(sessionId);
    console.log(`[${new Date().toISOString()}] ✅ Session is valid`);
    return true;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Session validation failed:`, error?.response?.status);
    
    // If session is invalid (400/401), clear stored session data
    if (error?.response?.status === 400 || error?.response?.status === 401) {
      const searchParams = new URLSearchParams(window.location.search);
      const tableId = searchParams.get('tableId');
      
      if (tableId) {
        // Remove invalid session from localStorage
        const sessions = JSON.parse(localStorage.getItem('sessions') || '{}');
        delete sessions[tableId];
        localStorage.setItem('sessions', JSON.stringify(sessions));
        console.log(`[${new Date().toISOString()}] 🗑️ Removed invalid session for table ${tableId}`);
      }
      
      // Clear customer authentication tokens
      TokenManager.clearCustomerAuth();
    }
    
    return false;
  }
};
//-----------------END CHANGE----------------------
// ==================== CUSTOMER ENDPOINTS ====================

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

// ==================== AUTH ENDPOINTS ====================

export const login = async (payload: LoginRequest): Promise<LoginResponse> => {
  try {
    console.log(`[${new Date().toISOString()}] 🔐 Logging in user: ${payload.username}`);
    const response = await api.post('/api/auth/login', {
      username: payload.username,
      password: payload.password,
      tenantSlug: payload.tenantSlug
    });
    console.log(`[${new Date().toISOString()}] ✅ Login successful`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error logging in:`, error.response?.data || error.message);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    console.log(`[${new Date().toISOString()}] 🚪 Logging out`);
    await api.post('/api/auth/logout');
    console.log(`[${new Date().toISOString()}] ✅ Logout successful`);
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error logging out:`, error.response?.data || error.message);
    // Continue with client-side logout even if server call fails
  }
};

export const getCurrentUser = async (): Promise<CurrentUserResponse> => {
  try {
    console.log(`[${new Date().toISOString()}] 👤 Fetching current user`);
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching current user:`, error.response?.data || error.message);
    throw error;
  }
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  try {
    console.log(`[${new Date().toISOString()}] 🔑 Changing password`);
    await api.post('/api/auth/change-password', {
      currentPassword,
      newPassword
    });
    console.log(`[${new Date().toISOString()}] ✅ Password changed successfully`);
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error changing password:`, error.response?.data || error.message);
    throw error;
  }
};

// ==================== ADMIN ORDER ENDPOINTS ====================

export const getActiveOrders = async (): Promise<ActiveOrderResponse[]> => {
  try {
    console.log(`[${new Date().toISOString()}] 📋 Fetching active orders`);
    const response = await api.get('/api/admin/orders/active');
    console.log(`[${new Date().toISOString()}] ✅ Retrieved ${response.data.length} active orders`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching active orders:`, error.response?.data || error.message);
    throw error;
  }
};

export const updateOrderStatus = async (payload: UpdateOrderRequest): Promise<void> => {
  try {
    console.log(`[${new Date().toISOString()}] 📝 Updating order status for orderId: ${payload.orderId} to ${payload.status}`);
    await api.put('/api/admin/order/update', payload);
    console.log(`[${new Date().toISOString()}] ✅ Order status updated successfully`);
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error updating order status:`, error.response?.data || error.message);
    throw error;
  }
};

export const editOrder = async (payload: EditOrderRequest): Promise<void> => {
  try {
    console.log(`[${new Date().toISOString()}] ✏️ Editing order: ${payload.orderId}`);
    await api.put('/api/admin/order/edit', payload);
    console.log(`[${new Date().toISOString()}] ✅ Order edited successfully`);
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error editing order:`, error.response?.data || error.message);
    throw error;
  }
};

export const editCart = async (payload: EditCartRequest): Promise<void> => {
  try {
    console.log(`[${new Date().toISOString()}] ✏️ Editing cart for sessionId: ${payload.sessionId}`);
    await api.put('/api/admin/cart/edit', payload);
    console.log(`[${new Date().toISOString()}] ✅ Cart edited successfully`);
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error editing cart:`, error.response?.data || error.message);
    throw error;
  }
};

export const getPaymentDetails = async (orderId: string): Promise<PaymentResponse> => {
  try {
    console.log(`[${new Date().toISOString()}] 💳 Fetching payment details for orderId: ${orderId}`);
    const response = await api.get(`/api/admin/payment/${orderId}`);
    console.log(`[${new Date().toISOString()}] ✅ Payment details retrieved`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching payment details:`, error.response?.data || error.message);
    throw error;
  }
};

// ==================== ADMIN TABLE ENDPOINTS ====================

export const createTable = async (payload: CreateTableRequest): Promise<CreateTableResponse> => {
  try {
    console.log(`[${new Date().toISOString()}] 🪑 Creating table: ${payload.tableNumber}`);
    const response = await api.post('/api/admin/tables/create', payload);
    console.log(`[${new Date().toISOString()}] ✅ Table created successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error creating table:`, error.response?.data || error.message);
    throw error;
  }
};

export const getTables = async (): Promise<TableResponse[]> => {
  try {
    console.log(`[${new Date().toISOString()}] 🪑 Fetching all tables`);
    const response = await api.get('/api/admin/tables');
    console.log(`[${new Date().toISOString()}] ✅ Retrieved ${response.data.length} tables`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching tables:`, error.response?.data || error.message);
    throw error;
  }
};

export const getTable = async (tableId: number): Promise<TableResponse> => {
  try {
    console.log(`[${new Date().toISOString()}] 🪑 Fetching table: ${tableId}`);
    const response = await api.get(`/api/admin/tables/${tableId}`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching table:`, error.response?.data || error.message);
    throw error;
  }
};

export const updateTable = async (tableId: number, payload: Partial<CreateTableRequest>): Promise<TableResponse> => {
  try {
    console.log(`[${new Date().toISOString()}] 🪑 Updating table: ${tableId}`);
    const response = await api.put(`/api/admin/tables/${tableId}`, payload);
    console.log(`[${new Date().toISOString()}] ✅ Table updated successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error updating table:`, error.response?.data || error.message);
    throw error;
  }
};

export const deleteTable = async (tableId: number): Promise<void> => {
  try {
    console.log(`[${new Date().toISOString()}] 🗑️ Deleting table: ${tableId}`);
    await api.delete(`/api/admin/tables/${tableId}`);
    console.log(`[${new Date().toISOString()}] ✅ Table deleted successfully`);
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error deleting table:`, error.response?.data || error.message);
    throw error;
  }
};

// ==================== ADMIN STAFF ENDPOINTS ====================

export const getStaff = async (): Promise<Staff[]> => {
  try {
    console.log(`[${new Date().toISOString()}] 👥 Fetching staff list`);
    const response = await api.get('/api/admin/staff');
    console.log(`[${new Date().toISOString()}] ✅ Retrieved ${response.data.length} staff members`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching staff:`, error.response?.data || error.message);
    throw error;
  }
};

export const getStaffMember = async (userId: string): Promise<Staff> => {
  try {
    console.log(`[${new Date().toISOString()}] 👤 Fetching staff member: ${userId}`);
    const response = await api.get(`/api/admin/staff/${userId}`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching staff member:`, error.response?.data || error.message);
    throw error;
  }
};

export const addStaff = async (payload: AddStaffRequest): Promise<Staff> => {
  try {
    console.log(`[${new Date().toISOString()}] 👤 Adding staff member: ${payload.username}`);
    const response = await api.post('/api/admin/staff/add', payload);
    console.log(`[${new Date().toISOString()}] ✅ Staff member added successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error adding staff:`, error.response?.data || error.message);
    throw error;
  }
};

export const updateStaffRole = async (id: string, role: string): Promise<Staff> => {
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Updating staff role for id: ${id} to ${role}`);
    const response = await api.put('/api/admin/staff/update', { 
      id, 
      role,
      // Note: You may need to fetch the user first to get username, email, isActive
      // Or modify the backend to accept partial updates
    });
    console.log(`[${new Date().toISOString()}] ✅ Staff role updated successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error updating staff role:`, error.response?.data || error.message);
    throw error;
  }
};

export const updateStaff = async (payload: UpdateStaffRequest): Promise<Staff> => {
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Updating staff member: ${payload.id}`);
    const response = await api.put('/api/admin/staff/update', payload);
    console.log(`[${new Date().toISOString()}] ✅ Staff member updated successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error updating staff member:`, error.response?.data || error.message);
    throw error;
  }
};

export const deleteStaff = async (userId: string): Promise<void> => {
  try {
    console.log(`[${new Date().toISOString()}] 🗑️ Deleting staff member: ${userId}`);
    await api.delete(`/api/admin/staff/${userId}`);
    console.log(`[${new Date().toISOString()}] ✅ Staff member deleted successfully`);
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error deleting staff member:`, error.response?.data || error.message);
    throw error;
  }
};

export const toggleStaffActive = async (userId: string): Promise<Staff> => {
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Toggling active status for staff member: ${userId}`);
    const response = await api.patch(`/api/admin/staff/${userId}/toggle-active`);
    console.log(`[${new Date().toISOString()}] ✅ Staff active status toggled successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error toggling staff active status:`, error.response?.data || error.message);
    throw error;
  }
};

// 🟢 Customer: Get my orders
export const getMyOrders = async (): Promise<OrderResponse[]> => {
  try {
    console.log(`[${new Date().toISOString()}] 📋 Fetching my orders`);
    const response = await api.get('/api/orders/my-orders'); // FIXED: Added /api prefix
    console.log(`[${new Date().toISOString()}] ✅ Retrieved ${response.data.length} orders`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching my orders:`, error?.response?.status, error?.response?.data);
    throw error;
  }
};

// mesa-magica-pwa-app/src/api/api.ts
// Add this function to your existing api.ts file

// ==================== SESSION MANAGEMENT ====================

/**
 * Close a session and free the table
 * This should be called when an order is marked as closed
 */
export const closeSession = async (sessionId: string): Promise<void> => {
  try {
    console.log(`[${new Date().toISOString()}] 🔒 Closing session: ${sessionId}`);
    await api.post('/api/Sessions/close', { sessionId });
    console.log(`[${new Date().toISOString()}] ✅ Session closed successfully`);
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error closing session:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get session details
 */
export const getSessionDetails = async (sessionId: string): Promise<any> => {
  try {
    console.log(`[${new Date().toISOString()}] 📋 Fetching session details: ${sessionId}`);
    const response = await api.get(`/api/Sessions/${sessionId}`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching session details:`, error.response?.data || error.message);
    throw error;
  }
};

// ==================== UPDATED ORDER ENDPOINTS ====================

/**
 * Update order status and close session if status is "Closed"
 */
export const updateOrderStatusWithSession = async (payload: UpdateOrderRequest): Promise<void> =>         {
  try {
    console.log(`[${new Date().toISOString()}] 📝 Updating order status for orderId: ${payload.orderId} to ${payload.status}`);
    
    // Update the order status
    await api.put('/api/admin/order/update', payload);
    console.log(`[${new Date().toISOString()}] ✅ Order status updated successfully`);
    
    // If status is "Closed", we should close the session
    if (payload.status.toLowerCase() === "closed") {
      try {
        // First, get the order details to find the session
        const orderResponse = await api.get(`/api/admin/order/${payload.orderId}`);
        const sessionId = orderResponse.data.sessionId;
        
        if (sessionId) {
          console.log(`[${new Date().toISOString()}] 🔒 Closing session ${sessionId} for closed order ${payload.orderId}`);
          await closeSession(sessionId);
        }
      } catch (sessionError) {
        console.error(`[${new Date().toISOString()}] ⚠️ Could not close session for order ${payload.orderId}:`, sessionError);
        // Don't throw error here - order is still closed even if session close fails
      }
    }
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error updating order status:`, error.response?.data || error.message);
    throw error;
  }
};

// mesa-magica-pwa-app/src/api/api.ts
// Add this function to the existing api.ts file

export const toggleTableOccupancy = async (tableId: number): Promise<TableResponse> => {
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Toggling table occupancy: ${tableId}`);
    const response = await api.patch(`/api/admin/tables/${tableId}/toggle-occupancy`);
    console.log(`[${new Date().toISOString()}] ✅ Table occupancy toggled successfully`);
    return response.data.table;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error toggling table occupancy:`, error.response?.data || error.message);
    throw error;
  }
};

// ==================== ADMIN SESSION ENDPOINTS ====================

/**
 * Get all active sessions with details
 */
export const getActiveSessions = async (): Promise<ActiveSessionResponse[]> => {
  try {
    console.log(`[${new Date().toISOString()}] 📋 Fetching active sessions`);
    const response = await api.get('/api/admin/sessions/active');
    console.log(`[${new Date().toISOString()}] ✅ Retrieved ${response.data.length} active sessions`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching active sessions:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Manually close a session (admin action)
 */
export const closeSessionAdmin = async (sessionId: string): Promise<CloseSessionResponse> => {
  try {
    console.log(`[${new Date().toISOString()}] 🔒 Admin closing session: ${sessionId}`);
    const response = await api.post(`/api/admin/sessions/${sessionId}/close`);
    console.log(`[${new Date().toISOString()}] ✅ Session closed successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error closing session:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get detailed session information including orders and cart
 */
export const getSessionDetailsAdmin = async (sessionId: string): Promise<SessionDetailsResponse> => {
  try {
    console.log(`[${new Date().toISOString()}] 📋 Fetching session details: ${sessionId}`);
    const response = await api.get(`/api/admin/sessions/${sessionId}`);
    return response.data;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching session details:`, error.response?.data || error.message);
    throw error;
  }
};

export default api;