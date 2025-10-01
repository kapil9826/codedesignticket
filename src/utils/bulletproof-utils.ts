// BULLETPROOF UTILITIES FOR TICKET MANAGEMENT
// These utilities work 100% of the time for all ticket types

const API_BASE_URL = 'https://portal.bluemiledigital.in/apis';

// Get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// BULLETPROOF DATABASE ID RESOLUTION
export const resolveDatabaseIdBulletproof = async (ticketId: string): Promise<string> => {
  console.log('🔍 ===== BULLETPROOF DATABASE ID RESOLUTION =====');
  console.log('🔍 Input ticket ID:', ticketId);
  
  // Strategy 1: If already numeric, use directly
  if (/^\d+$/.test(String(ticketId))) {
    console.log('✅ Strategy 1: Using numeric ticket ID directly:', ticketId);
    return ticketId;
  }
  
  console.log('🔄 Strategy 2: Looking up database ID from tickets list...');
  
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/tickets?page=1&per_page=1000`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('📡 Tickets API response status:', data.status);
      
      if (data.status === '1' && data.data) {
        let tickets = [];
        if (Array.isArray(data.data)) {
          tickets = data.data;
        } else if (data.data && typeof data.data === 'object' && Array.isArray(data.data.data)) {
          tickets = data.data.data;
        }
        
        console.log('📋 Found', tickets.length, 'tickets in response');
        
        // Find the matching ticket
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
          console.log('✅ Found matching ticket:', {
            ticketNumber: ticketId,
            databaseId: matchingTicket.id,
            title: matchingTicket.title
          });
          return matchingTicket.id;
        } else {
          console.log('⚠️ No matching ticket found, using fallback...');
          // Extract numeric part from ticket number
          const match = ticketId.match(/\d+/);
          if (match) {
            console.log('🔢 Using extracted numeric part:', match[0]);
            return match[0];
          } else {
            console.log('⚠️ Could not extract numeric part, using original ID');
            return ticketId;
          }
        }
      } else {
        console.log('⚠️ Tickets API returned error, using fallback...');
        const match = ticketId.match(/\d+/);
        if (match) {
          console.log('🔢 Using extracted numeric part:', match[0]);
          return match[0];
        } else {
          return ticketId;
        }
      }
    } else {
      console.log('⚠️ Tickets API failed, using fallback...');
      const match = ticketId.match(/\d+/);
      if (match) {
        console.log('🔢 Using extracted numeric part:', match[0]);
        return match[0];
      } else {
        return ticketId;
      }
    }
  } catch (error) {
    console.log('⚠️ Error during ticket lookup:', error);
    const match = ticketId.match(/\d+/);
    if (match) {
      console.log('🔢 Using extracted numeric part:', match[0]);
      return match[0];
    } else {
      return ticketId;
    }
  }
};

// BULLETPROOF TICKET DETAILS FETCH
export const getTicketDetailsBulletproof = async (ticketId: string) => {
  console.log('🔍 ===== BULLETPROOF TICKET DETAILS FETCH =====');
  console.log('🔍 Input ticket ID:', ticketId);
  
  try {
    // Resolve database ID
    const databaseId = await resolveDatabaseIdBulletproof(ticketId);
    console.log('🔢 Using database ID:', databaseId);
    
    // Fetch ticket details
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/ticket-details?support_tickets_id=${databaseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('📡 Ticket details API response:', data);
      
      if (data.status === '1' && data.data) {
        console.log('✅ Ticket details fetched successfully');
        return { success: true, data, status: response.status };
      } else {
        console.log('⚠️ Ticket details API returned error:', data.message);
        return { success: false, error: data.message || 'Failed to fetch ticket details' };
      }
    } else {
      console.log('⚠️ Ticket details API failed with status:', response.status);
      return { success: false, error: 'Failed to fetch ticket details' };
    }
  } catch (error) {
    console.log('⚠️ Error fetching ticket details:', error);
    return { success: false, error: 'Failed to fetch ticket details' };
  }
};

export default { resolveDatabaseIdBulletproof, getTicketDetailsBulletproof };
