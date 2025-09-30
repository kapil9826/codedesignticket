import React, { useState, useEffect } from 'react';
import TicketDetail from '../TicketDetail/TicketDetail';
import SkeletonLoader from '../../components/SkeletonLoader/SkeletonLoader';
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
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
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

  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' }
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
          const transformedTickets: Ticket[] = apiTickets.map((ticket: any, index: number) => {
            // Check if we have a locally stored priority for this ticket
            const localPriorities = JSON.parse(localStorage.getItem('ticketPriorities') || '{}');
            const localPriority = localPriorities[ticket.ticket_number || ticket.id];
            
            const finalPriority = localPriority || ticket.priority_name || ticket.priority || 'Low';
            
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

  // Filter tickets based on search, status, and priority
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.issue.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
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

  const clearCachedData = () => {
    localStorage.removeItem('offlineTickets');
    localStorage.removeItem('ticketPriorities');
    localStorage.removeItem('userData');
    localStorage.removeItem('authToken');
    window.location.reload();
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
              <div className="priority-filter">
                <select 
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="priority-dropdown"
                >
                  {priorityOptions.map(option => (
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
            <div className="loading-container">
              <SkeletonLoader type="ticket-list" count={5} />
            </div>
          )}
          
          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon"><svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="12" height="12" viewBox="0 0 26 26">
<path d="M 10 0.1875 C 4.578125 0.1875 0.1875 4.578125 0.1875 10 C 0.1875 15.421875 4.578125 19.8125 10 19.8125 C 12.289063 19.8125 14.394531 19.003906 16.0625 17.6875 L 16.9375 18.5625 C 16.570313 19.253906 16.699219 20.136719 17.28125 20.71875 L 21.875 25.34375 C 22.589844 26.058594 23.753906 26.058594 24.46875 25.34375 L 25.34375 24.46875 C 26.058594 23.753906 26.058594 22.589844 25.34375 21.875 L 20.71875 17.28125 C 20.132813 16.695313 19.253906 16.59375 18.5625 16.96875 L 17.6875 16.09375 C 19.011719 14.421875 19.8125 12.300781 19.8125 10 C 19.8125 4.578125 15.421875 0.1875 10 0.1875 Z M 10 2 C 14.417969 2 18 5.582031 18 10 C 18 14.417969 14.417969 18 10 18 C 5.582031 18 2 14.417969 2 10 C 2 5.582031 5.582031 2 10 2 Z M 4.9375 7.46875 C 4.421875 8.304688 4.125 9.289063 4.125 10.34375 C 4.125 13.371094 6.566406 15.8125 9.59375 15.8125 C 10.761719 15.8125 11.859375 15.433594 12.75 14.8125 C 12.511719 14.839844 12.246094 14.84375 12 14.84375 C 8.085938 14.84375 4.9375 11.695313 4.9375 7.78125 C 4.9375 7.675781 4.933594 7.574219 4.9375 7.46875 Z"></path>
</svg></span>
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
            {!loading && !error && filteredTickets.length === 0 && tickets.length > 0 && (
              <div className="no-records-found">
                <div className="no-records-icon">🔍</div>
                <h3>No records found</h3>
                <p>No tickets match your current search or filter criteria.</p>
              
              </div>
            )}
            
            {!loading && !error && filteredTickets.length > 0 && (
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
                  ))}
                </tbody>
              </table>
            )}
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