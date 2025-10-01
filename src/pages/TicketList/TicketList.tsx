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
  const ticketsPerPage = 50;

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
      console.log('🎨 Fetching ticket statuses...');
      const result = await ApiService.getTicketStatuses();
      
      if (result.success && result.data && result.data.status === '1') {
        console.log('✅ Statuses fetched successfully:', result.data);
        console.log('🎨 Status data structure:', result.data.data);
        console.log('🎨 Status colors:', result.data.data?.map((s: any) => ({ name: s.name, bg_color: s.bg_color, text_color: s.text_color })));
        
        // Debug each status individually
        result.data.data?.forEach((status: any, index: number) => {
          console.log(`🎨 Status ${index}:`, {
            name: status.name,
            bg_color: status.bg_color,
            text_color: status.text_color,
            id: status.id
          });
        });
        
        setStatuses(result.data.data || []);
      } else {
        console.error('❌ Failed to fetch statuses:', result.error);
      }
    } catch (error: any) {
      console.error('❌ Error fetching statuses:', error);
    }
  };

  const fetchPriorities = async () => {
    try {
      console.log('Fetching ticket priorities...');
      const result = await ApiService.getTicketPriorities();
      
      if (result.success && result.data && result.data.status === '1') {
        console.log('✅ Priorities fetched successfully:', result.data);
        setPriorities(result.data.data || []);
      } else {
        console.error('❌ Failed to fetch priorities:', result.error);
      }
    } catch (error: any) {
      console.error('❌ Error fetching priorities:', error);
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
          // Debug: Log the first ticket to see what fields are available
          console.log('🔍 First ticket from API:', apiTickets[0]);
          console.log('🔍 Priority fields in first ticket:', {
            priority: apiTickets[0]?.priority,
            priority_name: apiTickets[0]?.priority_name,
            priority_bg_color: apiTickets[0]?.priority_bg_color,
            priority_text_color: apiTickets[0]?.priority_text_color
          });
          
          const transformedTickets: Ticket[] = apiTickets.map((ticket: any, index: number) => {
            console.log(`🔍 Processing ticket ${index}:`, {
              id: ticket.ticket_number || ticket.id,
              priority: ticket.priority,
              priority_name: ticket.priority_name,
              priority_bg_color: ticket.priority_bg_color,
              priority_text_color: ticket.priority_text_color
            });
            
            // Use API data with fallback to original priority field
            const finalPriority = ticket.priority_name || ticket.priority || 'Null';
            
            return {
              id: ticket.ticket_number || ticket.id || `TC-${ticket.id}`,
              requester: ticket.user_name || 'Unknown',
              issue: ticket.title || 'No description',
              time: ticket.created_at || new Date().toLocaleTimeString(),
              status: ticket.status_name || ticket.status || 'Null', // Use API status_name with fallback
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

  // Debug: Log what tickets are being displayed
  console.log('🔍 Current tickets being displayed:', {
    totalTickets: tickets.length,
    filteredTickets: filteredTickets.length,
    sampleTickets: tickets.slice(0, 3).map(t => ({
      id: t.id,
      title: t.issue,
      priority: t.priority,
      status: t.status,
      isOffline: (t as any).isOffline
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
      
    </div>
  );
};

export default TicketList;