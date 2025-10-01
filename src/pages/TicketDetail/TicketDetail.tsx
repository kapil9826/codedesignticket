import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CgAttachment } from "react-icons/cg";
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

  // Memoized status options to prevent unnecessary re-renders
  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Status' },
    { value: 'Null', label: 'Null' },
    ...statuses.map((status: any) => ({
      value: status.name,
      label: status.name
    }))
  ], [statuses]);

  // Memoized priority options to prevent unnecessary re-renders
  const priorityOptions = useMemo(() => [
    { value: 'all', label: 'All Priority' },
    { value: 'Null', label: 'Null' },
    ...priorities.map((priority: any) => ({
      value: priority.name,
      label: priority.name
    }))
  ], [priorities]);

  // Memoized styling functions to prevent unnecessary recalculations
  const getStatusStyling = useCallback((ticket: any) => {
    return {
      backgroundColor: ticket.status_bg_color || '#e2e8f0',
      color: ticket.status_text_color || '#4a5568'
    };
  }, []);

  const getPriorityStyling = useCallback((ticket: any) => {
    return {
      backgroundColor: ticket.priority_bg_color || '#e2e8f0',
      color: ticket.priority_text_color || '#4a5568'
    };
  }, []);

  // Optimized ticket transformation with memoization
  const transformTicket = useCallback((ticket: any) => {
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
  }, []);

  // Optimized fetch tickets with caching and reduced API calls
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check if we already have tickets in cache
      const cachedTickets = localStorage.getItem('cachedTickets');
      const cacheTimestamp = localStorage.getItem('ticketsCacheTimestamp');
      const now = Date.now();
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      
      if (cachedTickets && cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_DURATION) {
        console.log('🚀 Using cached tickets');
        const tickets = JSON.parse(cachedTickets);
        setTickets(tickets);
        setLoading(false);
        return;
      }
      
      const result = await ApiService.getTickets(1, 100);
      
      if (result.success && result.data && result.data.status === '1' && result.data.data) {
        let apiTickets = [];
        if (Array.isArray(result.data.data)) {
          apiTickets = result.data.data;
        } else if (result.data.data && typeof result.data.data === 'object' && Array.isArray(result.data.data.data)) {
          apiTickets = result.data.data.data;
        }
        
        if (apiTickets.length > 0) {
          // Use optimized transformation
          const transformedTickets: Ticket[] = apiTickets.map(transformTicket);
          setTickets(transformedTickets);
          
          // Cache the results
          localStorage.setItem('cachedTickets', JSON.stringify(transformedTickets));
          localStorage.setItem('ticketsCacheTimestamp', now.toString());
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
  }, [transformTicket]);

  // Optimized fetch ticket details with caching and reduced API calls
  const fetchTicketDetails = useCallback(async (ticketId: string) => {
    try {
      setTicketLoading(true);
      setTicketError('');
      
      // Check cache first
      const cacheKey = `ticket-details-${ticketId}`;
      const cachedDetails = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}-timestamp`);
      const now = Date.now();
      const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for ticket details
      
      if (cachedDetails && cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_DURATION) {
        console.log('🚀 Using cached ticket details');
        const ticketData = JSON.parse(cachedDetails);
        setCurrentTicket(ticketData.ticket);
        setComments(ticketData.comments || []);
        setTicketLoading(false);
        return;
      }
      
      let databaseId = ticketId;
      
      // Optimized ID resolution - use cached tickets if available
      if (!/^\d+$/.test(ticketId)) {
        const cachedTickets = localStorage.getItem('cachedTickets');
        if (cachedTickets) {
          try {
            const tickets = JSON.parse(cachedTickets);
            const matchingTicket = tickets.find((ticket: any) => {
              return ticket.id === ticketId;
            });
            
            if (matchingTicket) {
              databaseId = matchingTicket.id;
            } else {
              const match = ticketId.match(/\d+/);
              if (match) {
                databaseId = match[0];
              }
            }
          } catch (error) {
            console.log('⚠️ Error using cached tickets for ID lookup:', error);
          }
        }
        
        // Fallback to API if cache doesn't have the ticket
        if (databaseId === ticketId) {
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
                return ticket.ticket_number === ticketId || ticket.id === ticketId;
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
        
        // Optimized comment loading
        let existingComments: Comment[] = [];
        if (transformedTicket.notes && Array.isArray(transformedTicket.notes)) {
          existingComments = transformedTicket.notes.map((note: any, index: number) => ({
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
        }
        setComments(existingComments);
        
        // Cache the ticket details and comments
        const cacheData = {
          ticket: transformedTicket,
          comments: existingComments
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        localStorage.setItem(`${cacheKey}-timestamp`, now.toString());
      } else {
        setTicketError(result.error || 'Failed to load ticket details');
      }
    } catch (error) {
      console.error('❌ Error fetching ticket details:', error);
      setTicketError('Network error. Please check your connection.');
    } finally {
      setTicketLoading(false);
    }
  }, []);

  // Optimized fetch statuses and priorities with caching
  const fetchStatuses = useCallback(async () => {
    try {
      // Check cache first
      const cachedStatuses = localStorage.getItem('cachedStatuses');
      const cacheTimestamp = localStorage.getItem('statusesCacheTimestamp');
      const now = Date.now();
      const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for statuses
      
      if (cachedStatuses && cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_DURATION) {
        console.log('🚀 Using cached statuses');
        setStatuses(JSON.parse(cachedStatuses));
        return;
      }
      
      const result = await ApiService.getTicketStatuses();
      if (result.success && result.data && result.data.status === '1') {
        const statusesData = result.data.data || [];
        setStatuses(statusesData);
        
        // Cache the results
        localStorage.setItem('cachedStatuses', JSON.stringify(statusesData));
        localStorage.setItem('statusesCacheTimestamp', now.toString());
      }
    } catch (error: any) {
      console.error('❌ Error fetching statuses:', error);
    }
  }, []);

  const fetchPriorities = useCallback(async () => {
    try {
      // Check cache first
      const cachedPriorities = localStorage.getItem('cachedPriorities');
      const cacheTimestamp = localStorage.getItem('prioritiesCacheTimestamp');
      const now = Date.now();
      const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for priorities
      
      if (cachedPriorities && cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_DURATION) {
        console.log('🚀 Using cached priorities');
        setPriorities(JSON.parse(cachedPriorities));
        return;
      }
      
      const result = await ApiService.getTicketPriorities();
      if (result.success && result.data && result.data.status === '1') {
        const prioritiesData = result.data.data || [];
        setPriorities(prioritiesData);
        
        // Cache the results
        localStorage.setItem('cachedPriorities', JSON.stringify(prioritiesData));
        localStorage.setItem('prioritiesCacheTimestamp', now.toString());
      }
    } catch (error: any) {
      console.error('❌ Error fetching priorities:', error);
    }
  }, []);

  // Optimized file selection handler
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
    
    if (event.target) {
      event.target.value = '';
    }
  }, []);

  // Optimized remove file handler
  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Optimized add comment handler
  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() && selectedFiles.length === 0) {
      alert('Please enter a comment or select a file to attach.');
      return;
    }
    
    try {
      setIsUploadingComment(true);
      
      const result = await addCommentFoolproof(ticketId, newComment, selectedFiles);
      
      if (result.success) {
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
      } else {
        alert('Failed to add comment. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setIsUploadingComment(false);
    }
  }, [ticketId, newComment, selectedFiles]);

  // Optimized key press handler
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddComment();
    }
  }, [handleAddComment]);

  // Memoized filtered tickets to prevent unnecessary recalculations
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.priority.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || (ticket as any).status_name === statusFilter;
      const matchesPriority = priorityFilter === 'all' || (ticket as any).priority_name === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

  // Optimized useEffect with proper dependencies and priority loading
  useEffect(() => {
    // Load critical data first (tickets), then load metadata in parallel
    const loadData = async () => {
      try {
        // Load tickets first as they're most critical
        await fetchTickets();
        
        // Load statuses and priorities in parallel (non-blocking)
        Promise.all([
          fetchStatuses(),
          fetchPriorities()
        ]).catch(error => {
          console.error('Error loading metadata:', error);
        });
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadData();
  }, [fetchTickets, fetchStatuses, fetchPriorities]);

  // Optimized ticket details loading
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
  }, [ticketId, fetchTicketDetails]);

  return (
    <div className="ticket-detail-container">
      {/* Ticket List Sidebar - Left */}
      <div className="ticket-list-sidebar">
        <div className="sidebar-header">
          <button className="back-btn" onClick={onClose}>←</button>
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
          <h3>Comments</h3>
           {/* ({comments.length}) */}
        </div>

        <div className="comments-list">
          {ticketLoading && comments.length === 0 && (
            <SkeletonLoader type="comment" count={2} />
          )}
          {!ticketLoading && comments.length === 0 && (
            <div className="no-comments">
              <p>No comments yet. Be the first to add a comment!</p>
            </div>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-avatar">
                {comment.author.charAt(0).toUpperCase()}
              </div>
              <div className="comment-bubble">
                <div className="comment-header">
                  <div className="comment-author">{comment.author}</div>
                  <div className="comment-timestamp">
                    {new Date(comment.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                    
                  </div>
                </div>
                <div className="comment-message">{comment.message}</div>
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="comment-attachments">
                    {comment.attachments.map((attachment) => (
                      <div key={attachment.id} className="attachment-item">
                        <span className="attachment-icon"><CgAttachment /></span>
                        {attachment.url ? (
                          <a 
                            href={attachment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="attachment-link"
                            style={{color: '#035c62', textDecoration: 'underline' }}
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
            </div>
          ))}
        </div>

        <div className="add-comment-section">
          <h4>Add Comment</h4>
          {selectedFiles.length > 0 && (
            <div className="selected-files">
              {selectedFiles.map((file, index) => (
                <div key={index} className="selected-file">
                  <span className="file-icon"><CgAttachment /></span>
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
              <div className="formatting-icons">
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
                  className="formatting-icon"
                  title="Attach files"
                >
                  <CgAttachment />
                </label>
              </div>
              <button 
                className="add-comment-btn" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddComment();
                }}
                type="button"
                disabled={isUploadingComment}
                title="Send comment"
              >
                →
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
            <button 
              className="retry-btn" 
              onClick={() => fetchTicketDetails(ticketId)}
            >
              Retry
            </button>
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

            <div className="ticket-meta">
              <div className="meta-item">
                <span className="meta-label"> Name</span>
                <span className="meta-value">{currentTicket.userName || 'Unknown User'}</span>
              </div>
              
              <div className="meta-item">
                <span className="meta-label"> Email</span>
                <span className="meta-value">{currentTicket.userEmail || 'No email'}</span>
              </div>
            
              
              <div className="meta-item">
                <span className="meta-label">Status</span>
                <div className="status-container">
                  {/* <span className="status-icon">●</span> */}
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
                <span className="meta-label">Priority</span>
                <div className="priority-container">
                  {/* <span className="priority-icon">●</span> */}
                  <span 
                    className="priority-text"
                    style={{
                      ...getPriorityStyling(currentTicket),
                      padding: '5px 10px',
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
                <span className="meta-label">Created</span>
                <span className="meta-value">
                  {new Date(currentTicket.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="meta-item">
                <span className="meta-label">Last Action</span>
                <span className="meta-value">
                  {new Date(currentTicket.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Attachments Section - After Details */}
            <div className="ticket-attachments">
              <h3>Attachments ({currentTicket.documents ? currentTicket.documents.length : 0})</h3>
              {currentTicket.documents && currentTicket.documents.length > 0 ? (
                <div className="attachments-list">
                  {currentTicket.documents.map((docUrl: string, index: number) => {
                    // Extract file name from URL
                    const getFileNameFromUrl = (url: string) => {
                      try {
                        // Extract filename from URL path
                        const urlPath = new URL(url).pathname;
                        const fileName = urlPath.split('/').pop() || '';
                        
                        // Remove timestamp prefix if it exists (e.g., "1759310135_sw.js" -> "sw.js")
                        const cleanFileName = fileName.replace(/^\d+_/, '');
                        
                        return cleanFileName || `Attachment ${index + 1}`;
                      } catch (error) {
                        console.log('Error parsing URL:', url, error);
                        return `Attachment ${index + 1}`;
                      }
                    };

                    const fileName = getFileNameFromUrl(docUrl);

                    return (
                      <div key={index} className="attachment-item">
                        <span className="attachment-icon"><CgAttachment /></span>
                        <div className="attachment-content">
                          <a 
                            href={docUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="attachment-link"
                          >
                            {fileName}
                          </a>
                          <span className="attachment-size">
                            (Click to view)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-attachments">
                  <p>No attachments found for this ticket.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TicketDetail;