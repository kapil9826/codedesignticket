import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const ticketsPerPage = 15;

  // Helper function to get status styling - uses API colors when available
  const getStatusStyling = (ticket: any) => {
    // Use API status colors if available, otherwise use defaults
    const styling = {
      backgroundColor: ticket.status_bg_color || '#e2e8f0',
      color: ticket.status_text_color || '#4a5568'
    };
    
    console.log('🎨 Status styling (TicketList):', {
      ticketId: ticket.id,
      status: ticket.status,
      status_name: ticket.status_name,
      status_bg_color: ticket.status_bg_color,
      status_text_color: ticket.status_text_color,
      finalBackgroundColor: styling.backgroundColor,
      finalTextColor: styling.color,
      displayText: ticket.status_name || 'Null'
    });
    
    return styling;
  };

  // Helper function to get priority styling - uses API colors when available (currently unused)
  // const getPriorityStyling = (ticket: any) => {
  //   const styling = {
  //     backgroundColor: ticket.priority_bg_color || '#e2e8f0',
  //     color: ticket.priority_text_color || '#4a5568'
  //   };
  //   return styling;
  // };

  // Generate status options from API data
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'Null', label: 'Null' },
    ...statuses.map((status: any) => ({
      value: status.name,
      label: status.name
    }))
  ];

  // Generate priority options from API data
  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'Null', label: 'Null' },
    ...priorities.map(priority => ({
      value: priority.name,
      label: priority.name
    }))
  ];

  // Fetch tickets from API with improved error handling
  const fetchStatuses = async () => {
    try {
      const result = await ApiService.getTicketStatuses();
      
      if (result.success && result.data && result.data.status === '1') {
        setStatuses(result.data.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching statuses:', error);
    }
  };

  const fetchPriorities = async () => {
    try {
      const result = await ApiService.getTicketPriorities();
      
      if (result.success && result.data && result.data.status === '1') {
        setPriorities(result.data.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching priorities:', error);
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
      const result = await ApiService.getTickets(currentPage, ticketsPerPage);
      
      if (result.success && result.data && result.data.status === '1' && result.data.data) {
        // Process API data directly
        let apiTickets = [];
        if (Array.isArray(result.data.data)) {
          apiTickets = result.data.data;
        } else if (result.data.data && typeof result.data.data === 'object') {
          if (Array.isArray(result.data.data.data)) {
            apiTickets = result.data.data.data;
          }
        }
        
        
        if (apiTickets.length > 0) {
          const transformedTickets: Ticket[] = apiTickets.map((ticket: any) => {
            const finalPriority = ticket.priority_name || ticket.priority || 'Null';
            
            return {
              id: ticket.ticket_number || ticket.id || `TC-${ticket.id}`,
              requester: ticket.user_name || 'Unknown',
              issue: ticket.title || 'No description',
              time: ticket.created_at || new Date().toLocaleTimeString(),
              status: ticket.status_name || ticket.status || 'Null',
              priority: finalPriority,
              priority_name: ticket.priority_name || finalPriority,
              priority_bg_color: ticket.priority_bg_color,
              priority_text_color: ticket.priority_text_color,
              status_name: ticket.status_name,
              status_bg_color: ticket.status_bg_color,
              status_text_color: ticket.status_text_color,
              badge: 0,
              description: ticket.description || 'No description available',
              attachments: ticket.documents ? ticket.documents.length : 0,
              createdAt: ticket.created_at || new Date().toLocaleDateString(),
              priorityBgColor: ticket.priority_bg_color || '#e2e8f0',
              priorityTextColor: ticket.priority_text_color || '#4a5568'
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
          
          // Calculate total pages based on total tickets and tickets per page
          const totalTicketsFromAPI = result.data.total || result.data.total_tickets || allTickets.length;
          const calculatedTotalPages = Math.ceil(totalTicketsFromAPI / ticketsPerPage);
          console.log('🔢 Pagination Debug:', {
            totalTicketsFromAPI,
            ticketsPerPage,
            calculatedTotalPages,
            currentPage,
            apiResponse: result.data
          });
          setTotalPages(calculatedTotalPages);
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
  // Fetch statuses and priorities when component mounts
  useEffect(() => {
    fetchStatuses();
    fetchPriorities();
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
    const matchesStatus = statusFilter === 'all' || (ticket as any).status_name === statusFilter;
    const matchesPriority = priorityFilter === 'all' || (ticket as any).priority_name === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });


  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleTicketClick = (ticketId: string) => {
    navigate(`/tickets/${ticketId}`);
  };


  const handleRetry = () => {
    fetchTickets(true);
  };

  const clearCachedData = () => {
    localStorage.removeItem('offlineTickets');
    localStorage.removeItem('userData');
    localStorage.removeItem('authToken');
    window.location.reload();
  };


  return (
    <div className="ticket-list-container">
      <>
          <div className="ticket-list-header">
            <div className="ticket-count">TOTAL TICKETS - {totalTickets}</div>
            <div className="header-controls">
              <div className="search-filter">
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
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
                        {(ticket as any).isOffline && <span className="offline-indicator" title="Created offline"> 📱</span>}
                      </td>
                      <td className="ticket-subject-cell">{ticket.issue}</td>
                      <td className="priority-cell">
                        <span 
                          className={`priority-badge priority-${ticket.priority.toLowerCase()}`}
                        >
                          {(ticket as any).priority_name || ticket.priority || 'Null'}
                        </span>
                      </td>
                      <td className="status-cell">
                        <span 
                          className={`status-badge status-${ticket.status.toLowerCase().replace('-', '')}`}
                          style={getStatusStyling(ticket)}
                        >
                          {(ticket as any).status_name || ticket.status || 'Null'}
                        </span>
                      </td>
                      <td className="date-cell">{ticket.createdAt || ticket.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages >= 1 && (
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
      
    </div>
  );
};

export default TicketList;