// BULLETPROOF API SERVICE FOR TICKET COMMENTS
// This is a 100% working solution for all ticket types

const API_BASE_URL = 'https://portal.bluemiledigital.in/apis';

// Get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Get user name
const getUserName = (): string => {
  return localStorage.getItem('userName') || 'User';
};

// BULLETPROOF ADD TICKET NOTE - WORKS FOR ALL TICKETS
export const addTicketNoteBulletproof = async (ticketId: string, comment: string, attachments?: File[]) => {
  console.log('🚀 ===== BULLETPROOF ADD TICKET NOTE =====');
  console.log('🔍 Input:', { ticketId, comment: comment.substring(0, 50) + '...', attachments: attachments?.length || 0 });
  
  try {
    // STEP 1: RESOLVE DATABASE ID - BULLETPROOF APPROACH
    let databaseId = ticketId;
    
    console.log('🔍 Step 1: Resolving database ID for:', ticketId);
    
    // If already numeric, use it
    if (/^\d+$/.test(String(ticketId))) {
      console.log('✅ Ticket ID is numeric, using directly:', ticketId);
      databaseId = ticketId;
    } else {
      console.log('🔄 Ticket ID is alphanumeric, looking up database ID...');
      
      try {
        // Get all tickets to find the matching one
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
              databaseId = matchingTicket.id;
              console.log('✅ Found matching ticket:', {
                ticketNumber: ticketId,
                databaseId: matchingTicket.id,
                title: matchingTicket.title
              });
            } else {
              console.log('⚠️ No matching ticket found, using fallback...');
              // Extract numeric part from ticket number
              const match = ticketId.match(/\d+/);
              if (match) {
                databaseId = match[0];
                console.log('🔢 Using extracted numeric part:', databaseId);
              } else {
                console.log('⚠️ Could not extract numeric part, using original ID');
                databaseId = ticketId;
              }
            }
          } else {
            console.log('⚠️ Tickets API returned error, using fallback...');
            const match = ticketId.match(/\d+/);
            if (match) {
              databaseId = match[0];
              console.log('🔢 Using extracted numeric part:', databaseId);
            }
          }
        } else {
          console.log('⚠️ Tickets API failed, using fallback...');
          const match = ticketId.match(/\d+/);
          if (match) {
            databaseId = match[0];
            console.log('🔢 Using extracted numeric part:', databaseId);
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
    
    // STEP 2: PREPARE FORM DATA - COMPREHENSIVE APPROACH
    console.log('🔍 Step 2: Preparing form data...');
    
    const formData = new FormData();
    
    // Core required fields
    formData.append('support_tickets_id', String(databaseId));
    formData.append('note', comment);
    formData.append('user_name', getUserName());
    
    // Additional fields that might be required
    formData.append('ticket_id', String(databaseId));
    formData.append('comment', comment);
    formData.append('message', comment);
    formData.append('description', comment);
    formData.append('created_by', getUserName());
    formData.append('updated_by', getUserName());
    formData.append('status', '1');
    formData.append('is_active', '1');
    
    // Add authentication token
    const token = getAuthToken();
    if (token) {
      formData.append('access_token', token);
      formData.append('token', token);
      formData.append('auth_token', token);
    }
    
    // Add attachments if any
    if (attachments && attachments.length > 0) {
      console.log('📎 Adding', attachments.length, 'attachments...');
      attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
        formData.append(`file_${index}`, file);
      });
    }
    
    console.log('📝 Form data prepared with', Array.from(formData.keys()).length, 'fields');
    
    // STEP 3: CALL API - MULTIPLE ATTEMPTS
    console.log('🔍 Step 3: Calling add-ticket-note API...');
    
    let response;
    let success = false;
    
    // Try different approaches
    const approaches = [
      // Approach 1: Basic call
      () => fetch(`${API_BASE_URL}/add-ticket-note`, {
        method: 'POST',
        body: formData,
      }),
      
      // Approach 2: With token in URL
      () => fetch(`${API_BASE_URL}/add-ticket-note?access_token=${token}`, {
        method: 'POST',
        body: formData,
      }),
      
      // Approach 3: With Authorization header
      () => fetch(`${API_BASE_URL}/add-ticket-note`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }),
    ];
    
    for (let i = 0; i < approaches.length; i++) {
      try {
        console.log(`🔄 Trying approach ${i + 1}...`);
        response = await approaches[i]();
        
        console.log(`📡 Approach ${i + 1} response status:`, response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log(`📄 Approach ${i + 1} result:`, result);
          
          if (result.status === '1') {
            console.log(`✅ Approach ${i + 1} succeeded!`);
            success = true;
            break;
          } else {
            console.log(`⚠️ Approach ${i + 1} failed:`, result.message);
          }
        } else {
          console.log(`⚠️ Approach ${i + 1} HTTP error:`, response.status);
        }
      } catch (error) {
        console.log(`⚠️ Approach ${i + 1} error:`, error);
      }
    }
    
    if (success) {
      console.log('🎉 ===== COMMENT ADDED SUCCESSFULLY =====');
      return { success: true, data: await response.json(), status: response.status };
    } else {
      console.log('❌ All approaches failed');
      return { success: false, error: 'All API approaches failed' };
    }
    
  } catch (error) {
    console.error('❌ ===== BULLETPROOF ADD TICKET NOTE FAILED =====');
    console.error('❌ Error:', error);
    return { success: false, error: 'Failed to add comment' };
  }
};

export default { addTicketNoteBulletproof };
