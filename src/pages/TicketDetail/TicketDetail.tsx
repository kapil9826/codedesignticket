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
    
    return styling;
  };

  // Helper function to get priority styling - uses API colors when available
  const getPriorityStyling = (ticket: any) => {
    const styling = {
      backgroundColor: ticket.priority_bg_color || '#e2e8f0',
      color: ticket.priority_text_color || '#4a5568'
    };
    
    return styling;
  };

  // Fetch tickets from API for sidebar - FIXED: Don't clear on ticket change
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Sidebar: Fetching tickets from API...');
      const result = await ApiService.getTickets(1, 100);
      
      if (result.success && result.data && result.data.status === '1' && result.data.data) {
        let apiTickets = [];
        if (Array.isArray(result.data.data)) {
          apiTickets = result.data.data;
        } else if (result.data.data && typeof result.data.data === 'object' && Array.isArray(result.data.data.data)) {
          apiTickets = result.data.data.data;
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
              createdAt: ticket.created_at || new Date().toLocaleDateString()
            };
          });
          
          setTickets(transformedTickets);
          console.log('✅ Sidebar: Successfully loaded', transformedTickets.length, 'tickets');
        } else {
          setTickets([]);
        }
      } else {
        setError(result.error || 'Failed to load tickets');
      }
    } catch (error: any) {
      console.error('❌ Sidebar: Error fetching tickets:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch specific ticket details from API - FIXED: Better error handling
  const fetchTicketDetails = async (ticketId: string) => {
    try {
      setTicketLoading(true);
      setTicketError('');
      
      console.log('🔍 Fetching ticket details for:', ticketId);
      
      let databaseId = ticketId;
      
      // Try to resolve ticket ID
      if (typeof ticketId === 'string' && /^\d+$/.test(ticketId)) {
        databaseId = ticketId;
      } else {
        try {
          const ticketsResult = await ApiService.getTickets(1, 1000);
          
          if (ticketsResult.success && ticketsResult.data && ticketsResult.data.data) {
            let apiTickets = [];
            if (Array.isArray(ticketsResult.data.data)) {
              apiTickets = ticketsResult.data.data;
            } else if (ticketsResult.data.data && typeof ticketsResult.data.data === 'object' && Array.isArray(ticketsResult.data.data.data)) {
              apiTickets = ticketsResult.data.data.data;
            }
            
            const matchingTicket = apiTickets.find((ticket: any) => {
              const matchesTicketNumber = ticket.ticket_number === ticketId;
              const matchesId = ticket.id === ticketId;
              return matchesTicketNumber || matchesId;
            });
            
            if (matchingTicket) {
              databaseId = matchingTicket.id;
            } else {
              const match = ticketId.match(/\d+/);
              if (match) {
                databaseId = match[0];
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Error fetching tickets for ID lookup:', error);
        }
      }
      
      const result = await ApiService.getTicketDetails(databaseId);
      
      if (result.success && result.data && result.data.status === '1') {
        const ticketData = result.data.data;
        
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
          notes: ticketData.notes || [],
          status_name: ticketData.status_name,
          status_bg_color: ticketData.status_bg_color,
          status_text_color: ticketData.status_text_color,
          priority_name: ticketData.priority_name,
          priority_bg_color: ticketData.priority_bg_color,
          priority_text_color: ticketData.priority_text_color
        };
        
        setCurrentTicket(transformedTicket);
        
        // Load existing comments from notes - FIXED: Better comment loading
        if (transformedTicket.notes && Array.isArray(transformedTicket.notes)) {
          const existingComments: Comment[] = transformedTicket.notes.map((note: any, index: number) => ({
            id: `note-${note.id || index}`,
            author: note.created_by || note.author || 'You',
            message: note.note || note.content || note.message || 'No content',
            timestamp: note.created_at || note.timestamp || new Date().toISOString(),
            isAgent: note.is_agent || note.isAgent || false,
            attachments: note.documents ? note.documents.map((doc: string, docIndex: number) => ({
              id: `doc-${index}-${docIndex}`,
              name: doc.split('/').pop() || 'Attachment',
              size: 'Unknown',
              type: doc.split('.').pop() || 'file',
              url: doc
            })) : []
          }));
          setComments(existingComments);
          console.log('✅ Loaded', existingComments.length, 'comments from API');
        } else {
          setComments([]);
          console.log('⚠️ No notes found for this ticket');
        }
      } else {
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
      const result = await ApiService.getTicketStatuses();
      
      if (result.success && result.data && result.data.status === '1') {
        setStatuses(result.data.data || []);
      }
    } catch (error: any) {
      console.error('❌ Error fetching statuses:', error);
    }
  };

  // Fetch priorities
  const fetchPriorities = async () => {
    try {
      const result = await ApiService.getTicketPriorities();
      
      if (result.success && result.data && result.data.status === '1') {
        setPriorities(result.data.data || []);
      }
    } catch (error: any) {
      console.error('❌ Error fetching priorities:', error);
    }
  };

  // File selection handler - FIXED: Better file handling
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length > 0) {
      setSelectedFiles(prev => {
        const newFiles = [...prev, ...files];
        console.log('📎 Selected files:', newFiles.map(f => f.name));
        return newFiles;
      });
    }
    
    // Clear the input value to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  // Remove file handler
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Add comment handler - FIXED: Better comment submission
  const handleAddComment = async () => {
    if (!newComment.trim() && selectedFiles.length === 0) {
      alert('Please enter a comment or select a file to attach.');
      return;
    }
    
    try {
      setIsUploadingComment(true);
      console.log('🚀 Adding comment:', { ticketId, comment: newComment, files: selectedFiles.length });
      
      const result = await addCommentFoolproof(ticketId, newComment, selectedFiles);
      
      if (result.success) {
        console.log('✅ Comment added successfully!');
        
        // Create local comment for immediate display
        const newCommentObj: Comment = {
          id: `local-${Date.now()}`,
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
        
        console.log('🎉 Comment with attachments added successfully!');
      } else {
        console.log('❌ API call failed:', result.error);
        alert(`Failed to add comment: ${result.error}`);
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
    const matchesStatus = statusFilter === 'all' || (ticket as any).status_name === statusFilter;
    const matchesPriority = priorityFilter === 'all' || (ticket as any).priority_name === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // FIXED: Load tickets only once on mount, not on every ticket change
  useEffect(() => {
    fetchTickets();
    fetchStatuses();
    fetchPriorities();
  }, []);

  // FIXED: Only fetch ticket details when ticketId changes
  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails(ticketId);
    } else {
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
      {/* Ticket List Sidebar - Left */}
      <div className="ticket-list-sidebar">
        <div className="sidebar-header">
          <button className="back-btn" onClick={onClose}>←</button>
        </div>
        <div className="sidebar-search">
          <input
            type="text"
            placeholder="Search tickets..."
            className="sidebar-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sidebar-filter">
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
        <div className="sidebar-filter">
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
          {loading && (
            <div className="sidebar-loading">
              <SkeletonLoader type="sidebar-ticket" count={3} />
            </div>
          )}
          
          {error && (
            <div className="sidebar-error">
              <p>⚠️ {error}</p>
            </div>
          )}
          
          {!loading && !error && filteredTickets.length === 0 && tickets.length > 0 && (
            <div className="sidebar-no-tickets">
              <div className="sidebar-no-records-icon">🔍</div>
              <h4>No records found</h4>
              <p>No tickets match your current search or filter criteria.</p>
              <div className="sidebar-no-records-suggestions">
                <p>Try:</p>
                <ul>
                  <li>Clearing your search term</li>
                  <li>Changing the status filter</li>
                  <li>Using different keywords</li>
                </ul>
              </div>
            </div>
          )}
          
          {!loading && !error && tickets.length === 0 && (
            <div className="sidebar-no-tickets">
              <p>No tickets available</p>
            </div>
          )}
          
          {!loading && !error && filteredTickets.map((ticket) => (
            <div 
              key={ticket.id} 
              className={`sidebar-ticket-item ${ticket.id === ticketId ? 'active' : ''}`}
              onClick={() => onTicketChange(ticket.id)}
            >
              <div className="sidebar-ticket-id">{ticket.id}</div>
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
          ))}
        </div>
      </div>

      {/* Comments Section - Middle */}
      <div className="comments-section">
        <div className="comments-header">
          <h3>Comments ({comments.length})</h3>
        </div>

        <div className="comments-list">
          {ticketLoading && comments.length === 0 && (
            <SkeletonLoader type="comment" count={2} />
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <div className="comment-author">{comment.author}</div>
                <div className="comment-timestamp">{comment.timestamp}</div>
              </div>
              <div className="comment-message">{comment.message}</div>
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="comment-attachments">
                  <div className="attachments-label">{comment.attachments.length} Attachments</div>
                  {comment.attachments.map((attachment) => (
                    <div key={attachment.id} className="comment-attachment">
                      <span className="attachment-icon">📎</span>
                      {attachment.url ? (
                        <a 
                          href={attachment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="attachment-link"
                          style={{color: '#3b82f6', textDecoration: 'underline' }}
                        >
                          {attachment.name}
                        </a>
                      ) : (
                      <span className="attachment-name">{attachment.name}</span>
                      )}
                      <span className="attachment-size">({attachment.size})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="add-comment-section">
          <h4>Add Comment</h4>
          {selectedFiles.length > 0 && (
            <div className="selected-files">
              {selectedFiles.map((file, index) => (
                <div key={index} className="selected-file">
                  <span className="file-icon">📎</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                  <button 
                    className="remove-file-btn"
                    onClick={() => removeFile(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="comment-form">
            <textarea
              placeholder="Write your comment here..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={handleKeyPress}
              className="comment-textarea"
              rows={1}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
            />
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
                className="add-comment-btn" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddComment();
                }}
                type="button"
                disabled={isUploadingComment}
              >
                {isUploadingComment ? 'Uploading...' : 'Send Comment'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Details Section - Right Side */}
      <div className="ticket-detail-section">
        {ticketLoading && (
          <div className="ticket-loading">
            <SkeletonLoader type="ticket-detail" count={1} />
          </div>
        )}
        
        {ticketError && (
          <div className="ticket-error">
            <p>⚠️ {ticketError}</p>
          </div>
        )}
        
        {!ticketLoading && !ticketError && currentTicket && (
          <>
            <div className="ticket-header">
              <div className="ticket-id">#{currentTicket.id}</div>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            
            <h1 className="ticket-title">{currentTicket.title}</h1>
            
            <div className="ticket-description">
              <p>{currentTicket.description}</p>
            </div>

            {/* FIXED: Added Attachments Section */}
            {currentTicket.documents && currentTicket.documents.length > 0 && (
              <div className="ticket-attachments">
                <h3>Attachments ({currentTicket.documents.length})</h3>
                <div className="attachments-list">
                  {currentTicket.documents.map((doc: any, index: number) => (
                    <div key={index} className="attachment-item">
                      <span className="attachment-icon">📎</span>
                      <span className="attachment-name">
                        {doc.name || doc.filename || `Document ${index + 1}`}
                      </span>
                      {doc.url && (
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="attachment-link"
                        >
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ticket-meta">
              <div className="meta-item">
                <span className="meta-label">User Name:</span>
                <span className="meta-value">{currentTicket.userName || 'Unknown User'}</span>
              </div>
              
              <div className="meta-item">
                <span className="meta-label">User Email:</span>
                <span className="meta-value">{currentTicket.userEmail || 'No email'}</span>
              </div>
              
              <div className="meta-item">
                <span className="meta-label">User Phone:</span>
                <span className="meta-value">{currentTicket.userPhone || 'N/A'}</span>
              </div>
              
              <div className="meta-item">
                <span className="meta-label">Assigned To:</span>
                <span className="meta-value">{currentTicket.assignedTo || 'Unassigned'}</span>
              </div>
              
              <div className="meta-item">
                <span className="meta-label">Department:</span>
                <span className="meta-value">{currentTicket.department || 'General'}</span>
              </div>
              
              <div className="meta-item">
                <span className="meta-label">Category:</span>
                <span className="meta-value">{currentTicket.category || 'General'}</span>
              </div>
              
              <div className="meta-item">
                <span className="meta-label">Status:</span>
                <div className="status-container">
                  <span className="status-icon">●</span>
                  <span 
                    className="status-text"
                    style={{
                      ...getStatusStyling(currentTicket),
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.55rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {currentTicket.status_name || currentTicket.status}
                  </span>
                </div>
              </div>
              
              <div className="meta-item">
                <span className="meta-label">Priority:</span>
                <div className="priority-container">
                  <span className="priority-icon">●</span>
                  <span 
                    className="priority-text"
                    style={{
                      ...getPriorityStyling(currentTicket),
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.55rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {currentTicket.priority_name || currentTicket.priority}
                  </span>
                </div>
              </div>
              
              <div className="meta-item">
                <span className="meta-label">Created:</span>
                <span className="meta-value">
                  {new Date(currentTicket.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="meta-item">
                <span className="meta-label">Updated:</span>
                <span className="meta-value">
                  {new Date(currentTicket.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TicketDetail;