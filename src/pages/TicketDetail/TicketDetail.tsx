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

  const statusOptions = [
    { value: 'all', label: 'All' },
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
      
      // Dynamic database ID resolution for all tickets
      let databaseId = ticketId;
      
      console.log('🔍 Resolving database ID for ticket:', ticketId);
      console.log('🔍 Ticket ID type:', typeof ticketId);
      console.log('🔍 Is numeric check:', /^\d+$/.test(String(ticketId)));
      
      // If ticket ID is already numeric, use it directly
      if (typeof ticketId === 'string' && /^\d+$/.test(ticketId)) {
        console.log('🔢 Ticket ID is already numeric (database ID):', ticketId);
        databaseId = ticketId;
      } else {
        console.log('🔍 Ticket ID is not numeric, need to find database ID from tickets list...');
        
        try {
          // Fetch tickets to find the database ID
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
            
            // Find the matching ticket
            console.log('🔍 Searching for ticket in list...');
            console.log('🔍 Looking for ticket ID:', ticketId);
            console.log('🔍 Available tickets in list:', apiTickets.length);
            
            const matchingTicket = apiTickets.find((ticket: any) => {
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
                ticketData: matchingTicket
              });
              console.log('✅ Successfully resolved database ID from tickets list');
            } else {
              console.log('⚠️ No matching ticket found, using ticket ID as fallback');
              console.log('🔍 Available ticket numbers:', apiTickets.map((t: any) => t.ticket_number));
              console.log('🔍 Available ticket IDs:', apiTickets.map((t: any) => t.id));
              
              // Try to extract numeric part from ticket number
              const match = ticketId.match(/\d+/);
              if (match) {
                databaseId = match[0];
                console.log('🔢 Using extracted ID from ticket number:', databaseId);
              }
            }
          } else {
            console.log('⚠️ Could not fetch tickets for ID lookup, using ticket ID as fallback');
          }
        } catch (error) {
          console.log('⚠️ Error fetching tickets for ID lookup:', error);
        }
      }
      
      console.log('🔢 Final database ID:', databaseId, 'for ticket:', ticketId);
      
      // Fetch from the original ticket details API
      console.log('🔄 Using original ticket details approach...');
      const result = await ApiService.getTicketDetails(databaseId);
      
      if (result.success && result.data && result.data.status === '1') {
        console.log('✅ API ticket details:', result.data);
        
        const ticketData = result.data.data;
        console.log('🔍 Raw ticket data from API:', ticketData);
        console.log('🔍 User name from API:', ticketData.user_name);
        console.log('🔍 User email from API:', ticketData.user_email);
        
        const transformedTicket = {
          id: ticketData.ticket_number || ticketData.id || ticketId,
          title: ticketData.title || 'No title',
          description: ticketData.description || 'No description available',
          status: 'Active', // Default status since API doesn't provide it yet
          priority: ticketData.priority_name || 'Low',
          priorityBgColor: ticketData.priority_bg_color || '#e2e8f0',
          priorityTextColor: ticketData.priority_text_color || '#4a5568',
          lastUpdated: ticketData.updated_at || ticketData.created_at || new Date().toLocaleDateString(),
          createdAt: ticketData.created_at || new Date().toLocaleDateString(),
          userName: ticketData.user_name || 'Unknown User',
          userEmail: ticketData.user_email || 'No email',
          userPhone: ticketData.user_phone || 'No phone',
          documents: ticketData.documents || null,
          notes: ticketData.notes || null
        };
        
        console.log('🔍 Documents from API:', ticketData.documents);
        console.log('🔍 Documents type:', typeof ticketData.documents);
        console.log('🔍 Documents length:', ticketData.documents ? ticketData.documents.length : 'null/undefined');
        
        // If no documents in main response, try to fetch them separately
        if (!ticketData.documents || ticketData.documents.length === 0) {
          console.log('🔍 No documents in main response, trying separate attachments API...');
          try {
            const attachmentsResult = await ApiService.getTicketAttachments(databaseId);
            if (attachmentsResult.success && attachmentsResult.data) {
              console.log('✅ Found attachments via separate API:', attachmentsResult.data);
              transformedTicket.documents = attachmentsResult.data.data || attachmentsResult.data;
            }
          } catch (error) {
            console.log('❌ Separate attachments API failed:', error);
          }
        }
        
        console.log('🔍 Transformed ticket data:', transformedTicket);
        console.log('🔍 Final user name:', transformedTicket.userName);
        console.log('🔍 Final user email:', transformedTicket.userEmail);
        console.log('🔍 Final documents:', transformedTicket.documents);
        
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

  // Load ticket details when ticketId changes
  useEffect(() => {
    if (ticketId) {
      console.log('🔍 Looking for ticket:', ticketId);
      console.log('🔍 Available tickets:', tickets.length);
      console.log('🔍 Ticket IDs:', tickets.map(t => t.id));
      
      // Always try to fetch from API first for complete details
      console.log('🔄 Fetching ticket details from API...');
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
  }, [ticketId]);

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


  const [comments, setComments] = useState<Comment[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);

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

  // Fetch statuses
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

  // Initialize comments when ticketId changes
  React.useEffect(() => {
    // Only fetch real notes from the API, no mock data
    const fetchRealNotes = async () => {
      try {
        console.log('🔍 Fetching real notes for ticket:', ticketId);
        
        // Get tickets data which includes notes
        const result = await ApiService.getTickets(1, 100);
        
        if (result.success && result.data && result.data.status === '1' && result.data.data) {
          console.log('✅ Tickets API response:', result.data);
          
          let apiTickets = [];
          if (Array.isArray(result.data.data)) {
            apiTickets = result.data.data;
          } else if (result.data.data && typeof result.data.data === 'object' && Array.isArray(result.data.data.data)) {
            apiTickets = result.data.data.data;
          }
          
          // Find the current ticket
          const currentTicket = apiTickets.find((ticket: any) => 
            ticket.ticket_number === ticketId || ticket.id === ticketId
          );
          
          if (currentTicket && currentTicket.notes && Array.isArray(currentTicket.notes)) {
            console.log('✅ Found notes for ticket:', currentTicket.notes);
            
            // Convert API notes to Comment format
            const apiComments: Comment[] = currentTicket.notes.map((note: any, index: number) => ({
              id: `api-note-${index}`,
              author: note.created_by || 'You',
              message: note.note,
              timestamp: note.created_at || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isAgent: true,
              attachments: note.documents ? note.documents.map((doc: string, docIndex: number) => ({
                id: `doc-${index}-${docIndex}`,
                name: doc.split('/').pop() || 'Attachment',
                size: 'Unknown',
                type: doc.split('.').pop() || 'file',
                url: doc
              })) : []
            }));
            
            setComments(apiComments);
            console.log('✅ Using real API notes:', apiComments);
          } else {
            console.log('⚠️ No notes found for this ticket');
            setComments([]); // Show empty comments instead of mock data
          }
        } else {
          console.log('⚠️ Failed to fetch tickets data');
          setComments([]); // Show empty comments instead of mock data
        }
      } catch (error) {
        console.error('❌ Error fetching real notes:', error);
        setComments([]); // Show empty comments instead of mock data
      }
    };
    
    fetchRealNotes();
  }, [ticketId]);

  // Fetch statuses when component mounts
  React.useEffect(() => {
    fetchStatuses();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📎 handleFileSelect called');
    console.log('📎 Event target:', event.target);
    console.log('📎 Files:', event.target.files);
    
    const files = Array.from(event.target.files || []);
    console.log('📎 Files selected:', files.length, files.map(f => f.name));
    
    if (files.length > 0) {
      setSelectedFiles(prev => {
        const newFiles = [...prev, ...files];
        console.log('📎 Updated selected files:', newFiles.length, newFiles.map(f => f.name));
        return newFiles;
      });
    }
    
    // Clear the input value to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddComment = async () => {
    console.log('🚀 ===== FOOLPROOF ADD COMMENT =====');
    console.log('🔍 Input:', { 
      ticketId, 
      comment: newComment, 
      files: selectedFiles.length,
      fileNames: selectedFiles.map(f => f.name),
      fileSizes: selectedFiles.map(f => f.size)
    });
    
    // Validate input
    if (!newComment.trim() && selectedFiles.length === 0) {
      alert('Please enter a comment or select a file to attach.');
      return;
    }
    
    try {
      setIsUploadingComment(true);
      // Call the FOOLPROOF API
      console.log('🔄 Calling foolproof API...');
      const result = await addCommentFoolproof(ticketId, newComment.trim(), selectedFiles);
      
      if (result.success) {
        console.log('✅ Comment added successfully!');
        
        // Create local comment for immediate display
        const attachmentData = selectedFiles.map(file => ({
          id: `att_${Date.now()}`,
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
          type: file.type.split('/')[1] || 'file'
        }));
        
        console.log('📎 Creating local comment with attachments:', {
          selectedFiles: selectedFiles.length,
          attachmentData: attachmentData.length,
          attachmentNames: attachmentData.map(a => a.name)
        });
        
        const localComment: Comment = {
          id: `local_${Date.now()}`,
          author: 'You',
          message: newComment.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAgent: false,
          attachments: attachmentData
        };
        
        // Add to comments immediately
        setComments(prev => [...prev, localComment]);
        
        // Clear form
        setNewComment('');
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        console.log('🎉 Comment with attachments added successfully!');
        
        console.log('🎉 Comment added and displayed locally!');
        
        // Try to refresh from API after a delay
        setTimeout(async () => {
          try {
            console.log('🔄 Refreshing from API...');
            const ticketsResult = await ApiService.getTickets(1, 1000);
            
            if (ticketsResult.success && ticketsResult.data?.data) {
              let tickets = [];
              if (Array.isArray(ticketsResult.data.data)) {
                tickets = ticketsResult.data.data;
              } else if (ticketsResult.data.data && typeof ticketsResult.data.data === 'object' && Array.isArray(ticketsResult.data.data.data)) {
                tickets = ticketsResult.data.data.data;
              }
              
              const currentTicket = tickets.find((ticket: any) => 
                ticket.id === ticketId || ticket.ticket_number === ticketId
              );
              
              if (currentTicket && currentTicket.notes && Array.isArray(currentTicket.notes)) {
                console.log('✅ Found notes in API:', currentTicket.notes.length);
                
                const apiComments: Comment[] = currentTicket.notes.map((note: any, index: number) => ({
                  id: `api-note-${note.id || index}`,
                  author: note.created_by || 'You',
                  message: note.note,
                  timestamp: note.created_at || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isAgent: true,
                  attachments: note.documents ? note.documents.map((doc: string, docIndex: number) => ({
                    id: `doc-${index}-${docIndex}`,
                    name: doc.split('/').pop() || 'Attachment',
                    size: 'Unknown',
                    type: doc.split('.').pop() || 'file',
                    url: doc
                  })) : []
                }));
                
                setComments(apiComments);
                console.log('✅ Comments updated from API - now showing as You');
              }
            }
          } catch (error) {
            console.log('⚠️ API refresh failed, but local comment is still visible');
          }
        }, 3000);
        
      } else {
        console.log('❌ API call failed:', result.error);
        alert(`Failed to add comment: ${result.error}`);
      }
      
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      alert(`Error adding comment: ${error}`);
    } finally {
      setIsUploadingComment(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('🔍 Enter key pressed');
      handleAddComment();
    }
  };

  // Filter tickets based on search, status, and priority
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.priority.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
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
                <div className={`sidebar-ticket-priority priority-${ticket.priority.toLowerCase()}`}>
                  {ticket.priority}
                </div>
                <div 
                  className={`sidebar-ticket-status status-${ticket.status.toLowerCase().replace('-', '')}`}
                  style={getStatusStyling(ticket.status)}
                >
                  {ticket.status}
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
          {comments.map((comment) => {
            console.log('🔍 Rendering comment:', {
              id: comment.id,
              author: comment.author,
              hasAttachments: !!comment.attachments,
              attachmentCount: comment.attachments?.length || 0,
              attachmentNames: comment.attachments?.map(a => a.name) || []
            });
            
            return (
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
            );
          })}
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
                onClick={() => {
                  console.log('📎 Attachment button clicked');
                  if (fileInputRef.current) {
                    console.log('📎 File input ref exists, triggering click');
                    fileInputRef.current.click();
                  } else {
                    console.log('❌ File input ref is null');
                  }
                }}
              >
                📎 Attach Files
              </label>
              <button 
                className="add-comment-btn" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔍 Button clicked');
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
            <span className="meta-label">User Email:</span>
            <span className="meta-value">{ticket.userEmail || 'No email'}</span>
          </div>
          
          <div className="meta-item">
            <span className="meta-label">User Phone:</span>
            <span className="meta-value">{ticket.userPhone || 'No phone'}</span>
          </div>
          
          <div className="meta-item">
            <span className="meta-label">Status:</span>
            <div className="status-container">
              <span className="status-icon">●</span>
              <span 
                className="status-text"
                style={{
                  ...getStatusStyling(ticket.status),
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.55rem',
                  fontWeight: '600'
                }}
              >
                {ticket.status}
              </span>
            </div>
          </div>
          
          <div className="meta-item">
            <span className="meta-label">Priority:</span>
            <span 
              className="priority-badge"
              style={{
                backgroundColor: ticket.priorityBgColor || '#e2e8f0',
                color: ticket.priorityTextColor || '#4a5568'
              }}
            >
              {ticket.priority}
            </span>
          </div>
          
          <div className="meta-item">
            <span className="meta-label">Created:</span>
            <span className="meta-value">{ticket.createdAt}</span>
          </div>
          
          <div className="meta-item">
            <span className="meta-label">Updated:</span>
            <span className="meta-value">{ticket.lastUpdated}</span>
          </div>
        </div>

        <div className="attachments-section">
          <div className="attachments-header">
            <h3>Attachments ({ticket.documents ? ticket.documents.length : 0})</h3>
            <button 
              className="show-all-btn"
              onClick={() => setShowAttachments(!showAttachments)}
            >
              {showAttachments ? 'Hide' : 'Show all'}
            </button>
          </div>
          
          
          {showAttachments && (
            <div className="attachments-list">
              {ticket.documents && ticket.documents.length > 0 ? (
                ticket.documents.map((doc: string, index: number) => (
                  <div key={index} className="attachment-item">
                    <span className="attachment-icon">📎</span>
                    <a 
                      href={doc} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="attachment-link"
                      style={{ color: '#3b82f6', textDecoration: 'underline' }}
                    >
                      {doc.split('/').pop() || 'Attachment'}
                    </a>
                    <button 
                      className="download-btn"
                      onClick={() => window.open(doc, '_blank')}
                    >
                      Download
                    </button>
                </div>
                ))
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
              <span className="customer-value">#{ticket.id}</span>
            </div>
            <div className="customer-item">
              <span className="customer-label">Name:</span>
              <span className="customer-value">{ticket.userName || 'Unknown User'}</span>
            </div>
            <div className="customer-item">
              <span className="customer-label">Email:</span>
              <span className="customer-value">{ticket.userEmail || 'No email'}</span>
            </div>
            <div className="customer-item">
              <span className="customer-label">Phone:</span>
              <span className="customer-value">{ticket.userPhone || 'No phone'}</span>
            </div>
            <div className="customer-item">
              <span className="customer-label">Status:</span>
              <span 
                className="temperament-badge"
                style={getStatusStyling(ticket.status)}
              >
                {ticket.status}
              </span>
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