import React, { useState, useEffect } from 'react';
import TicketDetail from '../TicketDetail/TicketDetail';
import ApiService from '../../services/api';
import './TicketList.css';

interface Ticket {
  id: string;
  requester: string;
  issue: string;
  time: string;
  badge?: number;
  status: 'Active' | 'Closed' | 'On-hold' | 'Overdue' | 'Assigned' | 'Suspend';
  priority: 'Low' | 'High';
  description?: string;
  attachments?: number;
  createdAt?: string;
  priorityBgColor?: string;
  priorityTextColor?: string;
}

// Mock data removed - using only API data

const TicketList: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const ticketsPerPage = 50;

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Closed', label: 'Closed' },
    { value: 'On-hold', label: 'On-hold' },
    { value: 'Overdue', label: 'Overdue' },
    { value: 'Assigned', label: 'Assigned' },
    { value: 'Suspend', label: 'Suspend' }
  ];

  // Fetch tickets from API with improved error handling
  const fetchTickets = async (isRetry: boolean = false) => {
    if (isRetry) {
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);
    } else {
    setLoading(true);
    setError('');
    }
    
    // Use API data instead of mock data
    try {
      console.log('Fetching tickets from API...', {
        currentPage,
        ticketsPerPage,
        user: localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData') || '{}') : 'No user data'
      });
        const result = await ApiService.getTickets(currentPage, ticketsPerPage);
        
      console.log('🔍 Full API result:', result);
      console.log('🔍 result.success:', result.success);
      console.log('🔍 result.data:', result.data);
      console.log('🔍 result.data.status:', result.data?.status);
      console.log('🔍 result.data.data:', result.data?.data);
      
      if (result.success && result.data && result.data.status === '1' && result.data.data) {
          console.log('Raw API response data:', result.data);
        console.log('API response structure:', {
          status: result.data.status,
          message: result.data.message,
          data: result.data.data,
          links: result.data.links,
          dataType: typeof result.data.data,
          isArray: Array.isArray(result.data.data)
        });
        
        // Process API data directly
        console.log('🔍 Debugging API data access:');
        console.log('result.data:', result.data);
        console.log('result.data.data:', result.data.data);
        console.log('Array.isArray(result.data.data):', Array.isArray(result.data.data));
        console.log('result.data.data.length:', result.data.data?.length);
        
        // Try multiple ways to access the data
        let apiTickets = [];
        if (Array.isArray(result.data.data)) {
          apiTickets = result.data.data;
          console.log('✅ Using result.data.data directly');
        } else if (result.data.data && typeof result.data.data === 'object') {
          console.log('⚠️ result.data.data is object, checking for array property...');
          console.log('Object keys:', Object.keys(result.data.data));
          if (Array.isArray(result.data.data.data)) {
            apiTickets = result.data.data.data;
            console.log('✅ Using result.data.data.data');
          }
        }
        
        console.log('Final apiTickets:', apiTickets);
        console.log('apiTickets.length:', apiTickets.length);
        
        if (apiTickets.length > 0) {
          console.log('✅ API Data Processing:', {
            totalTickets: apiTickets.length,
            firstTicket: apiTickets[0],
            allFields: Object.keys(apiTickets[0] || {}),
            hasStatus: 'status' in (apiTickets[0] || {}),
            hasPriority: 'priority_name' in (apiTickets[0] || {}),
            hasTicketNumber: 'ticket_number' in (apiTickets[0] || {})
          });
          console.log('Processing API tickets...', `Found ${apiTickets.length} tickets`);
          const transformedTickets: Ticket[] = apiTickets.map((ticket: any, index: number) => {
            console.log(`Processing ticket ${index + 1}:`, {
              id: ticket.ticket_number,
              title: ticket.title,
              priority: ticket.priority_name,
              priorityBg: ticket.priority_bg_color,
              priorityText: ticket.priority_text_color,
              status: ticket.status,
              allFields: Object.keys(ticket),
              fullTicket: ticket
            });
            
            // Debug priority mapping specifically
            console.log(`🔍 Priority mapping for ticket ${ticket.ticket_number}:`, {
              'ticket.priority_name': ticket.priority_name,
              'ticket.priority': ticket.priority,
              'ticket.priority_id': ticket.priority_id,
              'ticket.priority_level': ticket.priority_level,
              'ticket.priority_value': ticket.priority_value,
              'All ticket keys': Object.keys(ticket),
              'Priority-related fields': Object.keys(ticket).filter(key => key.toLowerCase().includes('priority'))
            });
            // Check if we have a locally stored priority for this ticket
            const localPriorities = JSON.parse(localStorage.getItem('ticketPriorities') || '{}');
            const localPriority = localPriorities[ticket.ticket_number || ticket.id];
            
            const finalPriority = localPriority || ticket.priority_name || ticket.priority || 'Low';
            console.log(`🎯 Final priority for ${ticket.ticket_number}:`, {
              'ticket.priority_name': ticket.priority_name,
              'ticket.priority': ticket.priority,
              'localPriority': localPriority,
              'finalPriority': finalPriority
            });
            
            return {
              id: ticket.ticket_number || ticket.id || `TC-${ticket.id}`,
              requester: ticket.user_name || 'Unknown',
              issue: ticket.title || 'No description',
              time: ticket.created_at || new Date().toLocaleTimeString(),
              status: ticket.status || 'Active', // Use API status if available, default to Active
              priority: finalPriority,
              badge: 0,
              description: ticket.description || 'No description available',
              attachments: ticket.documents ? ticket.documents.length : 0,
              createdAt: ticket.created_at || new Date().toLocaleDateString(),
              priorityBgColor: (() => {
                switch (finalPriority.toLowerCase()) {
                  case 'high':
                    return '#ef4444';
                  case 'low':
                    return '#10b981';
                  default:
                    return ticket.priority_bg_color || '#e2e8f0';
                }
              })(),
              priorityTextColor: (() => {
                switch (finalPriority.toLowerCase()) {
                  case 'high':
                  case 'low':
                    return 'white';
                  default:
                    return ticket.priority_text_color || '#4a5568';
                }
              })()
            };
          });
          
          console.log('✅ Transformed API Tickets:', {
            count: transformedTickets.length,
            sample: transformedTickets[0],
            allIds: transformedTickets.map(t => t.id),
            allPriorities: transformedTickets.map(t => t.priority),
            allStatuses: transformedTickets.map(t => t.status)
          });
          
          // Add offline tickets to the list
          const offlineTickets = JSON.parse(localStorage.getItem('offlineTickets') || '[]');
          const offlineTransformedTickets = offlineTickets.map((ticket: any) => {
            console.log('🔍 Processing offline ticket:', {
              id: ticket.id,
              title: ticket.title,
              priority: ticket.priority,
              priority_name: ticket.priority_name,
              allTicketData: ticket
            });
            
            const priority = ticket.priority || ticket.priority_name || 'Low';
            const getPriorityColors = (priority: string) => {
              switch (priority.toLowerCase()) {
                case 'high':
                  return { bg: '#ef4444', text: 'white' };
                case 'low':
                  return { bg: '#10b981', text: 'white' };
                default:
                  return { bg: '#e2e8f0', text: '#4a5568' };
              }
            };
            
            const colors = getPriorityColors(priority);
            
            return {
              id: ticket.id,
              requester: ticket.user_name || 'Offline User',
              issue: ticket.title || 'No description',
              time: new Date(ticket.created_at).toLocaleTimeString(),
              status: ticket.status || 'Created',
              priority: priority,
              badge: 0,
              description: ticket.description || 'No description available',
              attachments: 0,
              createdAt: new Date(ticket.created_at).toLocaleDateString(),
              priorityBgColor: colors.bg,
              priorityTextColor: colors.text,
              isOffline: true
            };
          });
          
          const allTickets = [...transformedTickets, ...offlineTransformedTickets];
          
          setTickets(allTickets);
          setTotalTickets(allTickets.length);
          setTotalPages(result.data.links || 1);
          setError('');
          setLoading(false);
          setIsRetrying(false);
          
          console.log('✅ Successfully loaded tickets:', {
            count: transformedTickets.length,
            tickets: transformedTickets.map(t => ({ id: t.id, title: t.issue, priority: t.priority }))
          });
          return;
        } else {
          console.log('❌ No tickets found in API response');
          setTickets([]);
          setTotalTickets(0);
          setTotalPages(1);
          setError('No tickets found');
          setLoading(false);
          setIsRetrying(false);
          return;
        }
        } else {
          if (result.authError) {
            console.log('Authentication error, user will be redirected to login');
            return;
          }
      
        // Show error message for API failures
        console.log('API response structure:', result.data);
          setError(result.data?.message || result.error || 'Failed to load tickets');
          console.log('Failed to load tickets:', result.data);
        setTickets([]);
        setTotalTickets(0);
        setTotalPages(1);
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
      setError('Network error. Please check your connection and try again.');
      setTickets([]);
      setTotalTickets(0);
      setTotalPages(0);
      } finally {
        setLoading(false);
      setIsRetrying(false);
      }
    };

  // Load tickets on component mount and when page changes
  useEffect(() => {
    fetchTickets();
  }, [currentPage]);

  // Auto-refresh tickets every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing tickets...');
      fetchTickets();
    }, 30000);

    return () => clearInterval(interval);
  }, [currentPage]);

  // Filter tickets based on search and status
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.issue.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Debug: Log what tickets are being displayed
  console.log('🔍 Current tickets being displayed:', {
    totalTickets: tickets.length,
    filteredTickets: filteredTickets.length,
    sampleTickets: tickets.slice(0, 3).map(t => ({
      id: t.id,
      title: t.issue,
      priority: t.priority,
      status: t.status,
      isOffline: t.isOffline
    })),
    allTicketIds: tickets.map(t => t.id),
    allTicketTitles: tickets.map(t => t.issue)
  });

  // Debug: Check localStorage for any cached data
  console.log('🔍 localStorage check:', {
    offlineTickets: JSON.parse(localStorage.getItem('offlineTickets') || '[]'),
    ticketPriorities: JSON.parse(localStorage.getItem('ticketPriorities') || '{}'),
    userData: localStorage.getItem('userData'),
    authToken: localStorage.getItem('authToken')
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicket(ticketId);
  };

  const handleCloseDetail = () => {
    setSelectedTicket(null);
  };

  // Manual priority override for testing
  const overrideTicketPriority = (ticketId: string, priority: string) => {
    const localPriorities = JSON.parse(localStorage.getItem('ticketPriorities') || '{}');
    localPriorities[ticketId] = priority;
    localStorage.setItem('ticketPriorities', JSON.stringify(localPriorities));
    console.log('🔧 Manually set priority:', { ticketId, priority });
    // Refresh the ticket list
    fetchTickets();
  };

  const handleRetry = () => {
    fetchTickets(true);
  };

  const clearCachedData = () => {
    console.log('🧹 Clearing cached data...');
    localStorage.removeItem('offlineTickets');
    localStorage.removeItem('ticketPriorities');
    console.log('✅ Cached data cleared');
    fetchTickets();
  };

  return (
    <div className="ticket-list-container">
      <div className="ticket-list-header">
        <div className="ticket-count">Total ticket {totalTickets}</div>
        <div className="header-controls">
          <div className="status-filter">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-dropdown"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button onClick={clearCachedData} className="retry-btn" style={{ marginLeft: '10px', fontSize: '12px', padding: '4px 8px' }}>
            Clear Cache
          </button>
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          ⚠️ {error}
          {retryCount < 3 && (
            <button onClick={handleRetry} className="retry-btn" disabled={isRetrying}>
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
          <button onClick={clearCachedData} className="retry-btn" style={{ marginLeft: '10px' }}>
            Clear Cache
          </button>
        </div>
      )}
      
      {loading && (
        <div className="loading-message">
          🔄 Loading tickets...
        </div>
      )}
      
      <div className="search-container">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="tickets-table-container">
        <table className="tickets-table">
          <thead>
            <tr>
              <th className="sortable">Ticket ID</th>
              <th className="sortable">Title</th>
              <th className="sortable priority-header">Priority</th>
              <th className="sortable status-header">Status</th>
              <th className="sortable">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket, index) => (
              <tr 
                key={`${ticket.id}-${index}`} 
                className="ticket-row"
                onClick={() => handleTicketClick(ticket.id)}
              >
                <td className="ticket-id-cell">
                  {ticket.id}
                  {ticket.isOffline && <span className="offline-indicator" title="Created offline"> 📱</span>}
                  {ticket.priority === 'Low' && !ticket.isOffline && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        overrideTicketPriority(ticket.id, 'High');
                      }}
                      style={{ 
                        marginLeft: '5px', 
                        fontSize: '10px', 
                        padding: '2px 4px',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                      title="Set to High priority"
                    >
                      Fix
                    </button>
                  )}
                </td>
                <td className="ticket-subject-cell">{ticket.issue}</td>
                <td className="priority-cell">
                  <span 
                    className={`priority-badge priority-${ticket.priority.toLowerCase()}`}
                    style={{
                      backgroundColor: ticket.priorityBgColor || '#e2e8f0',
                      color: ticket.priorityTextColor || '#4a5568'
                    }}
                  >
                    {ticket.priority}
                  </span>
                </td>
                <td className="status-cell">
                  <span className={`status-badge status-${ticket.status.toLowerCase().replace('-', '')}`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="date-cell">{ticket.createdAt || ticket.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Page {currentPage} of {totalPages}
          </div>
          <div className="pagination-controls">
            <div className="pagination-pages">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`pagination-page ${currentPage === pageNum ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span>...</span>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className={`pagination-page ${currentPage === totalPages ? 'active' : ''}`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              &gt;
            </button>
          </div>
        </div>
      )}
      
      {selectedTicket && (
        <TicketDetail 
          ticketId={selectedTicket} 
          onClose={handleCloseDetail}
          onTicketChange={setSelectedTicket}
        />
      )}
    </div>
  );
};

export default TicketList;