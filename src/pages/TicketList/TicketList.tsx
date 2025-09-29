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
  const [statuses, setStatuses] = useState<any[]>([]);
  const ticketsPerPage = 50;

  // Helper function to get status styling
  const getStatusStyling = (ticketStatus: string) => {
    // First try exact match
    let statusData = statuses.find(s => s.name === ticketStatus);
    
    // If no exact match, try common mappings
    if (!statusData) {
      if (ticketStatus === 'Active') {
        statusData = statuses.find(s => s.name === 'Open');
      } else if (ticketStatus === 'Closed') {
        statusData = statuses.find(s => s.name === 'Closed');
      }
    }
    
    return {
      backgroundColor: statusData?.bg_color || '#6b7280',
      color: statusData?.text_color || '#ffffff'
    };
  };

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
  const fetchStatuses = async () => {
    try {
      console.log('Fetching ticket statuses...');
      const result = await ApiService.getTicketStatuses();
      
      if (result.success && result.data && result.data.status === '1') {
        console.log('✅ Statuses fetched successfully:', result.data);
        setStatuses(result.data.data || []);
      } else {
        console.error('❌ Failed to fetch statuses:', result.error);
      }
    } catch (error: any) {
      console.error('❌ Error fetching statuses:', error);
    }
  };

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
        
        // Try multiple ways to access the data
        let apiTickets = [];
        if (Array.isArray(result.data.data)) {
          apiTickets = result.data.data;
        } else if (result.data.data && typeof result.data.data === 'object') {
          if (Array.isArray(result.data.data.data)) {
            apiTickets = result.data.data.data;
          }
        }
        
        
        if (apiTickets.length > 0) {
          console.log('🔍 Raw API tickets:', apiTickets);
          
          const transformedTickets: Ticket[] = apiTickets.map((ticket: any, index: number) => {
            console.log('🔍 Processing ticket:', {
              raw: ticket,
              ticket_number: ticket.ticket_number,
              title: ticket.title,
              priority_name: ticket.priority_name,
              status: ticket.status
            });
            
            // Check if we have a locally stored priority for this ticket
            const localPriorities = JSON.parse(localStorage.getItem('ticketPriorities') || '{}');
            const localPriority = localPriorities[ticket.ticket_number || ticket.id];
            
            const finalPriority = localPriority || ticket.priority_name || ticket.priority || 'Low';
            
            const transformedTicket = {
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
            
            console.log('🔍 Transformed ticket:', transformedTicket);
            return transformedTicket;
          });
          
          
          
          // Add offline tickets to the list
          const offlineTickets = JSON.parse(localStorage.getItem('offlineTickets') || '[]');
          const offlineTransformedTickets = offlineTickets.map((ticket: any) => {
            
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
          
          return;
        } else {
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
  // Fetch statuses when component mounts
  useEffect(() => {
    fetchStatuses();
  }, []);

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


  const handleRetry = () => {
    fetchTickets(true);
  };


  return (
    <div className="ticket-list-container">
      {!selectedTicket && (
        <>
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
                {filteredTickets.map((ticket, index) => {
                  console.log('🔍 Rendering ticket:', {
                    id: ticket.id,
                    issue: ticket.issue,
                    priority: ticket.priority,
                    status: ticket.status,
                    createdAt: ticket.createdAt
                  });
                  
                  return (
                    <tr 
                      key={`${ticket.id}-${index}`} 
                      className="ticket-row"
                      onClick={() => handleTicketClick(ticket.id)}
                    >
                      <td className="ticket-id-cell">
                        {ticket.id}
                        {ticket.isOffline && <span className="offline-indicator" title="Created offline"> 📱</span>}
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
                        <span 
                          className={`status-badge status-${ticket.status.toLowerCase().replace('-', '')}`}
                          style={getStatusStyling(ticket.status)}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td className="date-cell">{ticket.createdAt || ticket.time}</td>
                    </tr>
                  );
                })}
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
        </>
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