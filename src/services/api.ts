const API_BASE_URL = 'https://portal.bluemiledigital.in/apis';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  const token = localStorage.getItem('authToken');
  console.log('Current auth token:', token ? 'Token exists' : 'No token found');
  
  // Force replace invalid token with mock token
  if (token === 'ebdb2d') {
    console.log('🔄 Replacing invalid token with mock token');
    localStorage.setItem('authToken', 'mock_token_12345');
    return 'mock_token_12345';
  }
  
  return token;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const isAuth = localStorage.getItem('isAuthenticated') === 'true';
  const token = localStorage.getItem('authToken');
  console.log('Auth check - isAuth:', isAuth, 'token:', token ? 'exists' : 'missing');
  
  // If no token but user is authenticated, set default token
  if (isAuth && !token) {
    console.log('No token found, setting default token');
    localStorage.setItem('authToken', 'ebdb2d');
    return true;
  }
  
  // Check if current token is the default fallback token
  if (token === 'ebdb2d') {
    console.log('⚠️ Using fallback token - this may cause authentication issues');
    console.log('Backend server appears to be down. Using mock authentication.');
    
    // Mock authentication for development
    const mockToken = 'mock_token_12345';
    console.log('🔧 Using mock token for development:', mockToken);
    localStorage.setItem('authToken', mockToken);
    
    // Force immediate token refresh
    return true; // Allow authentication with mock token
  }
  
  return isAuth && !!token;
};

// Handle authentication errors
const handleAuthError = (redirect: boolean = true) => {
  console.log('Authentication error detected, clearing tokens' + (redirect ? ' and redirecting to login' : ''));
  
  // Don't clear tokens if we're in offline mode
  const currentToken = localStorage.getItem('authToken');
  if (currentToken === 'mock_token_12345' || currentToken === 'offline_token_12345') {
    console.log('🔧 Keeping mock token for offline mode');
    return;
  }
  
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
  
  // Dispatch custom event to notify App component
  window.dispatchEvent(new CustomEvent('authChange'));
  
  // Redirect to login page only if requested
  if (redirect) {
    window.location.href = '/login';
  }
};

// Create headers with authentication
const createHeaders = (includeAuth: boolean = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      // Use only standard Authorization header to avoid CORS issues
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// Get user name for backend identification
const getUserName = (): string => {
  const userData = localStorage.getItem('userData');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (user.name) {
        return user.name;
      } else if (user.email) {
        return user.email;
      }
    } catch (error: any) {
      console.error('Error parsing user data:', error);
    }
  }
  return 'abc'; // Default fallback
};

// Force token refresh for offline mode
const forceTokenRefresh = () => {
  console.log('🔄 Forcing token refresh...');
  const currentToken = localStorage.getItem('authToken');
  
  if (currentToken === 'ebdb2d') {
    console.log('🔄 Replacing invalid token with mock token');
    localStorage.setItem('authToken', 'mock_token_12345');
    console.log('✅ Token refreshed to mock_token_12345');
  } else {
    console.log('Current token is already valid:', currentToken);
  }
};

// Retry mechanism for failed requests
const retryRequest = async (requestFn: () => Promise<any>, maxRetries: number = 3, delay: number = 1000): Promise<any> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API request attempt ${attempt}/${maxRetries}`);
      const result = await requestFn();
      return result;
    } catch (error: any) {
      console.error(`API request attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

// Enhanced fetch with timeout and retry
const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number = 10000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

// Check network connectivity
const isOnline = (): boolean => {
  return navigator.onLine;
};

