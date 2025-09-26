import React, { useState, useEffect } from 'react';
import ApiService from '../../services/api';
import './TicketDetail.css';

interface Ticket {
  id: string;
  requester: string;
  issue: string;
  time: string;
  badge?: number;
  status: 'Active' | 'Closed' | 'On-hold' | 'Overdue' | 'Assigned' | 'Suspend';
  priority: 'Low' | 'Medium' | 'High';
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
}

interface Customer {
  id: string;
  temperament: string;
}

interface TicketDetailProps {
  ticketId: string;
  onClose: () => void;
  onTicketChange: (ticketId: string) => void;
}

// Mock data removed - using only API data

const TicketDetail: React.FC<TicketDetailProps> = ({ ticketId, onClose, onTicketChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentTicket, setCurrentTicket] = useState<any>(null);
  const [ticketLoading, setTicketLoading] = useState(true);
  const [ticketError, setTicketError] = useState<string>('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'Active', label: 'Active' },
    { value: 'Closed', label: 'Closed' },
    { value: 'On-hold', label: 'On-hold' },
    { value: 'Overdue', label: 'Overdue' },
    { value: 'Assigned', label: 'Assigned' },
    { value: 'Suspend', label: 'Suspend' }
  ];

  // Fetch tickets from API
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Sidebar: Fetching tickets from API...');
      const result = await ApiService.getTickets(1, 100); // Get more tickets for sidebar
      
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
          
          const transformedTickets: Ticket[] = apiTickets.map((ticket: any) => {
            // Check for locally stored priority
            const localPriorities = JSON.parse(localStorage.getItem('ticketPriorities') || '{}');
            const localPriority = localPriorities[ticket.ticket_number || ticket.id];
            const finalPriority = localPriority || ticket.priority_name || ticket.priority || 'Low';
            
            return {
              id: ticket.ticket_number || ticket.id || `TC-${ticket.id}`,
              requester: ticket.user_name || 'Unknown',
              issue: ticket.title || 'No description',
              time: ticket.created_at || new Date().toLocaleTimeString(),
              status: ticket.status || 'Active',
              priority: finalPriority,
              badge: 0,
              description: ticket.description || 'No description available',
              attachments: ticket.documents ? ticket.documents.length : 0,
              createdAt: ticket.created_at || new Date().toLocaleDateString()
            };
          });
          
          // Add offline tickets
          const offlineTickets = JSON.parse(localStorage.getItem('offlineTickets') || '[]');
          const offlineTransformedTickets = offlineTickets.map((ticket: any) => ({
            id: ticket.id,
            requester: ticket.user_name || 'Offline User',
            issue: ticket.title || 'No description',
            time: new Date(ticket.created_at).toLocaleTimeString(),
            status: ticket.status || 'Created',
            priority: ticket.priority || ticket.priority_name || 'Low',
            badge: 0,
            description: ticket.description || 'No description available',
            attachments: ticket.attachments || 0,
            createdAt: new Date(ticket.created_at).toLocaleDateString()
          }));
          
          const allTickets = [...transformedTickets, ...offlineTransformedTickets];
          setTickets(allTickets);
          console.log('✅ Sidebar: Successfully loaded', allTickets.length, 'tickets');
        } else {
          console.log('❌ Sidebar: No tickets found in API response');
          setTickets([]);
        }
      } else {
        console.log('❌ Sidebar: API error or no data');
        setError(result.error || 'Failed to load tickets');
        setTickets([]);
      }
    } catch (error) {
      console.error('❌ Sidebar: Error fetching tickets:', error);
      setError('Network error. Please check your connection.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  // Load tickets on component mount
  useEffect(() => {
    fetchTickets();
  }, []);

  // Fetch specific ticket details from API
  const fetchTicketDetails = async (ticketId: string) => {
    try {
      setTicketLoading(true);
      setTicketError('');
      
      console.log('🔍 Fetching ticket details for:', ticketId);
      
      // First try to get from the tickets list we already have
      const existingTicket = tickets.find(t => t.id === ticketId);
      if (existingTicket) {
        console.log('✅ Found ticket in existing list:', existingTicket);
        setCurrentTicket(existingTicket);
        setTicketLoading(false);
        return;
      }
      
      // If not found, try to fetch from API
      const result = await ApiService.getTicketDetails(ticketId);
      
      if (result.success && result.data) {
        console.log('✅ API ticket details:', result.data);
        
        const ticketData = result.data.data || result.data;
        const transformedTicket = {
          id: ticketData.ticket_number || ticketData.id || ticketId,
          title: ticketData.title || 'No title',
          description: ticketData.description || 'No description available',
          status: ticketData.status || 'Active',
          priority: ticketData.priority_name || ticketData.priority || 'Low',
          lastUpdated: ticketData.updated_at || ticketData.created_at || new Date().toLocaleDateString(),
          createdAt: ticketData.created_at || new Date().toLocaleDateString(),
          assignedTo: ticketData.assigned_to || 'Unassigned',
          channel: ticketData.channel || 'Web',
          userName: ticketData.user_name || 'Unknown User'
        };
        
        setCurrentTicket(transformedTicket);
        console.log('✅ Transformed ticket data:', transformedTicket);
      } else {
        console.log('❌ Failed to fetch ticket details:', result.error);
        
        // Check if it's an endpoint not found error
        if (result.error && result.error.includes('endpoint not found')) {
          setTicketError('⚠️ Ticket details API is not available yet. You can still view tickets in the list and sidebar.');
        } else {
          setTicketError(result.error || 'Failed to load ticket details');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching ticket details:', error);
      setTicketError('Network error. Please check your connection.');
    } finally {
      setTicketLoading(false);
    }
  };

  // Load ticket details when ticketId changes
  useEffect(() => {
    if (ticketId) {
      console.log('🔍 Looking for ticket:', ticketId);
      console.log('🔍 Available tickets:', tickets.length);
      console.log('🔍 Ticket IDs:', tickets.map(t => t.id));
      
      // First try to find the ticket in the sidebar data
      const existingTicket = tickets.find(ticket => ticket.id === ticketId);
      if (existingTicket) {
        console.log('✅ Found ticket in sidebar:', existingTicket);
        const transformedTicket = {
          id: existingTicket.id,
          title: existingTicket.issue,
          description: 'Ticket details not available from API. This is a basic view with limited information.',
          status: existingTicket.status,
          priority: existingTicket.priority,
          lastUpdated: new Date().toLocaleDateString(),
          createdAt: new Date().toLocaleDateString(),
          assignedTo: 'Unassigned',
          channel: 'Web',
          userName: 'Unknown User'
        };
        setCurrentTicket(transformedTicket);
        setTicketLoading(false);
        setTicketError(null); // Clear any previous errors
        return;
      }
      
      console.log('❌ Ticket not found in sidebar, trying API...');
      // If not found in sidebar, try API
      fetchTicketDetails(ticketId);
    } else {
      // No ticketId provided, create a basic fallback
      console.log('⚠️ No ticketId provided, creating fallback ticket');
      const fallbackTicket = {
        id: 'Unknown',
        title: 'Ticket not found',
        description: 'This ticket could not be loaded. Please check the ticket ID or try refreshing the page.',
        status: 'Unknown',
        priority: 'Low',
        lastUpdated: new Date().toLocaleDateString(),
        createdAt: new Date().toLocaleDateString(),
        assignedTo: 'Unassigned',
        channel: 'Web',
        userName: 'Unknown User'
      };
      setCurrentTicket(fallbackTicket);
      setTicketLoading(false);
    }
  }, [ticketId, tickets]);

  // Dynamic ticket data based on ticketId
  const getTicketData = (id: string) => {
    const ticketData: { [key: string]: any } = {
      'TC-0004': {
        id: 'TC-0004',
        title: 'System Login Failure',
        description: 'I am unable to log into my account. I keep receiving an error message stating that my credentials are incorrect. Please assist me in resolving this issue.',
        status: 'Active',
        priority: 'High',
        lastUpdated: '12 Mar, 2024. 7:00PM',
        createdAt: '12 Mar, 2024. 7:00PM',
        assignedTo: 'Jane Smith',
        channel: 'X',
        userName: 'David Newman'
      },
      'TC-0001': {
        id: 'TC-0001',
        title: 'Request for Additional Storage',
        description: 'I need more storage space for my account. The current limit is not sufficient for my business needs.',
        status: 'Assigned',
        priority: 'Medium',
        lastUpdated: '11 Mar, 2024. 3:30PM',
        createdAt: '11 Mar, 2024. 2:15PM',
        assignedTo: 'Mike Johnson',
        channel: 'Email',
        userName: 'Emily Johnson'
      },
      'TC-0003': {
        id: 'TC-0003',
        title: 'Unable to access report',
        description: 'I cannot access the monthly report that I need for my presentation tomorrow.',
        status: 'On-hold',
        priority: 'High',
        lastUpdated: '10 Mar, 2024. 9:45AM',
        createdAt: '10 Mar, 2024. 9:30AM',
        assignedTo: 'Sarah Wilson',
        channel: 'Phone',
        userName: '(747) 246-9411'
      },
      'TC-0008': {
        id: 'TC-0008',
        title: 'Unexpected App Crash',
        description: 'The application keeps crashing when I try to open the dashboard. This is affecting my work productivity.',
        status: 'Assigned',
        priority: 'High',
        lastUpdated: '10 Mar, 2024. 8:10AM',
        createdAt: '10 Mar, 2024. 8:10AM',
        assignedTo: 'Tom Davis',
        channel: 'Web',
        userName: 'Guy Hawkins'
      },
      'TC-0010': {
        id: 'TC-0010',
        title: 'Incorrect Billing Information',
        description: 'I noticed an error in my billing statement. The amount charged does not match my usage.',
        status: 'Closed',
        priority: 'Medium',
        lastUpdated: '09 Mar, 2024. 7:30AM',
        createdAt: '09 Mar, 2024. 7:30AM',
        assignedTo: 'Lisa Brown',
        channel: 'Email',
        userName: 'Jacob Jones'
      },
      'TC-0011': {
        id: 'TC-0011',
        title: 'System Login Failure',
        description: 'I am experiencing the same login issue as before. The password reset is not working.',
        status: 'Suspend',
        priority: 'High',
        lastUpdated: '09 Mar, 2024. 7:16AM',
        createdAt: '09 Mar, 2024. 7:16AM',
        assignedTo: 'Jane Smith',
        channel: 'X',
        userName: 'Courtney Henry'
      }
    };
    return ticketData[id] || ticketData['TC-0004'];
  };

  // Use API data instead of hardcoded data
  const ticket = currentTicket;

  const getCustomerData = (ticketId: string) => {
    const customerData: { [key: string]: Customer } = {
      'TC-0004': { id: 'USER12345', temperament: 'Calm' },
      'TC-0001': { id: 'USER12346', temperament: 'Frustrated' },
      'TC-0003': { id: 'USER12347', temperament: 'Anxious' },
      'TC-0008': { id: 'USER12348', temperament: 'Urgent' },
      'TC-0010': { id: 'USER12349', temperament: 'Satisfied' },
      'TC-0011': { id: 'USER12350', temperament: 'Frustrated' }
    };
    return customerData[ticketId] || customerData['TC-0004'];
  };

  const customer = getCustomerData(ticketId);

  const getAttachmentsData = (ticketId: string) => {
    const attachmentsData: { [key: string]: Attachment[] } = {
      'TC-0004': [
        { id: '1', name: 'Privacy policy.pdf', size: '1.5MB', type: 'pdf' },
        { id: '2', name: 'Privacy policy.pdf', size: '1.5MB', type: 'pdf' }
      ],
      'TC-0001': [
        { id: '1', name: 'Storage request.docx', size: '2.1MB', type: 'docx' }
      ],
      'TC-0003': [
        { id: '1', name: 'Report template.xlsx', size: '3.2MB', type: 'xlsx' },
        { id: '2', name: 'Screenshot.png', size: '850KB', type: 'png' }
      ],
      'TC-0008': [
        { id: '1', name: 'Error log.txt', size: '245KB', type: 'txt' },
        { id: '2', name: 'Crash report.pdf', size: '1.2MB', type: 'pdf' }
      ],
      'TC-0010': [
        { id: '1', name: 'Invoice.pdf', size: '890KB', type: 'pdf' },
        { id: '2', name: 'Usage report.xlsx', size: '1.8MB', type: 'xlsx' }
      ],
      'TC-0011': [
        { id: '1', name: 'Login error.png', size: '650KB', type: 'png' }
      ]
    };
    return attachmentsData[ticketId] || attachmentsData['TC-0004'];
  };

  const attachments = getAttachmentsData(ticketId);

  const getCommentsData = (ticketId: string) => {
    const commentsData: { [key: string]: Comment[] } = {
      'TC-0004': [
        {
          id: '1',
          author: 'Agent',
          message: 'Hi David, I see you are having trouble logging into your account. Let me help you resolve this.',
          timestamp: '7:00PM',
          isAgent: true
        },
        {
          id: '2',
          author: 'User',
          message: 'Yes, I keep getting an error message saying my credentials are incorrect.',
          timestamp: '7:01PM',
          isAgent: false
        },
        {
          id: '3',
          author: 'Agent',
          message: 'Let me check your account status. Can you try resetting your password?',
          timestamp: '7:02PM',
          isAgent: true
        },
        {
          id: '4',
          author: 'User',
          message: 'I already tried that, but I am not receiving the reset email.',
          timestamp: '7:03PM',
          isAgent: false
        }
      ],
      'TC-0001': [
        {
          id: '1',
          author: 'Agent',
          message: 'Hello Emily! I understand you need additional storage space. Let me check your current plan.',
          timestamp: '2:15PM',
          isAgent: true
        },
        {
          id: '2',
          author: 'User',
          message: 'Yes, I need more space for my business files. The current limit is not sufficient.',
          timestamp: '2:16PM',
          isAgent: false
        },
        {
          id: '3',
          author: 'Agent',
          message: 'I can see you are on the Basic plan. Would you like to upgrade to the Professional plan?',
          timestamp: '2:17PM',
          isAgent: true
        },
        {
          id: '4',
          author: 'User',
          message: 'Yes, that sounds good. What are the benefits of the Professional plan?',
          timestamp: '2:18PM',
          isAgent: false
        },
        {
          id: '5',
          author: 'Agent',
          message: 'The Professional plan includes 100GB storage, priority support, and advanced features.',
          timestamp: '2:19PM',
          isAgent: true
        }
      ],
      'TC-0003': [
        {
          id: '1',
          author: 'Agent',
          message: 'Hi! I see you are having trouble accessing your monthly report. Let me investigate this issue.',
          timestamp: '9:30AM',
          isAgent: true
        },
        {
          id: '2',
          author: 'User',
          message: 'Thank you, I need this report urgently for my presentation tomorrow.',
          timestamp: '9:31AM',
          isAgent: false
        },
        {
          id: '3',
          author: 'Agent',
          message: 'I understand the urgency. Let me check the report generation system.',
          timestamp: '9:32AM',
          isAgent: true
        },
        {
          id: '4',
          author: 'User',
          message: 'I have attached the report template and a screenshot of the error.',
          timestamp: '9:33AM',
          isAgent: false,
          attachments: [
            { id: '1', name: 'Report template.xlsx', size: '3.2MB', type: 'xlsx' },
            { id: '2', name: 'Screenshot.png', size: '850KB', type: 'png' }
          ]
        },
        {
          id: '5',
          author: 'Agent',
          message: 'Thank you for the attachments. I can see the issue now. Let me fix this for you.',
          timestamp: '9:34AM',
          isAgent: true
        }
      ],
      'TC-0008': [
        {
          id: '1',
          author: 'Agent',
          message: 'Hello Guy, I see you are experiencing an unexpected app crash. Let me help you resolve this.',
          timestamp: '8:10AM',
          isAgent: true
        },
        {
          id: '2',
          author: 'User',
          message: 'Yes, the app keeps crashing when I try to open the dashboard.',
          timestamp: '8:11AM',
          isAgent: false
        },
        {
          id: '3',
          author: 'Agent',
          message: 'What device and browser are you using? This will help me identify the issue.',
          timestamp: '8:12AM',
          isAgent: true
        },
        {
          id: '4',
          author: 'User',
          message: 'I am using Chrome on Windows 10. The crash happens every time I click on the dashboard.',
          timestamp: '8:13AM',
          isAgent: false
        }
      ],
      'TC-0010': [
        {
          id: '1',
          author: 'Agent',
          message: 'Hi Jacob, I see there is an issue with your billing information. Let me help you correct this.',
          timestamp: '7:30AM',
          isAgent: true
        },
        {
          id: '2',
          author: 'User',
          message: 'Yes, I noticed the billing amount is incorrect on my last invoice.',
          timestamp: '7:31AM',
          isAgent: false
        },
        {
          id: '3',
          author: 'Agent',
          message: 'I can see the issue. There was a calculation error in the billing system. Let me fix this for you.',
          timestamp: '7:32AM',
          isAgent: true
        },
        {
          id: '4',
          author: 'User',
          message: 'Thank you. When will I receive the corrected invoice?',
          timestamp: '7:33AM',
          isAgent: false
        }
      ],
      'TC-0011': [
        {
          id: '1',
          author: 'Agent',
          message: 'Hello! I see you are still experiencing login issues. Let me investigate this further.',
          timestamp: '7:16AM',
          isAgent: true
        },
        {
          id: '2',
          author: 'User',
          message: 'Yes, the password reset is not working. I am not receiving any emails.',
          timestamp: '7:17AM',
          isAgent: false
        },
        {
          id: '3',
          author: 'Agent',
          message: 'Let me check your email settings and try a different approach.',
          timestamp: '7:18AM',
          isAgent: true
        },
        {
          id: '4',
          author: 'User',
          message: 'I have attached a screenshot of the error message I am seeing.',
          timestamp: '7:19AM',
          isAgent: false,
          attachments: [
            { id: '1', name: 'Login error.png', size: '650KB', type: 'png' }
          ]
        }
      ]
    };
    return commentsData[ticketId] || commentsData['TC-0004'];
  };

  const [comments, setComments] = useState<Comment[]>([]);

  // Initialize comments when ticketId changes
  React.useEffect(() => {
    setComments(getCommentsData(ticketId));
  }, [ticketId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddComment = () => {
    if (newComment.trim() || selectedFiles.length > 0) {
      const commentAttachments = selectedFiles.map(file => ({
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
        type: file.type.split('/')[1] || 'file'
      }));

      const comment: Comment = {
        id: Date.now().toString(),
        author: 'You',
        message: newComment,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAgent: false,
        attachments: commentAttachments
      };
      setComments([...comments, comment]);
      setNewComment('');
      setSelectedFiles([]);
      if (fileInputRef) {
        fileInputRef.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  // Filter tickets based on search and status
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.priority.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <div className="sidebar-tickets">
          {loading && (
            <div className="sidebar-loading">
              <div className="loading-spinner"></div>
              <p>Loading tickets...</p>
            </div>
          )}
          
          {error && (
            <div className="sidebar-error">
              <p>⚠️ {error}</p>
            </div>
          )}
          
          {!loading && !error && filteredTickets.length === 0 && (
            <div className="sidebar-no-tickets">
              <p>No tickets found</p>
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
              <div className={`sidebar-ticket-priority priority-${ticket.priority.toLowerCase()}`}>
                {ticket.priority}
              </div>
              <div className={`sidebar-ticket-status status-${ticket.status.toLowerCase().replace('-', '')}`}>
                {ticket.status}
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
                      <span className="attachment-name">{attachment.name}</span>
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
              rows={4}
            />
            <div className="comment-actions">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                ref={setFileInputRef}
                style={{ display: 'none' }}
                id="file-input"
              />
              <label htmlFor="file-input" className="attachment-btn">
                📎 Attach Files
              </label>
              <button className="add-comment-btn" onClick={handleAddComment}>
                Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Details Section - Right Side */}
      <div className="ticket-detail-section">
        {ticketLoading && (
          <div className="ticket-loading">
            <div className="loading-spinner"></div>
            <p>Loading ticket details...</p>
          </div>
        )}
        
        {ticketError && (
          <div className="ticket-error">
            <p>⚠️ {ticketError}</p>
          </div>
        )}
        
        {!ticketLoading && !ticketError && ticket && (
          <>
            <div className="ticket-header">
              <div className="ticket-id">#{ticket.id}</div>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            
            <h1 className="ticket-title">{ticket.title}</h1>
            
            <div className="ticket-description">
              <p>{ticket.description}</p>
            </div>

        <div className="ticket-meta">
          <div className="meta-item">
            <span className="meta-label">User Name:</span>
            <span className="meta-value">{ticket.userName || 'Unknown User'}</span>
          </div>
          
          <div className="meta-item">
            <span className="meta-label">Status:</span>
            <div className="status-container">
              <span className="status-icon">●</span>
              <span className="status-text">{ticket.status}</span>
            </div>
          </div>
          
          <div className="meta-item">
            <span className="meta-label">Priority:</span>
            <span className="priority-badge">{ticket.priority}</span>
          </div>
          
          <div className="meta-item">
            <span className="meta-label">Date:</span>
            <span className="meta-value">{ticket.createdAt}</span>
          </div>
        </div>

        <div className="attachments-section">
          <div className="attachments-header">
            <h3>Attachments ({ticket.attachments || 0})</h3>
            <button 
              className="show-all-btn"
              onClick={() => setShowAttachments(!showAttachments)}
            >
              {showAttachments ? 'Hide' : 'Show all'}
            </button>
          </div>
          
          {showAttachments && (
            <div className="attachments-list">
              {ticket.attachments && ticket.attachments > 0 ? (
                <div className="attachment-item">
                  <span className="attachment-name">📎 {ticket.attachments} file{ticket.attachments !== 1 ? 's' : ''} attached</span>
                  <button className="download-btn">View Files</button>
                </div>
              ) : (
                <div className="no-attachments">
                  <span>No attachments available</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="customer-info-section">
          <h3>Customer information</h3>
          <div className="customer-details">
            <div className="customer-item">
              <span className="customer-label">Customer ID:</span>
              <span className="customer-value">#{ticket.userName || 'Unknown'}</span>
            </div>
            <div className="customer-item">
              <span className="customer-label">Email:</span>
              <span className="customer-value">{ticket.userName || 'Unknown User'}</span>
            </div>
            <div className="customer-item">
              <span className="customer-label">Status:</span>
              <span className="temperament-badge">{ticket.status}</span>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TicketDetail;