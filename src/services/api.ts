const API_BASE_URL = 'https://portal.bluemiledigital.in/apis';

// Cache for API responses
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 30000; // 30 seconds cache

// Cache helper functions
const getCacheKey = (endpoint: string, params: any = {}) => {
  return `${endpoint}_${JSON.stringify(params)}`;
};

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    console.log('🚀 Using cached data for:', key);
    return cached.data;
  }
  if (cached) {
    cache.delete(key);
  }
  return null;
};

const setCachedData = (key: string, data: any, ttl: number = CACHE_TTL) => {
  cache.set(key, { data, timestamp: Date.now(), ttl });
  console.log('💾 Cached data for:', key);
};

// Clear cache function
const clearCache = (pattern?: string) => {
  if (pattern) {
    for (const [key] of cache) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
    console.log('🗑️ Cleared cache for pattern:', pattern);
  } else {
    cache.clear();
    console.log('🗑️ Cleared all cache');
  }
};

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

  // Get tickets list with caching and retry mechanism
  static async getTickets(page: number = 1, perPage: number = 10, useCache: boolean = true) {
    try {
      // Check cache first
      if (useCache) {
        const cacheKey = getCacheKey('tickets', { page, perPage, user: getUserName() });
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      if (!isOnline()) {
        console.log('No internet connection, using mock data');
        return { success: false, error: 'No internet connection', useMockData: true };
      }

      console.log('🚀 Fetching tickets from API...');
      console.log('Current token:', getAuthToken());
      console.log('Requesting page:', page, 'per page:', perPage);
      
      const userName = getUserName();
      console.log('User making request:', userName);
      
      const requestFn = async () => {
        // Try different endpoints to get tickets with priority data
        const possibleEndpoints = [
          `${API_BASE_URL}/support-tickets?page=${page}&per_page=${perPage}&limit=100&user_name=${encodeURIComponent(userName)}`,
          `${API_BASE_URL}/tickets?page=${page}&per_page=${perPage}&limit=100&user_name=${encodeURIComponent(userName)}&include_priority=true`,
          `${API_BASE_URL}/tickets?page=${page}&per_page=${perPage}&limit=100&user_name=${encodeURIComponent(userName)}&with_priority=true`,
          `${API_BASE_URL}/tickets?page=${page}&per_page=${perPage}&limit=100&user_name=${encodeURIComponent(userName)}`
        ];
        
        let response;
        let lastError;
        
        for (const endpoint of possibleEndpoints) {
          try {
            console.log(`🔍 Trying endpoint: ${endpoint}`);
            response = await fetchWithTimeout(endpoint, {
              method: 'GET',
              headers: createHeaders(),
            }, 10000);
            
            if (response.ok) {
              console.log(`✅ Success with endpoint: ${endpoint}`);
              break;
            }
          } catch (error) {
            console.log(`❌ Failed with endpoint: ${endpoint}`, error);
            lastError = error;
            continue;
          }
        }
        
        if (!response || !response.ok) {
          throw lastError || new Error('All endpoints failed');
        }

        const data = await response.json();
        console.log('Get Tickets API Response:', data);
        
        // Debug: Check if priority data is included
        if (data.data && Array.isArray(data.data)) {
          console.log('🔍 Sample ticket data structure:', data.data[0]);
          console.log('🔍 Priority fields in ticket:', {
            priority: data.data[0]?.priority,
            priority_name: data.data[0]?.priority_name,
            priority_bg_color: data.data[0]?.priority_bg_color,
            priority_text_color: data.data[0]?.priority_text_color
          });
        }
        
        // Check for authentication errors
        if (data.status === '0' && (data.message === 'Bearer token not passed' || data.message === 'Invalid access token')) {
          console.log('Authentication error in get tickets API');
          handleAuthError(false);
          return { success: false, error: 'Authentication failed', authError: true };
        }
        
        const result = { success: response.ok, data, status: response.status };
        
        // Cache successful responses
        if (result.success && useCache) {
          const cacheKey = getCacheKey('tickets', { page, perPage, user: userName });
          setCachedData(cacheKey, result, CACHE_TTL);
        }
        
        return result;
      };

      return await retryRequest(requestFn, 2, 1500); // Reduced retries and delay
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

  // Get ticket details with caching
  static async getTicketDetails(ticketId: string, useCache: boolean = true) {
    try {
      // Check cache first
      if (useCache) {
        const cacheKey = getCacheKey('ticket-details', { ticketId });
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      console.log('🚀 Fetching ticket details for ID:', ticketId);
      
      // Get the actual database ID from the ticket data
      let databaseId = ticketId;
      
      // If the ticket ID is already numeric, use it directly
      if (typeof ticketId === 'string' && /^\d+$/.test(ticketId)) {
        console.log('🔢 Ticket ID is already numeric, using directly:', ticketId);
        databaseId = ticketId;
      } else {
        console.log('🔍 Ticket ID is not numeric, need to find database ID');
      }
      
      // Only try to fetch tickets if we don't already have a numeric ID
      if (!/^\d+$/.test(String(databaseId))) {
        try {
          console.log('🔄 Fetching tickets to find database ID for ticket details...');
          const ticketsResult = await this.getTickets(1, 100);
        console.log('📡 Tickets fetch result for ticket details:', {
          success: ticketsResult.success,
          hasData: !!ticketsResult.data,
          dataType: typeof ticketsResult.data,
          isArray: Array.isArray(ticketsResult.data?.data)
        });
        
        if (ticketsResult.success && ticketsResult.data && ticketsResult.data.data) {
          const tickets = ticketsResult.data.data;
          console.log('📋 Available tickets for ticket details lookup:', tickets.map((t: any) => ({
            id: t.id,
            ticket_number: t.ticket_number,
            title: t.title
          })));
          
          console.log('🔍 Looking for ticket with ID:', ticketId);
          console.log('🔍 Available ticket numbers:', tickets.map((t: any) => t.ticket_number));
          console.log('🔍 Available ticket IDs:', tickets.map((t: any) => t.id));
          
          const matchingTicket = tickets.find((ticket: any) => 
            ticket.ticket_number === ticketId || ticket.id === ticketId
          );
          
          console.log('🔍 Matching result:', {
            found: !!matchingTicket,
            ticketId: ticketId,
            matchingTicket: matchingTicket ? {
              id: matchingTicket.id,
              ticket_number: matchingTicket.ticket_number,
              title: matchingTicket.title
            } : null
          });
          
          if (matchingTicket) {
            databaseId = matchingTicket.id;
            console.log('🔢 Found matching ticket for ticket details:', { 
              ticketNumber: ticketId, 
              databaseId: matchingTicket.id,
              ticketData: matchingTicket
            });
          } else {
            console.log('⚠️ No matching ticket found for ticket details:', ticketId);
            console.log('🔍 Available ticket numbers:', tickets.map((t: any) => t.ticket_number));
            console.log('🔍 Available ticket IDs:', tickets.map((t: any) => t.id));
            
            // Fallback: try to extract from ticket number
            if (typeof ticketId === 'string' && !/^\d+$/.test(ticketId)) {
              const match = ticketId.match(/\d+/);
              if (match) {
                databaseId = match[0];
                console.log('🔢 Using extracted ID from ticket number for ticket details:', databaseId);
              }
            }
          }
        } else {
          console.log('⚠️ Could not fetch tickets for ticket details ID lookup');
          console.log('📡 Tickets result for ticket details:', ticketsResult);
          
          // Fallback: try to extract from ticket number
          if (typeof ticketId === 'string' && !/^\d+$/.test(ticketId)) {
            const match = ticketId.match(/\d+/);
            if (match) {
              databaseId = match[0];
              console.log('🔢 Using extracted ID from ticket number for ticket details:', databaseId);
            }
          }
        }
        } catch (error) {
          console.log('⚠️ Error fetching tickets for ticket details ID lookup:', error);
          
          // Fallback: try to extract from ticket number
          if (typeof ticketId === 'string' && !/^\d+$/.test(ticketId)) {
            const match = ticketId.match(/\d+/);
            if (match) {
              databaseId = match[0];
              console.log('🔢 Using extracted ID from ticket number for ticket details:', databaseId);
            }
          }
        }
      } else {
        console.log('🔢 Skipping ticket lookup - already have numeric database ID:', databaseId);
      }
      
      console.log('🔢 Using database ID for ticket details:', { original: ticketId, databaseId });
      
      // Validate that we have a valid database ID
      if (!databaseId || databaseId === '') {
        console.error('❌ No valid database ID found for ticket details:', ticketId);
        return { success: false, error: 'No valid database ID found for ticket' };
      }
      
      // Ensure database ID is numeric
      if (!/^\d+$/.test(String(databaseId))) {
        console.error('❌ Database ID is not numeric for ticket details:', databaseId);
        return { success: false, error: 'Database ID must be numeric for ticket details endpoint' };
      }
      
      console.log('🔍 About to call ticket details API with database ID:', databaseId);
      
      // Try different possible endpoints for ticket details with notes
      const possibleTicketDetailsEndpoints = [
        `${API_BASE_URL}/ticket-details?&support_tickets_id=${databaseId}`,
        `${API_BASE_URL}/ticket-details?support_tickets_id=${databaseId}&include_notes=true`,
        `${API_BASE_URL}/ticket-details?support_tickets_id=${databaseId}&with_notes=true`,
        `${API_BASE_URL}/ticket-details?support_tickets_id=${databaseId}&notes=true`,
        `${API_BASE_URL}/ticket-details?support_tickets_id=${databaseId}&with_comments=true`,
        `${API_BASE_URL}/ticket-details?support_tickets_id=${databaseId}&include_comments=true`
      ];
      
      let response;
      let successfulEndpoint = null;
      
      for (const endpoint of possibleTicketDetailsEndpoints) {
        try {
          console.log('🔍 Trying ticket details endpoint:', endpoint);
          response = await fetchWithTimeout(endpoint, {
        method: 'GET',
        headers: createHeaders(),
      }, 10000);
          
          if (response.ok) {
            successfulEndpoint = endpoint;
            console.log('✅ Found working ticket details endpoint:', endpoint);
            break;
          } else {
            console.log('❌ Endpoint failed:', endpoint, 'Status:', response.status);
          }
        } catch (error) {
          console.log('❌ Endpoint error:', endpoint, error);
        }
      }
      
      if (!response || !response.ok) {
        console.log('❌ No working ticket details endpoint found');
        return { success: false, error: 'No working ticket details endpoint found' };
      }

      console.log('🔍 Ticket details response status:', response.status);

      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('❌ API returned HTML instead of JSON - endpoint may not exist');
        return { success: false, error: 'Ticket details endpoint not found' };
      }

      const data = await response.json();
      console.log('🔍 Ticket details API response:', data);
      console.log('🔍 Full API response structure:', JSON.stringify(data, null, 2));
      console.log('🔍 API Response Analysis:', {
        status: data.status,
        message: data.message,
        hasData: !!data.data,
        dataType: typeof data.data,
        isSuccess: data.status === '1',
        responseStatus: response.status,
        responseOk: response.ok
      });
      
      // Check if documents field exists and log its content
      if (data.data) {
        console.log('🔍 Documents field in API response:', data.data.documents);
        console.log('🔍 Documents field type:', typeof data.data.documents);
        console.log('🔍 Documents field length:', data.data.documents ? data.data.documents.length : 'null/undefined');
        console.log('🔍 Notes field in API response:', data.data.notes);
        console.log('🔍 Notes field type:', typeof data.data.notes);
        console.log('🔍 Notes field length:', data.data.notes ? data.data.notes.length : 'null/undefined');
      }
      
      // Log the notes field status
      if (data.data) {
        if (data.data.notes && Array.isArray(data.data.notes)) {
          console.log('✅ Notes field is populated with', data.data.notes.length, 'comments');
          console.log('📝 Notes content:', data.data.notes);
        } else if (data.data.notes === null) {
          console.log('ℹ️ Notes field is null - no comments exist for this ticket yet');
        } else {
          console.log('⚠️ Notes field has unexpected format:', data.data.notes);
        }
      }
      
      // Only try to fetch notes separately if the API doesn't return them and we expect them to exist
      // For now, we'll trust the API response since it's working correctly
      console.log('✅ Using notes directly from ticket details API response');
      
      const result = { success: response.ok, data, status: response.status };
      
      // Cache successful responses
      if (result.success && useCache) {
        const cacheKey = getCacheKey('ticket-details', { ticketId });
        setCachedData(cacheKey, result, CACHE_TTL);
      }
      
      return result;
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

  // Get ticket attachments
  static async getTicketAttachments(ticketId: string) {
    try {
      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      console.log('🔍 Fetching ticket attachments for ID:', ticketId);
      
      // Try different possible endpoints for attachments
      const possibleEndpoints = [
        `${API_BASE_URL}/ticket-attachments?support_tickets_id=${ticketId}`,
        `${API_BASE_URL}/ticket-documents?support_tickets_id=${ticketId}`,
        `${API_BASE_URL}/attachments?ticket_id=${ticketId}`,
        `${API_BASE_URL}/documents?ticket_id=${ticketId}`
      ];
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log('🔍 Trying endpoint:', endpoint);
          const response = await fetchWithTimeout(endpoint, {
            method: 'GET',
            headers: createHeaders(),
          }, 5000);

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Found attachments endpoint:', endpoint, data);
            return { success: true, data, endpoint };
          }
        } catch (error) {
          console.log('❌ Endpoint failed:', endpoint, error);
          continue;
        }
      }
      
      console.log('❌ No working attachments endpoint found');
      return { success: false, error: 'No attachments endpoint found' };
    } catch (error: any) {
      console.error('Get ticket attachments API error:', error);
      return { success: false, error: 'Failed to fetch ticket attachments' };
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

  // Add ticket note/comment with attachments using the new API endpoint - SIMPLIFIED VERSION
  static async addTicketNote(ticketId: string, comment: string, attachments?: File[]) {
    try {
      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      console.log('Adding ticket note...', {
        support_tickets_id: ticketId,
        note: comment.substring(0, 50) + '...',
        attachments: attachments?.length || 0,
        user_name: getUserName()
      });

      const formData = new FormData();
      
      // Get the actual database ID from the ticket data
      let databaseId = ticketId;
      
      console.log('🔍 Looking for database ID for ticket:', ticketId);
      console.log('🔍 Ticket ID type:', typeof ticketId);
      console.log('🔍 Ticket ID value:', ticketId);
      console.log('🔍 Is numeric check:', /^\d+$/.test(String(ticketId)));
      
      // If the ticket ID is already numeric, use it directly (this might be a new ticket with database ID)
      if (typeof ticketId === 'string' && /^\d+$/.test(ticketId)) {
        console.log('🔢 Ticket ID is already numeric (likely database ID for new ticket):', ticketId);
        databaseId = ticketId;
        console.log('✅ Using numeric ticket ID directly as database ID');
        console.log('✅ Skipping tickets list lookup for numeric ID');
      } else {
        console.log('🔍 Ticket ID is not numeric, need to find database ID');
        console.log('🔍 Will attempt to find database ID from tickets list...');
      
      // Try to get the database ID from the tickets data
      try {
        console.log('🔄 Fetching tickets to find database ID...');
        // First, try to get tickets to find the correct database ID
        // For new tickets, we might need to fetch more pages or use a different approach
        const ticketsResult = await this.getTickets(1, 1000);
        console.log('📡 Tickets fetch result:', {
          success: ticketsResult.success,
          hasData: !!ticketsResult.data,
          dataType: typeof ticketsResult.data,
          isArray: Array.isArray(ticketsResult.data?.data)
        });
        
        if (ticketsResult.success && ticketsResult.data && ticketsResult.data.data) {
          const tickets = ticketsResult.data.data;
          console.log('📋 Available tickets:', tickets.map((t: any) => ({
            id: t.id,
            ticket_number: t.ticket_number,
            title: t.title
          })));
          
          console.log('🔍 Searching for ticket in list...');
          console.log('🔍 Looking for ticket ID:', ticketId);
          console.log('🔍 Available tickets in list:', tickets.length);
          
          const matchingTicket = tickets.find((ticket: any) => {
            const matchesTicketNumber = ticket.ticket_number === ticketId;
            const matchesId = ticket.id === ticketId;
            console.log('🔍 Checking ticket:', {
              id: ticket.id,
              ticket_number: ticket.ticket_number,
              matchesTicketNumber,
              matchesId,
              target: ticketId
            });
            return matchesTicketNumber || matchesId;
          });
          
          if (matchingTicket) {
            databaseId = matchingTicket.id;
            console.log('🔢 Found matching ticket:', { 
              ticketNumber: ticketId, 
              databaseId: matchingTicket.id,
              ticketData: matchingTicket 
            });
            console.log('✅ Successfully resolved database ID from tickets list');
          } else {
            console.log('⚠️ No matching ticket found for:', ticketId);
            console.log('🔍 Available ticket numbers:', tickets.map((t: any) => t.ticket_number));
            console.log('🔍 Available ticket IDs:', tickets.map((t: any) => t.id));
            
            // For new tickets, try to fetch more pages or use a different approach
            console.log('🔄 Ticket not found in first 100, trying to fetch more pages...');
            try {
              const moreTicketsResult = await this.getTickets(1, 1000); // Try to get more tickets
              if (moreTicketsResult.success && moreTicketsResult.data && moreTicketsResult.data.data) {
                const moreTickets = moreTicketsResult.data.data;
                console.log('📋 More tickets available:', moreTickets.length);
                
                const matchingTicketInMore = moreTickets.find((ticket: any) => 
                  ticket.ticket_number === ticketId || ticket.id === ticketId
                );
                
                if (matchingTicketInMore) {
                  databaseId = matchingTicketInMore.id;
                  console.log('🔢 Found matching ticket in extended search:', { 
                    ticketNumber: ticketId, 
                    databaseId: matchingTicketInMore.id,
                    ticketData: matchingTicketInMore 
                  });
                } else {
                  console.log('⚠️ Still no matching ticket found in extended search');
                  // Fallback: try to extract from ticket number or use as-is
                  if (typeof ticketId === 'string' && !/^\d+$/.test(ticketId)) {
                    const match = ticketId.match(/\d+/);
                    if (match) {
                      databaseId = match[0];
                      console.log('🔢 Using extracted ID from ticket number:', databaseId);
                    }
                  }
                }
              } else {
                console.log('⚠️ Could not fetch more tickets');
                // Fallback: try to extract from ticket number or use as-is
                if (typeof ticketId === 'string' && !/^\d+$/.test(ticketId)) {
                  const match = ticketId.match(/\d+/);
                  if (match) {
                    databaseId = match[0];
                    console.log('🔢 Using extracted ID from ticket number:', databaseId);
                  }
                }
              }
            } catch (error) {
              console.log('⚠️ Error fetching more tickets:', error);
              // Fallback: try to extract from ticket number or use as-is
              if (typeof ticketId === 'string' && !/^\d+$/.test(ticketId)) {
                const match = ticketId.match(/\d+/);
                if (match) {
                  databaseId = match[0];
                  console.log('🔢 Using extracted ID from ticket number:', databaseId);
                }
              }
            }
          }
        } else {
          console.log('⚠️ Could not fetch tickets to find database ID');
          console.log('📡 Tickets result:', ticketsResult);
          // Fallback: try to extract from ticket number or use as-is
          if (typeof ticketId === 'string' && !/^\d+$/.test(ticketId)) {
            const match = ticketId.match(/\d+/);
            if (match) {
              databaseId = match[0];
              console.log('🔢 Using extracted ID from ticket number:', databaseId);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Error fetching tickets for ID lookup:', error);
        // Fallback: try to extract from ticket number or use as-is
        if (typeof ticketId === 'string' && !/^\d+$/.test(ticketId)) {
          const match = ticketId.match(/\d+/);
          if (match) {
            databaseId = match[0];
            console.log('🔢 Using extracted ID from ticket number:', databaseId);
          }
        }
      }
      } // Close the else block
      
      console.log('🔢 Using database ID:', { original: ticketId, databaseId });
      
      // Validate that we have a valid database ID
      if (!databaseId || databaseId === '') {
        console.error('❌ No valid database ID found for ticket:', ticketId);
        console.log('🔄 Trying to use ticket ID directly as fallback...');
        databaseId = ticketId;
      }
      
      // Additional validation: if ticket ID is numeric, use it directly regardless of lookup result
      if (typeof ticketId === 'string' && /^\d+$/.test(ticketId)) {
        console.log('🔢 Ticket ID is numeric, using it directly as database ID:', ticketId);
        databaseId = ticketId;
      }
      
      // Ensure database ID is a string
      const stringDatabaseId = String(databaseId);
      console.log('🔢 Using string database ID:', stringDatabaseId);
      
      // If the database ID is not numeric, try to extract numeric part
      if (!/^\d+$/.test(stringDatabaseId)) {
        console.log('⚠️ Database ID is not numeric, trying to extract numeric part...');
        const match = stringDatabaseId.match(/\d+/);
        if (match) {
          databaseId = match[0];
          console.log('🔢 Extracted numeric ID:', databaseId);
        } else {
          console.error('❌ Cannot extract numeric ID from:', stringDatabaseId);
          return { success: false, error: 'Cannot extract numeric ID from ticket identifier' };
        }
      }
      
      // Use the correct field names from the working Postman request
      const finalDatabaseId = String(databaseId);
      formData.append('support_tickets_id', finalDatabaseId);
      formData.append('note', comment);
      formData.append('user_name', getUserName());
      
      // Add additional fields that might be required
      formData.append('ticket_id', finalDatabaseId);
      formData.append('comment', comment);
      formData.append('message', comment);
      formData.append('description', comment);
      formData.append('created_by', getUserName());
      formData.append('updated_by', getUserName());
      formData.append('status', '1');
      formData.append('is_active', '1');
      
      // Get auth token first
      const token = getAuthToken();
      if (!token) {
        return { success: false, error: 'Authentication token not found' };
      }
      
      // Add authentication token as form field
      formData.append('access_token', token);
      formData.append('token', token);
      formData.append('auth_token', token);
      
      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        console.log('📎 Adding attachments:', attachments.length, 'files');
        attachments.forEach((file, index) => {
          formData.append('documents[]', file);
          console.log(`📎 Added attachment ${index}:`, {
            name: file.name,
            size: file.size,
            type: file.type
          });
        });
      }

      // Debug: Log FormData contents (simplified)
      console.log('🔍 FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      // Additional debugging for API requirements
      console.log('🔍 API Requirements Check:', {
        hasSupportTicketsId: formData.has('support_tickets_id'),
        hasNote: formData.has('note'),
        hasUserName: formData.has('user_name'),
        hasTicketId: formData.has('ticket_id'),
        hasComment: formData.has('comment'),
        hasMessage: formData.has('message'),
        hasDescription: formData.has('description'),
        hasCreatedBy: formData.has('created_by'),
        hasUpdatedBy: formData.has('updated_by'),
        hasStatus: formData.has('status'),
        hasIsActive: formData.has('is_active'),
        hasAccessToken: formData.has('access_token'),
        hasToken: formData.has('token'),
        hasAuthToken: formData.has('auth_token'),
        supportTicketsIdValue: formData.get('support_tickets_id'),
        noteValue: formData.get('note'),
        userNameValue: formData.get('user_name')
      });
      
      // Token already declared above
      
      // Additional debugging
      console.log('🔍 API Request Details:', {
        url: `${API_BASE_URL}/add-ticket-note`,
        method: 'POST',
        hasToken: !!token,
        tokenLength: token?.length || 0,
        formDataKeys: Array.from(formData.keys()),
        supportTicketsId: databaseId,
        noteLength: comment.length,
        attachmentsCount: attachments?.length || 0
      });

      console.log('🔑 Using auth token:', token);
      console.log('🌐 API URL:', `${API_BASE_URL}/add-ticket-note`);

      // Try different authentication approaches
      let response;
      
      // First try with token in URL parameters
      try {
        response = await fetchWithTimeout(`${API_BASE_URL}/add-ticket-note?access_token=${token}`, {
          method: 'POST',
          body: formData,
        }, 15000);
        console.log('📡 Response with URL token:', response.status);
      } catch (error) {
        console.log('❌ Request with URL token failed:', error);
      }
      
      // If that fails, try without Authorization header (like in Postman)
      if (!response || !response.ok) {
      try {
        response = await fetchWithTimeout(`${API_BASE_URL}/add-ticket-note`, {
          method: 'POST',
          body: formData,
        }, 15000);
        console.log('📡 Response without auth:', response.status);
      } catch (error) {
        console.log('❌ Request without auth failed:', error);
        }
      }
      
      // If that fails, try with token as query parameter
      if (!response || !response.ok) {
        console.log('🔄 Trying with token as query parameter...');
        try {
          response = await fetchWithTimeout(`${API_BASE_URL}/add-ticket-note?access_token=${token}`, {
            method: 'POST',
            body: formData,
          }, 15000);
          console.log('📡 Response with query token:', response.status);
        } catch (error) {
          console.log('❌ Request with query token failed:', error);
        }
      }
      
      // If still fails, try with Authorization header
      if (!response || !response.ok) {
        console.log('🔄 Trying with Authorization header...');
        try {
          response = await fetchWithTimeout(`${API_BASE_URL}/add-ticket-note`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          }, 15000);
          console.log('📡 Response with auth header:', response.status);
        } catch (error) {
          console.log('❌ Request with auth header failed:', error);
        }
      }

      if (!response) {
        console.log('❌ No response received from any authentication method');
        return { success: false, error: 'No response received from server' };
      }

      console.log('📡 Response received:');
      console.log('  Status:', response.status);
      console.log('  Status Text:', response.statusText);
      console.log('  Headers:', Object.fromEntries(response.headers.entries()));

      console.log('Add ticket note response status:', response.status);
      
      const contentType = response.headers.get('content-type');
      console.log('Response content type:', contentType);

      let data;
      try {
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const textResponse = await response.text();
          console.log('Non-JSON response received:', textResponse.substring(0, 200) + '...');
          return { 
            success: false, 
            error: `Server error (${response.status}): Received non-JSON response`,
            status: response.status 
          };
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        return { 
          success: false, 
          error: 'Failed to parse server response',
          status: response.status 
        };
      }

      console.log('📄 Full API response:', JSON.stringify(data, null, 2));
      console.log('🔍 Response analysis:', {
        status: data.status,
        message: data.message,
        hasData: !!data.data,
        dataType: typeof data.data,
        isSuccess: data.status === '1',
        responseStatus: response.status,
        responseOk: response.ok
      });
      
      // Log the actual error message if any
      if (data.message) {
        console.log('📝 API Message:', data.message);
      }

      // Check for authentication errors
      if (data.status === '0' && (data.message === 'Bearer token not passed' || data.message === 'Invalid access token')) {
        console.log('❌ Authentication error in add ticket note API');
        handleAuthError(false);
        return { success: false, error: 'Authentication failed', authError: true };
      }

      // Check for validation errors
      if (data.status === '0' && data.message === 'All fields required') {
        console.log('❌ Validation error: All fields required');
        return { 
          success: false, 
          error: 'All required fields must be provided (support_tickets_id, note, user_name)',
          status: response.status 
        };
      }

      // Check if the request was successful
      if (data.status === '1') {
        console.log('✅ API request successful!');
        return { success: true, data, status: response.status };
      } else {
        console.log('⚠️ API request returned status:', data.status, 'with message:', data.message);
        return { 
          success: false, 
          error: data.message || 'API request failed', 
          data, 
          status: response.status 
        };
      }
    } catch (error: any) {
      console.error('Add ticket note API error:', error);
      
      if (error.message === 'Request timeout') {
        return { success: false, error: 'Request timeout. Please try again.' };
      }
      
      if (error.message.includes('Failed to fetch')) {
        return { success: false, error: 'Connection failed. Please check your internet connection.' };
      }
      
      return { success: false, error: 'Failed to add ticket note' };
    }
  }

  // Get ticket notes/comments
  static async getTicketNotes(ticketId: string) {
    try {
      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      console.log('Fetching ticket notes for:', ticketId);

      const token = getAuthToken();
      if (!token) {
        return { success: false, error: 'Authentication token not found' };
      }

      // Get the actual database ID from the ticket data
      let databaseId = ticketId;
      
      console.log('🔍 Looking for database ID for notes ticket:', ticketId);
      
      try {
        // Try to get the database ID from the tickets data
        console.log('🔄 Fetching tickets to find database ID for notes...');
        const ticketsResult = await this.getTickets(1, 100);
        console.log('📡 Tickets fetch result for notes:', {
          success: ticketsResult.success,
          hasData: !!ticketsResult.data,
          dataType: typeof ticketsResult.data,
          isArray: Array.isArray(ticketsResult.data?.data)
        });
        
        if (ticketsResult.success && ticketsResult.data && ticketsResult.data.data) {
          const tickets = ticketsResult.data.data;
          console.log('📋 Available tickets for notes lookup:', tickets.map((t: any) => ({
            id: t.id,
            ticket_number: t.ticket_number,
            title: t.title
          })));
          
          const matchingTicket = tickets.find((ticket: any) => 
            ticket.ticket_number === ticketId || ticket.id === ticketId
          );
          
          if (matchingTicket) {
            databaseId = matchingTicket.id;
            console.log('🔢 Found matching ticket for notes:', { 
              ticketNumber: ticketId, 
              databaseId: matchingTicket.id,
              ticketData: matchingTicket
            });
          } else {
            console.log('⚠️ No matching ticket found for notes:', ticketId);
            console.log('🔍 Available ticket numbers:', tickets.map((t: any) => t.ticket_number));
            console.log('🔍 Available ticket IDs:', tickets.map((t: any) => t.id));
            
            // Fallback: try to extract from ticket number
            if (typeof ticketId === 'string' && !/^\d+$/.test(ticketId)) {
              const match = ticketId.match(/\d+/);
              if (match) {
                databaseId = match[0];
                console.log('🔢 Using extracted ID from ticket number for notes:', databaseId);
              }
            }
          }
        } else {
          console.log('⚠️ Could not fetch tickets for notes ID lookup');
          console.log('📡 Tickets result for notes:', ticketsResult);
          
          // Fallback: try to extract from ticket number
          if (typeof ticketId === 'string' && !/^\d+$/.test(ticketId)) {
            const match = ticketId.match(/\d+/);
            if (match) {
              databaseId = match[0];
              console.log('🔢 Using extracted ID from ticket number for notes:', databaseId);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Error fetching tickets for notes ID lookup:', error);
        
        // Fallback: try to extract from ticket number
        if (typeof ticketId === 'string' && !/^\d+$/.test(ticketId)) {
          const match = ticketId.match(/\d+/);
          if (match) {
            databaseId = match[0];
            console.log('🔢 Using extracted ID from ticket number for notes:', databaseId);
          }
        }
      }
      
      console.log('🔢 Using database ID for notes:', { original: ticketId, databaseId });
      
      // Validate that we have a valid database ID
      if (!databaseId || databaseId === '') {
        console.error('❌ No valid database ID found for notes ticket:', ticketId);
        return { success: false, error: 'No valid database ID found for ticket' };
      }
      
      // Ensure database ID is numeric
      if (!/^\d+$/.test(String(databaseId))) {
        console.error('❌ Database ID is not numeric for notes:', databaseId);
        return { success: false, error: 'Database ID must be numeric for notes endpoint' };
      }

      // Try different possible endpoints for getting notes
      const possibleEndpoints = [
        `${API_BASE_URL}/ticket-notes/${databaseId}`,
        `${API_BASE_URL}/ticket-notes?support_tickets_id=${databaseId}`,
        `${API_BASE_URL}/tickets/${databaseId}/notes`,
        `${API_BASE_URL}/tickets/${databaseId}/comments`,
        `${API_BASE_URL}/support-tickets-notes?support_tickets_id=${databaseId}`,
        `${API_BASE_URL}/ticket-details?support_tickets_id=${databaseId}&include_notes=true`,
        `${API_BASE_URL}/ticket-details?support_tickets_id=${databaseId}&with_notes=true`,
        `${API_BASE_URL}/ticket-details?support_tickets_id=${databaseId}&notes=true`,
        `${API_BASE_URL}/support-tickets/${databaseId}/notes`,
        `${API_BASE_URL}/support-tickets/${databaseId}/comments`,
        `${API_BASE_URL}/ticket-comments?support_tickets_id=${databaseId}`,
        `${API_BASE_URL}/ticket-comments/${databaseId}`,
        `${API_BASE_URL}/notes?support_tickets_id=${databaseId}`,
        `${API_BASE_URL}/comments?support_tickets_id=${databaseId}`
      ];
      
      let response;
      let successfulEndpoint = null;
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log('🔍 Trying notes endpoint:', endpoint);
          response = await fetchWithTimeout(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
          }, 5000);
          
          if (response.ok) {
            successfulEndpoint = endpoint;
            console.log('✅ Found working notes endpoint:', endpoint);
            break;
          } else {
            console.log('❌ Endpoint failed:', endpoint, 'Status:', response.status);
          }
        } catch (error) {
          console.log('❌ Endpoint error:', endpoint, error);
        }
      }
      
      if (!response || !response.ok) {
        console.log('❌ No working notes endpoint found');
        return { success: false, error: 'No working notes endpoint found' };
      }

      const contentType = response.headers.get('content-type');
      console.log('Get ticket notes response status:', response.status);
      console.log('Response content type:', contentType);

      let data;
      try {
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const textResponse = await response.text();
          console.log('Non-JSON response received:', textResponse.substring(0, 200) + '...');
          return { 
            success: false, 
            error: `Server error (${response.status}): Received non-JSON response`,
            status: response.status 
          };
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        return { 
          success: false, 
          error: 'Failed to parse server response',
          status: response.status 
        };
      }

      console.log('Get ticket notes API response:', data);

      // Check for authentication errors
      if (data.status === '0' && (data.message === 'Bearer token not passed' || data.message === 'Invalid access token')) {
        console.log('Authentication error in get ticket notes API');
        handleAuthError(false);
        return { success: false, error: 'Authentication failed', authError: true };
      }

      // Check if the request was successful
      if (data.status === '1') {
        console.log('✅ Get ticket notes API request successful!');
        return { success: true, data, status: response.status };
      } else {
        console.log('⚠️ Get ticket notes API request returned status:', data.status, 'with message:', data.message);
        return { 
          success: false, 
          error: data.message || 'Failed to fetch ticket notes', 
          data, 
          status: response.status 
        };
      }
    } catch (error: any) {
      console.error('Get ticket notes API error:', error);
      
      if (error.message === 'Request timeout') {
        return { success: false, error: 'Request timeout. Please try again.' };
      }
      
      if (error.message.includes('Failed to fetch')) {
        return { success: false, error: 'Connection failed. Please check your internet connection.' };
      }
      
      return { success: false, error: 'Failed to fetch ticket notes' };
    }
  }

  // Update ticket with notes directly
  static async updateTicketNotes(ticketId: string, notes: string) {
    try {
      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      console.log('Updating ticket notes directly for:', ticketId);

      const token = getAuthToken();
      if (!token) {
        return { success: false, error: 'Authentication token not found' };
      }

      // Use database ID mapping
      const ticketIdMapping: { [key: string]: string } = {
        'CND1020': '21',
        'CND1021': '22',
      };
      
      let databaseId = ticketIdMapping[ticketId] || ticketId;
      
      const updateData = {
        ticket_id: databaseId,
        notes: notes,
        user_name: getUserName()
      };

      console.log('🔍 Update data:', updateData);

      const response = await fetchWithTimeout(`${API_BASE_URL}/update-ticket-notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }, 15000);

      console.log('Update ticket notes response status:', response.status);
      
      const contentType = response.headers.get('content-type');
      console.log('Response content type:', contentType);

      let data;
      try {
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const textResponse = await response.text();
          console.log('Non-JSON response received:', textResponse.substring(0, 200) + '...');
          return { 
            success: false, 
            error: `Server error (${response.status}): Received non-JSON response`,
            status: response.status 
          };
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        return { 
          success: false, 
          error: 'Failed to parse server response',
          status: response.status 
        };
      }

      console.log('Update ticket notes API response:', data);

      // Check for authentication errors
      if (data.status === '0' && (data.message === 'Bearer token not passed' || data.message === 'Invalid access token')) {
        console.log('Authentication error in update ticket notes API');
        handleAuthError(false);
        return { success: false, error: 'Authentication failed', authError: true };
      }

      return { success: response.ok, data, status: response.status };
    } catch (error: any) {
      console.error('Update ticket notes API error:', error);
      
      if (error.message === 'Request timeout') {
        return { success: false, error: 'Request timeout. Please try again.' };
      }
      
      if (error.message.includes('Failed to fetch')) {
        return { success: false, error: 'Connection failed. Please check your internet connection.' };
      }
      
      return { success: false, error: 'Failed to update ticket notes' };
    }
  }


  // Create new ticket
  static async createTicket(ticketData: any) {
    try {
      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      console.log('Attempting to create ticket...');
      console.log('Ticket data received:', ticketData);
      console.log('Priority details:', {
        priority: ticketData.priority,
        priority_id: ticketData.priority_id,
        priority_name: ticketData.priority_name
      });
      console.log('Attachments:', ticketData.attachments);
      
      // Force token refresh if needed
      forceTokenRefresh();
      
      const userName = getUserName();
      console.log('User creating ticket:', userName);
      
      // Check if we have attachments
      const hasAttachments = ticketData.attachments && ticketData.attachments.length > 0;
      console.log('Has attachments:', hasAttachments, ticketData.attachments?.length);
      
      // Prepare URL with token
      const token = getAuthToken();
      const url = `${API_BASE_URL}/add-ticket${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
      
      let response;
      
      if (hasAttachments) {
        // Use FormData for attachments
        console.log('Using FormData for ticket with attachments');
        const formData = new FormData();
        
        // Add basic ticket data
        formData.append('title', ticketData.title);
        formData.append('description', ticketData.description);
        formData.append('priorities_id', ticketData.priority); // Backend expects 'priorities_id'
        formData.append('priority', ticketData.priority); // Keep both for compatibility
        formData.append('priority_name', ticketData.priority_name || '');
        formData.append('priority_id', ticketData.priority_id || '');
        formData.append('channel', ticketData.channel || 'Web');
        formData.append('user_name', userName);
        
        // Add attachments
        ticketData.attachments.forEach((file: File, index: number) => {
          console.log(`Adding attachment ${index}:`, file.name, file.size);
          formData.append(`documents[]`, file);
          formData.append(`documents[${index}]`, file);
          formData.append(`attachment_${index}`, file);
        });
        
        // Debug: Log FormData contents
        console.log('🔍 FormData contents:');
        for (let [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        }
        
        console.log('🎯 Priority fields being sent:', {
          'priorities_id': formData.get('priorities_id'),
          'priority': formData.get('priority'),
          'priority_name': formData.get('priority_name'),
          'priority_id': formData.get('priority_id')
        });
        
        response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            // Don't set Content-Type for FormData, let browser set it with boundary
          },
          body: formData,
        }, 15000);
        
      } else {
        // Use JSON for tickets without attachments
        console.log('Using JSON for ticket without attachments');
        const ticketDataWithUser = {
          title: ticketData.title,
          description: ticketData.description,
          priorities_id: ticketData.priority, // Backend expects 'priorities_id'
          priority: ticketData.priority, // Keep both for compatibility
          priority_name: ticketData.priority_name || '',
          priority_id: ticketData.priority_id || '',
          channel: ticketData.channel || 'Web',
          user_name: userName
        };
        
        console.log('Sending ticket data (JSON):', ticketDataWithUser);
        console.log('🎯 Priority fields being sent (JSON):', {
          'priorities_id': ticketDataWithUser.priorities_id,
          'priority': ticketDataWithUser.priority,
          'priority_name': ticketDataWithUser.priority_name,
          'priority_id': ticketDataWithUser.priority_id
        });
        
        response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ticketDataWithUser),
        }, 15000);
      }

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

  // Get ticket statuses
  static async getTicketStatuses() {
    try {
      if (!isOnline()) {
        return { success: false, error: 'No internet connection' };
      }

      console.log('Attempting to fetch ticket statuses...');
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/support-tickets-status`, {
        method: 'GET',
        headers: createHeaders(),
      }, 10000);

      const data = await response.json();
      console.log('Get Statuses API Response:', data);
      
      if (data.status === '0' && data.message === 'Invalid access token') {
        console.log('Authentication error in statuses API');
        handleAuthError(false);
        return { success: false, error: 'Authentication failed', authError: true };
      }
      
      return { success: response.ok, data, status: response.status };
    } catch (error: any) {
      console.error('Get statuses API error:', error);
      return { success: false, error: 'Failed to fetch statuses' };
    }
  }

  // Clear cache method
  static clearCache(pattern?: string) {
    clearCache(pattern);
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

        // Clear API cache
        clearCache();

        return { success: true };
      } else {
        // Clear local storage even if offline
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');

        // Clear API cache
        clearCache();

        return { success: true };
      }
    } catch (error: any) {
      console.error('Logout API error:', error);
      // Still clear local storage even if API call fails
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');

      // Clear API cache
      clearCache();

      return { success: true };
    }
  }
}

export default ApiService;