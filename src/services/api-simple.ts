// SIMPLIFIED API SERVICE FOR TICKET COMMENTS
// This is a backup/alternative approach to fix the comment functionality

const API_BASE_URL = 'https://portal.bluemiledigital.in/apis';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  const token = localStorage.getItem('authToken');
  return token;
};

// Get user name from localStorage
const getUserName = (): string => {
  return localStorage.getItem('userName') || 'User';
};

// Check if online
const isOnline = (): boolean => {
  return navigator.onLine;
};

// Create headers
const createHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

// SIMPLIFIED ADD TICKET NOTE FUNCTION
export const addTicketNoteSimple = async (ticketId: string, comment: string, attachments?: File[]) => {
  console.log('🚀 ===== SIMPLIFIED ADD TICKET NOTE =====');
  console.log('🔍 Input:', { ticketId, comment: comment.substring(0, 50) + '...', attachments: attachments?.length || 0 });
  
  try {
    if (!isOnline()) {
      return { success: false, error: 'No internet connection' };
    }

    // SIMPLIFIED DATABASE ID RESOLUTION
    let databaseId = ticketId;
    
    // If ticket ID is numeric, use it directly
    if (/^\d+$/.test(String(ticketId))) {
      console.log('✅ Using numeric ticket ID directly:', ticketId);
      databaseId = ticketId;
    } else {
      console.log('🔄 Looking up database ID for:', ticketId);
      
      try {
        // Get tickets to find the database ID
        const response = await fetch(`${API_BASE_URL}/tickets?page=1&per_page=1000`, {
          method: 'GET',
          headers: createHeaders(),
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.status === '1' && data.data) {
            let tickets = [];
            if (Array.isArray(data.data)) {
              tickets = data.data;
            } else if (data.data && typeof data.data === 'object' && Array.isArray(data.data.data)) {
              tickets = data.data.data;
            }
            
            console.log('📋 Found', tickets.length, 'tickets');
            
            // Find matching ticket
            const matchingTicket = tickets.find((ticket: any) => 
              ticket.ticket_number === ticketId || ticket.id === ticketId
            );
            
            if (matchingTicket) {
              databaseId = matchingTicket.id;
              console.log('✅ Found matching ticket:', {
                ticketNumber: ticketId,
                databaseId: matchingTicket.id
              });
            } else {
              console.log('⚠️ No matching ticket found, using fallback...');
              const match = ticketId.match(/\d+/);
              if (match) {
                databaseId = match[0];
                console.log('🔢 Using extracted numeric part:', databaseId);
              }
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Error during ticket lookup:', error);
        const match = ticketId.match(/\d+/);
        if (match) {
          databaseId = match[0];
          console.log('🔢 Using extracted numeric part:', databaseId);
        }
      }
    }
    
    console.log('🔢 Final database ID:', databaseId);
    
    // Create form data
    const formData = new FormData();
    formData.append('support_tickets_id', String(databaseId));
    formData.append('note', comment);
    formData.append('user_name', getUserName());
    
    // Add additional fields that might be required
    formData.append('ticket_id', String(databaseId));
    formData.append('comment', comment);
    formData.append('message', comment);
    formData.append('description', comment);
    formData.append('created_by', getUserName());
    formData.append('updated_by', getUserName());
    formData.append('status', '1');
    formData.append('is_active', '1');
    
    // Add attachments if any
    if (attachments && attachments.length > 0) {
      attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });
    }
    
    console.log('🔄 Calling add-ticket-note API...');
    
    // Call the API
    const response = await fetch(`${API_BASE_URL}/add-ticket-note`, {
      method: 'POST',
      body: formData,
    });
    
    console.log('📡 API Response Status:', response.status);
    
    const result = await response.json();
    console.log('📄 API Response:', result);
    
    if (result.status === '1') {
      console.log('✅ Comment added successfully!');
      return { success: true, data: result, status: response.status };
    } else {
      console.log('❌ API returned error:', result.message);
      return { success: false, error: result.message || 'Failed to add comment' };
    }
    
  } catch (error) {
    console.error('❌ Error adding ticket note:', error);
    return { success: false, error: 'Failed to add comment' };
  }
};

export default { addTicketNoteSimple };
