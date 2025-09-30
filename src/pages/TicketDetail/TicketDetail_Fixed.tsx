import React, { useState, useEffect, useRef } from 'react';
import SkeletonLoader from '../../components/SkeletonLoader/SkeletonLoader';
import ApiService from '../../services/api';
import { addCommentFoolproof } from '../../services/api-foolproof';
import './TicketDetail.css';

interface Ticket {
  id: string;
  requester: string;
  issue: string;
  time: string;
  badge?: number;
  status: 'Active' | 'Closed' | 'On-hold' | 'Overdue' | 'Assigned' | 'Suspend';
  priority: 'Low' | 'Medium' | 'High';
  priority_name?: string;
  priority_bg_color?: string;
  priority_text_color?: string;
  status_name?: string;
  status_bg_color?: string;
  status_text_color?: string;
}

interface Comment {
  id: string;
  author: string;
  message: string;
  timestamp: string;
  isAgent: boolean;
  avatar?: string;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
}

interface TicketDetailProps {
  ticketId: string;
  onClose: () => void;
  onTicketChange: (ticketId: string) => void;
}

const TicketDetail: React.FC<TicketDetailProps> = ({ ticketId, onClose, onTicketChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentTicket, setCurrentTicket] = useState<any>(null);
  const [ticketLoading, setTicketLoading] = useState(true);
  const [ticketError, setTicketError] = useState<string>('');
  const [showAttachments, setShowAttachments] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingComment, setIsUploadingComment] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);

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
    ...priorities.map((priority: any) => ({
      value: priority.name,
      label: priority.name
    }))
  ];

  // Helper function to get status styling - uses API colors when available
  const getStatusStyling = (ticket: any) => {
    const styling = {
      backgroundColor: ticket.status_bg_color || '#e2e8f0',
      color: ticket.status_text_color || '#4a5568'
    };
    
    console.log('🎨 Status styling (TicketDetail):', {
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

  // Helper function to get priority styling - uses API colors when available
  const getPriorityStyling = (ticket: any) => {
    const styling = {
      backgroundColor: ticket.priority_bg_color || '#e2e8f0',
      color: ticket.priority_text_color || '#4a5568'
    };
    
    console.log('🎨 Priority styling (TicketDetail):', {
      ticketId: ticket.id,
      priority_name: ticket.priority_name,
      priority_bg_color: ticket.priority_bg_color,
      priority_text_color: ticket.priority_text_color,
      finalBackgroundColor: styling.backgroundColor,
      finalTextColor: styling.color,
      displayText: ticket.priority_name || 'Null'
    });
    
    return styling;
  };

  // Fetch tickets from API
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Sidebar: Fetching tickets from API...');
      const result = await ApiService.getTickets(1, 100);
      
      console.log('🔍 Sidebar: API result:', result);
      
      if (result.success && result.data && result.data.status === '1' && result.data.data) {
        console.log('🔍 Sidebar: Processing API tickets...');
        
        let apiTickets = [];
        if (Array.isArray(result.data.data)) {
          apiTickets = result.data.data;
        } else if (result.data.data && typeof result.data.data === 'object' && Array.isArray(result.data.data.data)) {
          apiTickets = result.data.data.data;
        }
        
        if (apiTickets.length > 0) {
          console.log('🔍 Sidebar: Found', apiTickets.length, 'tickets');
          
          const transformedTickets: Ticket[] = apiTickets.map((ticket: any, index: number) => {
            console.log(`🔍 Sidebar Processing ticket ${index}:`, {
              id: ticket.ticket_number || ticket.id,
              priority: ticket.priority,
              priority_name: ticket.priority_name,
              priority_bg_color: ticket.priority_bg_color,
              priority_text_color: ticket.priority_text_color,
              status: ticket.status,
              status_name: ticket.status_name,
              status_bg_color: ticket.status_bg_color,
              status_text_color: ticket.status_text_color,
              fullTicket: ticket
            });
            
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
              createdAt: ticket.created_at || new Date().toLocaleDateString()
            };
          });
          
          setTickets(transformedTickets);
          console.log('✅ Sidebar: Successfully loaded', transformedTickets.length, 'tickets');
        } else {
          console.log('❌ Sidebar: No tickets found in API response');
          setTickets([]);
        }
      } else {
        console.log('❌ Sidebar: API error or no data');
        setError(result.error || 'Failed to load tickets');
      }
    } catch (error: any) {
      console.error('❌ Sidebar: Error fetching tickets:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch specific ticket details from API
  const fetchTicketDetails = async (ticketId: string) => {
    try {
      setTicketLoading(true);
      setTicketError('');
      
      console.log('🔍 Fetching ticket details for:', ticketId);
      
      let databaseId = ticketId;
      
      if (typeof ticketId === 'string' && /^\d+$/.test(ticketId)) {
        console.log('🔢 Ticket ID is already numeric (database ID):', ticketId);
        databaseId = ticketId;
      } else {
        console.log('🔍 Ticket ID is not numeric, need to find database ID from tickets list...');
        
        try {
          console.log('🔄 Fetching tickets to find database ID...');
          const ticketsResult = await ApiService.getTickets(1, 1000);
          
          if (ticketsResult.success && ticketsResult.data && ticketsResult.data.data) {
            let apiTickets = [];
            if (Array.isArray(ticketsResult.data.data)) {
              apiTickets = ticketsResult.data.data;
            } else if (ticketsResult.data.data && typeof ticketsResult.data.data === 'object' && Array.isArray(ticketsResult.data.data.data)) {
              apiTickets = ticketsResult.data.data.data;
            }
            
            console.log('📋 Available tickets for ID lookup:', apiTickets.length);
            
            const matchingTicket = apiTickets.find((ticket: any) => {
              const matchesTicketNumber = ticket.ticket_number === ticketId;
              const matchesId = ticket.id === ticketId;
              return matchesTicketNumber || matchesId;
            });
            
            if (matchingTicket) {
              databaseId = matchingTicket.id;
              console.log('✅ Found matching ticket:', {
                ticketNumber: ticketId,
                databaseId: matchingTicket.id,
                ticketData: matchingTicket
              });
            } else {
              console.log('⚠️ No matching ticket found, using ticket ID as fallback');
              const match = ticketId.match(/\d+/);
              if (match) {
                databaseId = match[0];
                console.log('🔢 Using extracted ID from ticket number:', databaseId);
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Error fetching tickets for ID lookup:', error);
        }
      }
      
      console.log('🔢 Final database ID:', databaseId, 'for ticket:', ticketId);
      
      const result = await ApiService.getTicketDetails(databaseId);
      
      if (result.success && result.data && result.data.status === '1') {
        console.log('✅ API ticket details:', result.data);
        
        const ticketData = result.data.data;
        console.log('🔍 Raw ticket data from API:', ticketData);
        
        const transformedTicket = {
          id: ticketData.ticket_number || ticketData.id || ticketId,
          title: ticketData.title || 'No title',
          description: ticketData.description || 'No description available',
          status: ticketData.status || 'Active',
          priority: ticketData.priority || 'Medium',
          userName: ticketData.user_name || 'Unknown User',
          userEmail: ticketData.user_email || 'unknown@example.com',
          userPhone: ticketData.user_phone || 'N/A',
          createdAt: ticketData.created_at || new Date().toISOString(),
          updatedAt: ticketData.updated_at || new Date().toISOString(),
          assignedTo: ticketData.assigned_to || 'Unassigned',
          department: ticketData.department || 'General',
          category: ticketData.category || 'General',
          documents: ticketData.documents || [],
          notes: ticketData.notes || []
        };
        
        console.log('🔍 Transformed ticket data:', transformedTicket);
        setCurrentTicket(transformedTicket);
        console.log('✅ Transformed ticket data:', transformedTicket);
      } else {
        console.log('❌ Failed to fetch ticket details:', result.error);
        setTicketError(result.error || 'Failed to load ticket details');
      }
    } catch (error) {
      console.error('❌ Error fetching ticket details:', error);
      setTicketError('Network error. Please check your connection.');
    } finally {
      setTicketLoading(false);
    }
  };

  // Fetch statuses
  const fetchStatuses = async () => {
    try {
      console.log('🎨 TicketDetail fetching ticket statuses...');
      const result = await ApiService.getTicketStatuses();
      
      if (result.success && result.data && result.data.status === '1') {
        console.log('✅ TicketDetail statuses fetched successfully:', result.data);
        setStatuses(result.data.data || []);
      } else {
        console.error('❌ TicketDetail failed to fetch statuses:', result.error);
      }
    } catch (error: any) {
      console.error('❌ TicketDetail error fetching statuses:', error);
    }
  };

  // Fetch priorities
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

  // File selection handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📎 handleFileSelect called');
    const files = Array.from(event.target.files || []);
    console.log('📎 Files selected:', files.length, files.map(f => f.name));
    
    if (files.length > 0) {
      setSelectedFiles(prev => {
        const newFiles = [...prev, ...files];
        console.log('📎 Updated selected files:', newFiles.length, newFiles.map(f => f.name));
        return newFiles;
      });
    }
  };

  // Add comment handler
  const handleAddComment = async () => {
    console.log('🚀 ===== FOOLPROOF ADD COMMENT =====');
    console.log('🔍 Input:', { 
      ticketId, 
      comment: newComment, 
      files: selectedFiles.length,
      fileNames: selectedFiles.map(f => f.name),
      fileSizes: selectedFiles.map(f => f.size)
    });
    
    if (!newComment.trim() && selectedFiles.length === 0) {
      alert('Please enter a comment or select a file to attach.');
      return;
    }
    
    try {
      setIsUploadingComment(true);
      
      const result = await addCommentFoolproof(ticketId, newComment, selectedFiles);
      
      if (result.success) {
        console.log('✅ Comment added successfully:', result.data);
        
        // Add the new comment to the local state
        const newCommentObj: Comment = {
          id: Date.now().toString(),
          author: 'You',
          message: newComment,
          timestamp: new Date().toISOString(),
          isAgent: false,
          attachments: selectedFiles.map((file, index) => ({
            id: `attachment-${Date.now()}-${index}`,
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)}KB`,
            type: file.type
          }))
        };
        
        setComments(prev => [...prev, newCommentObj]);
        setNewComment('');
        setSelectedFiles([]);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        console.error('❌ Failed to add comment:', result.error);
        alert('Failed to add comment. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setIsUploadingComment(false);
    }
  };

  // Key press handler
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddComment();
    }
  };

  // Filter tickets based on search, status, and priority
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.priority.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status_name === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority_name === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  useEffect(() => {
    fetchTickets();
    fetchStatuses();
    fetchPriorities();
  }, []);

  useEffect(() => {
    if (ticketId) {
      console.log('🔍 Looking for ticket:', ticketId);
      fetchTicketDetails(ticketId);
    } else {
      console.log('⚠️ No ticketId provided, creating fallback ticket');
      const fallbackTicket = {
        id: 'Unknown',
        title: 'Ticket not found',
        description: 'This ticket could not be loaded. Please check the ticket ID or try refreshing the page.',
        status: 'Unknown',
        priority: 'Unknown',
        userName: 'Unknown User',
        userEmail: 'unknown@example.com',
        userPhone: 'N/A',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedTo: 'Unassigned',
        department: 'General',
        category: 'General',
        documents: [],
        notes: []
      };
      setCurrentTicket(fallbackTicket);
      setTicketLoading(false);
    }
  }, [ticketId]);

  return (
    <div className="ticket-detail-container">
      <div className="ticket-detail-content">
        {ticketLoading ? (
          <SkeletonLoader />
        ) : ticketError ? (
          <div className="error-message">
            <h3>Error Loading Ticket</h3>
            <p>{ticketError}</p>
            <button onClick={() => fetchTicketDetails(ticketId)}>Retry</button>
          </div>
        ) : currentTicket ? (
          <>
            <div className="ticket-header">
              <h1>{currentTicket.title}</h1>
              <button onClick={onClose} className="close-button">×</button>
            </div>
            
            <div className="ticket-info">
              <div className="ticket-meta">
                <div className="meta-item">
                  <label>Status:</label>
                  <span className={`status-badge status-${currentTicket.status.toLowerCase()}`}>
                    {currentTicket.status}
                  </span>
                </div>
                <div className="meta-item">
                  <label>Priority:</label>
                  <span className={`priority-badge priority-${currentTicket.priority.toLowerCase()}`}>
                    {currentTicket.priority}
                  </span>
                </div>
                <div className="meta-item">
                  <label>Assigned To:</label>
                  <span>{currentTicket.assignedTo}</span>
                </div>
                <div className="meta-item">
                  <label>Created:</label>
                  <span>{new Date(currentTicket.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="ticket-description">
              <h3>Description</h3>
              <p>{currentTicket.description}</p>
            </div>
            
            <div className="comments-section">
              <h3>Comments</h3>
              <div className="comments-list">
                {comments.map(comment => (
                  <div key={comment.id} className={`comment ${comment.isAgent ? 'agent' : 'user'}`}>
                    <div className="comment-header">
                      <span className="comment-author">{comment.author}</span>
                      <span className="comment-time">
                        {new Date(comment.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="comment-content">{comment.message}</div>
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="comment-attachments">
                        {comment.attachments.map(attachment => (
                          <div key={attachment.id} className="attachment-item">
                            📎 {attachment.name} ({attachment.size})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="add-comment">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a comment... (Ctrl+Enter to send)"
                  className="comment-textarea"
                />
                
                <div className="selected-files">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      📎 {file.name} ({(file.size / 1024).toFixed(1)}KB)
                    </div>
                  ))}
                </div>
                
                <div className="comment-actions">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    id="file-input"
                    accept="*/*"
                  />
                  <label 
                    htmlFor="file-input" 
                    className="attachment-btn"
                  >
                    📎 Attach Files
                  </label>
                  
                  <button 
                    onClick={handleAddComment}
                    disabled={isUploadingComment}
                    className="add-comment-btn"
                  >
                    {isUploadingComment ? 'Sending...' : 'Send Comment'}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="no-ticket">
            <h3>No Ticket Selected</h3>
            <p>Please select a ticket to view its details.</p>
          </div>
        )}
      </div>
      
      <div className="ticket-sidebar">
        <div className="sidebar-header">
          <h3>All Tickets</h3>
        </div>
        
        <div className="sidebar-filters">
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sidebar-search-input"
          />
          
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
        
        <div className="sidebar-tickets">
          {loading ? (
            <div className="loading-tickets">Loading tickets...</div>
          ) : error ? (
            <div className="error-tickets">Error loading tickets</div>
          ) : filteredTickets.length === 0 ? (
            <div className="no-tickets">No tickets found</div>
          ) : (
            filteredTickets.map(ticket => (
              <div 
                key={ticket.id} 
                className={`sidebar-ticket ${ticket.id === ticketId ? 'active' : ''}`}
                onClick={() => onTicketChange(ticket.id)}
              >
                <div className="sidebar-ticket-header">
                  <div className="sidebar-ticket-id">#{ticket.id}</div>
                  <div className="sidebar-ticket-time">{ticket.time}</div>
                </div>
                <div className="sidebar-ticket-issue">{ticket.issue}</div>
                <div className="sidebar-ticket-badges">
                  <div 
                    className="sidebar-ticket-priority"
                    style={getPriorityStyling(ticket)}
                  >
                    {ticket.priority_name || ticket.priority || 'Null'}
                  </div>
                  <div 
                    className={`sidebar-ticket-status status-${ticket.status.toLowerCase().replace('-', '')}`}
                    style={getStatusStyling(ticket)}
                  >
                    {ticket.status_name || ticket.status || 'Null'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
