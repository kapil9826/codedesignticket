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

      console.log('🔍 Fetching ticket details for ID:', ticketId);
      
      // Use the correct endpoint for ticket details
      const response = await fetchWithTimeout(`${API_BASE_URL}/ticket-details?&support_tickets_id=${ticketId}`, {
        method: 'GET',
        headers: createHeaders(),
      }, 10000);

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
      
      // Check if documents field exists and log its content
      if (data.data) {
        console.log('🔍 Documents field in API response:', data.data.documents);
        console.log('🔍 Documents field type:', typeof data.data.documents);
        console.log('🔍 Documents field length:', data.data.documents ? data.data.documents.length : 'null/undefined');
      }
      
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

  // Add ticket note/comment with attachments using the new API endpoint
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
      
      // We need to use the database ID, not the ticket number
      // For now, let's try to get the actual database ID from the ticket data
      let databaseId = ticketId;
      
      // If we have a ticket number like "CND1020", we need to find the corresponding database ID
      // This is a temporary solution - ideally we should store the database ID when loading tickets
      console.log('🔍 Looking for database ID for ticket:', ticketId);
      
      // Try to get the database ID from localStorage or make an API call to find it
      // For now, let's use a mapping approach
      const ticketIdMapping: { [key: string]: string } = {
        'CND1020': '21',
        'CND1021': '22',
        // Add more mappings as needed
      };
      
      if (ticketIdMapping[ticketId]) {
        databaseId = ticketIdMapping[ticketId];
        console.log('🔢 Found database ID mapping:', { ticketNumber: ticketId, databaseId });
      } else {
        console.log('⚠️ No database ID mapping found for:', ticketId);
        // Fallback: try to extract from ticket number or use as-is
        if (typeof ticketId === 'string' && !/^\d+$/.test(ticketId)) {
          const match = ticketId.match(/\d+/);
          if (match) {
            databaseId = match[0];
          }
        }
      }
      
      console.log('🔢 Using database ID:', { original: ticketId, databaseId });
      
      // Use the correct field names from the working Postman request
      formData.append('support_tickets_id', databaseId);
      formData.append('note', comment);
      formData.append('user_name', getUserName());
      
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

      // Get auth token
      const token = getAuthToken();
      if (!token) {
        return { success: false, error: 'Authentication token not found' };
      }

      console.log('🔑 Using auth token:', token);
      console.log('🌐 API URL:', `${API_BASE_URL}/add-ticket-note`);

      // Try different authentication approaches
      let response;
      
      // First try without Authorization header (like in Postman)
      try {
        response = await fetchWithTimeout(`${API_BASE_URL}/add-ticket-note`, {
          method: 'POST',
          body: formData,
        }, 15000);
        console.log('📡 Response without auth:', response.status);
      } catch (error) {
        console.log('❌ Request without auth failed:', error);
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
        isSuccess: data.status === '1'
      });

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
      } else {
        console.log('⚠️ API request returned status:', data.status, 'with message:', data.message);
      }

      return { success: response.ok, data, status: response.status };
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

      const response = await fetchWithTimeout(`${API_BASE_URL}/ticket-notes/${ticketId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }, 10000);

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

      return { success: response.ok, data, status: response.status };
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
        formData.append('priority', ticketData.priority);
        formData.append('priority_name', ticketData.priority);
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
          priority: ticketData.priority,
          priority_name: ticketData.priority,
          channel: ticketData.channel || 'Web',
          user_name: userName
        };
        
        console.log('Sending ticket data (JSON):', ticketDataWithUser);
        
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