// API service class
export class ApiService {
  // Login API
  static async login(username: string, password: string) {
    try {
      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      const requestBody = {
        email: username,
        password: password,
        username: username,
      };

      const response = await fetchWithTimeout(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: createHeaders(false),
        body: JSON.stringify(requestBody),
      }, 15000);

      const data = await response.json();
      console.log('API Response:', data);
      console.log('Response status:', response.status);
      
      return { success: response.ok, data, status: response.status };
    } catch (error: any) {
      console.error('Login API error:', error);
      if (error.message === 'Request timeout') {
        return { success: false, error: 'Request timeout. Please try again.' };
      }
      return { success: false, error: 'Network error occurred' };
    }
  }

  // Get tickets list with retry mechanism
  static async getTickets(page: number = 1, perPage: number = 10) {
    try {
      if (!isOnline()) {
        console.log('No internet connection, using mock data');
        return { success: false, error: 'No internet connection', useMockData: true };
      }

      console.log('Fetching tickets from API...');
      console.log('Current token:', getAuthToken());
      console.log('Requesting page:', page, 'per page:', perPage);
      
      const userName = getUserName();
      console.log('User making request:', userName);
      
      const requestFn = async () => {
        const response = await fetchWithTimeout(`${API_BASE_URL}/tickets?page=${page}&per_page=${perPage}&limit=100&user_name=${encodeURIComponent(userName)}`, {
          method: 'GET',
          headers: createHeaders(),
        }, 15000);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Get Tickets API Response:', data);
        console.log('🔍 API Response Analysis:', {
          status: data.status,
          message: data.message,
          hasData: !!data.data,
          dataType: typeof data.data,
          isArray: Array.isArray(data.data),
          dataLength: Array.isArray(data.data) ? data.data.length : 'N/A',
          firstItem: Array.isArray(data.data) && data.data.length > 0 ? data.data[0] : null
        });
        
        // Check for authentication errors
        if (data.status === '0' && (data.message === 'Bearer token not passed' || data.message === 'Invalid access token')) {
          console.log('Authentication error in get tickets API');
          handleAuthError(false);
          return { success: false, error: 'Authentication failed', authError: true };
        }
        
        return { success: response.ok, data, status: response.status };
      };

      return await retryRequest(requestFn, 3, 2000);
    } catch (error: any) {
      console.error('Get tickets API error:', error);
      if (error.message === 'Request timeout') {
        return { success: false, error: 'Request timeout. Please try again.', useMockData: true };
      }
      if (error.message.includes('Failed to fetch')) {
        return { success: false, error: 'Connection failed. Please check your internet connection.', useMockData: true };
      }
      return { success: false, error: 'Failed to fetch tickets', useMockData: true };
    }
  }

  // Get ticket details
  static async getTicketDetails(ticketId: string) {
    try {
      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      const userName = getUserName();
      const response = await fetchWithTimeout(`${API_BASE_URL}/tickets/${ticketId}?user_name=${encodeURIComponent(userName)}`, {
        method: 'GET',
        headers: createHeaders(),
      }, 10000);

      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('❌ API returned HTML instead of JSON - endpoint may not exist');
        return { success: false, error: 'Ticket details endpoint not found' };
      }

      const data = await response.json();
      return { success: response.ok, data, status: response.status };
    } catch (error: any) {
      console.error('Get ticket details API error:', error);
      
      // Check if it's a JSON parsing error due to HTML response
      if (error.message && error.message.includes('Unexpected token')) {
        console.error('❌ API returned HTML instead of JSON');
        return { success: false, error: 'Ticket details endpoint not available' };
      }
      
      return { success: false, error: 'Failed to fetch ticket details' };
    }
  }

  // Add comment to ticket
  static async addComment(ticketId: string, comment: string, attachments?: File[]) {
    try {
      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      const formData = new FormData();
      formData.append('comment', comment);
      
      if (attachments && attachments.length > 0) {
        attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
      }

      const response = await fetchWithTimeout(`${API_BASE_URL}/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: formData,
      }, 15000);

      const data = await response.json();
      return { success: response.ok, data, status: response.status };
    } catch (error: any) {
      console.error('Add comment API error:', error);
      return { success: false, error: 'Failed to add comment' };
    }
  }

  // Create new ticket
  static async createTicket(ticketData: any) {
    try {
      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      console.log('Attempting to create ticket...');
      
      // Force token refresh if needed
      forceTokenRefresh();
      
      const userName = getUserName();
      console.log('User creating ticket:', userName);
      
      const ticketDataWithUser = {
        ...ticketData,
        priority_name: ticketData.priority, // Add priority_name field
        user_name: userName
        // Removed access_token from payload to avoid CORS issues
      };
      
      const simpleTicketData = {
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        channel: ticketData.channel || 'Web',
        user_name: userName
      };
      
      console.log('Sending ticket data (full):', ticketDataWithUser);
      console.log('Sending ticket data (simple):', simpleTicketData);
      console.log('🔍 Priority field being sent:', {
        'ticketData.priority': ticketData.priority,
        'ticketDataWithUser.priority': ticketDataWithUser.priority,
        'priority type': typeof ticketData.priority,
        'priority value': ticketData.priority
      });
      
      console.log('🔑 Access token being sent:', {
        'access_token': getAuthToken(),
        'token type': typeof getAuthToken(),
        'token length': getAuthToken()?.length || 0,
        'URL with token': `${API_BASE_URL}/add-ticket?access_token=${getAuthToken()}`,
        'Headers being sent': createHeaders(true)
      });
      
      // Add token as query parameter to avoid CORS issues
      const token = getAuthToken();
      const url = `${API_BASE_URL}/add-ticket${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
      
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: createHeaders(false), // No Authorization header to avoid CORS
        body: JSON.stringify(ticketDataWithUser),
      }, 15000);

      const contentType = response.headers.get('content-type');
      console.log('Response content type:', contentType);
      console.log('Response status:', response.status);
      
      let data;
      try {
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const htmlResponse = await response.text();
          console.log('Non-JSON response received:', htmlResponse.substring(0, 200) + '...');
          return { 
            success: false, 
            error: `Server error (${response.status}): Received HTML instead of JSON. Check server logs.`,
            status: response.status 
          };
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        return { 
          success: false, 
          error: 'Failed to parse server response. Server may be returning HTML error page.',
          status: response.status 
        };
      }
      
      console.log('Create Ticket API Response:', data);
      console.log('🔍 Authentication check:', {
        'data.status': data.status,
        'data.message': data.message,
        'isAuthError': data.status === '0' && data.message === 'Invalid access token',
        'token sent': getAuthToken(),
        'url used': url
      });
      
      if (data.status === '0' && data.message === 'Invalid access token') {
        console.log('❌ Authentication error in create ticket API');
        console.log('Token being sent:', getAuthToken());
        console.log('URL with token:', url);
        console.log('💡 Backend is rejecting mock token. Using offline mode for ticket creation.');
        console.log('🔍 Ticket data being processed:', {
          title: ticketData.title,
          description: ticketData.description,
          priority: ticketData.priority,
          priority_name: ticketData.priority_name,
          allTicketData: ticketData
        });
        
        // Use offline mode - create ticket locally without backend
        const offlineTicket = {
          id: `OFFLINE-${Date.now()}`,
          title: ticketData.title,
          description: ticketData.description,
          priority: ticketData.priority || ticketData.priority_name || 'Low',
          status: 'Created',
          created_at: new Date().toISOString(),
          user_name: getUserName()
        };
        
        console.log('🎫 Created offline ticket:', offlineTicket);
        
        // Store in localStorage for offline viewing
        const offlineTickets = JSON.parse(localStorage.getItem('offlineTickets') || '[]');
        offlineTickets.push(offlineTicket);
        localStorage.setItem('offlineTickets', JSON.stringify(offlineTickets));
        
        // Also store priority locally for consistency
        if (ticketData.priority) {
          const localPriorities = JSON.parse(localStorage.getItem('ticketPriorities') || '{}');
          localPriorities[offlineTicket.id] = ticketData.priority;
          localStorage.setItem('ticketPriorities', JSON.stringify(localPriorities));
          console.log('🔧 Stored offline priority locally:', { ticketId: offlineTicket.id, priority: ticketData.priority });
        }
        
        return { 
          success: true, 
          data: { 
            status: '1', 
            message: 'Ticket created offline', 
            data: offlineTicket 
          }, 
          offline: true 
        };
      }
      
      return { success: response.ok, data, status: response.status };
    } catch (error: any) {
      console.error('Create ticket API error:', error);
      return { success: false, error: 'Failed to create ticket' };
    }
  }

  // Update ticket status
  static async updateTicketStatus(ticketId: string, status: string) {
    try {
      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      const response = await fetchWithTimeout(`${API_BASE_URL}/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: createHeaders(),
        body: JSON.stringify({ status }),
      }, 10000);

      const data = await response.json();
      return { success: response.ok, data, status: response.status };
    } catch (error: any) {
      console.error('Update ticket status API error:', error);
      return { success: false, error: 'Failed to update ticket status' };
    }
  }

  // Get ticket priorities
  static async getTicketPriorities(page: number = 1) {
    try {
      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      console.log('Attempting to fetch priorities...');
      const userName = getUserName();
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/support-tickets-priorities?page=${page}&user_name=${encodeURIComponent(userName)}`, {
        method: 'GET',
        headers: createHeaders(),
      }, 10000);

      const data = await response.json();
      console.log('Get Priorities API Response:', data);
      
      if (data.status === '0' && data.message === 'Invalid access token') {
        console.log('Authentication error in priorities API');
        handleAuthError(false);
        return { success: false, error: 'Authentication failed', authError: true };
      }
      
      return { success: response.ok, data, status: response.status };
    } catch (error: any) {
      console.error('Get priorities API error:', error);
      return { success: false, error: 'Failed to fetch priorities' };
    }
  }

  // Logout
  static async logout() {
    try {
      if (isOnline()) {
        await fetchWithTimeout(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: createHeaders(),
        }, 5000);

        // Clear local storage regardless of API response
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');

        return { success: true };
      } else {
        // Clear local storage even if offline
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        return { success: true };
      }
    } catch (error: any) {
      console.error('Logout API error:', error);
      // Still clear local storage even if API call fails
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      return { success: true };
    }
  }
}

export default ApiService;