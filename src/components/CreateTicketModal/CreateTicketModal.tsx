import React, { useState, useEffect } from 'react';
import './CreateTicketModal.css';
import ApiService from '../../services/api';

interface CreateTicketModalProps {
  onClose: () => void;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: ''
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [loadingPriorities, setLoadingPriorities] = useState(true);

  // Load priorities on component mount
  useEffect(() => {
    const loadPriorities = async () => {
      console.log('Loading priorities on component mount...');
      console.log('Current auth state:', {
        isAuthenticated: localStorage.getItem('isAuthenticated'),
        authToken: localStorage.getItem('authToken') ? 'exists' : 'missing',
        userData: localStorage.getItem('userData') ? 'exists' : 'missing'
      });
      
      // Check authentication before making API call
      const isAuth = localStorage.getItem('isAuthenticated') === 'true';
      const token = localStorage.getItem('authToken');
      
      console.log('Authentication check:', {
        isAuth,
        token: token ? 'exists' : 'missing',
        tokenValue: token,
        allLocalStorage: {
          isAuthenticated: localStorage.getItem('isAuthenticated'),
          authToken: localStorage.getItem('authToken'),
          userData: localStorage.getItem('userData')
        }
      });
      
      if (!isAuth || !token) {
        console.log('User not authenticated, using fallback priorities');
        console.log('Setting fallback priorities because:', {
          isAuth,
          hasToken: !!token
        });
        setPriorities([
          { id: '1', name: 'Low' },
          { id: '2', name: 'High' }
        ]);
        setLoadingPriorities(false);
        return;
      }
      
      try {
        const result = await ApiService.getTicketPriorities(1);
        if (result.success && result.data.status === '1') {
          setPriorities(result.data.data || []);
          // Set first priority as default if available
          if (result.data.data && result.data.data.length > 0) {
            setFormData(prev => ({
              ...prev,
              priority: result.data.data[0].id || result.data.data[0].name || ''
            }));
          }
        } else {
          console.error('Failed to load priorities:', result.data);
          
          // Check if it's an authentication error
          if (result.authError) {
            console.log('Authentication error detected, using fallback priorities');
            // Don't redirect, just use fallback priorities
            setPriorities([
              { id: '1', name: 'Low' },
              { id: '2', name: 'High' }
            ]);
            return;
          }
          
          // Fallback to default priorities for other errors
          setPriorities([
            { id: '1', name: 'Low' },
            { id: '2', name: 'High' }
          ]);
        }
      } catch (error) {
        console.error('Error loading priorities:', error);
        // Fallback to default priorities
        setPriorities([
          { id: '1', name: 'Low' },
          { id: '2', name: 'High' }
        ]);
      } finally {
        setLoadingPriorities(false);
      }
    };

    loadPriorities();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const currentCount = attachments.length;
    const newFilesCount = files.length;
    const totalCount = currentCount + newFilesCount;
    
    if (totalCount > 2) {
      setError(`You can only upload a maximum of 2 attachments. You currently have ${currentCount} attachment(s) and tried to add ${newFilesCount} more. Please remove some attachments first.`);
      return;
    }
    
    if (newFilesCount > 2) {
      setError('You can only select up to 2 files at once.');
      return;
    }
    
    setAttachments(prev => [...prev, ...files]);
    setError(''); // Clear any previous errors
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Create ticket form submitted');
    setIsSubmitting(true);
    setError('');
    setSuccess(false);
    
    try {
      // Find the priority name from the selected ID
      const selectedPriority = priorities.find(p => (p.id || p.name) === formData.priority);
      const priorityName = selectedPriority ? (selectedPriority.name || selectedPriority.title || selectedPriority.label) : 'Low';
      const priorityId = selectedPriority ? (selectedPriority.id || selectedPriority.value) : '1';
      
      // Prepare ticket data for API
      const ticketData = {
        title: formData.title,
        description: formData.description,
        priority: priorityName, // Send priority name
        priority_id: priorityId, // Send priority ID
        priority_name: priorityName, // Send priority name as well
        attachments: attachments
      };

      console.log('Creating ticket:', ticketData);
      console.log('Priority mapping:', {
        selectedId: formData.priority,
        selectedPriority,
        priorityName,
        priorityId,
        allPriorities: priorities
      });
      
      console.log('🔍 Final priority being sent:', {
        'ticketData.priority': priorityName,
        'ticketData.priority_name': priorityName,
        'priorityName type': typeof priorityName,
        'priorityName value': priorityName
      });

      const result = await ApiService.createTicket(ticketData);

      if (result.success && result.data.status === '1') {
        setSuccess(true);
        console.log('Ticket created successfully:', result.data);
        
        // Store priority locally for this ticket
        const ticketId = result.data.data?.ticket_number || result.data.data?.id;
        if (ticketId && priorityName) {
          const localPriorities = JSON.parse(localStorage.getItem('ticketPriorities') || '{}');
          localPriorities[ticketId] = priorityName;
          localStorage.setItem('ticketPriorities', JSON.stringify(localPriorities));
          console.log('🔧 Stored priority locally:', { ticketId, priority: priorityName });
        }
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          priority: priorities.length > 0 ? (priorities[0].id || priorities[0].name) : ''
        });
        setAttachments([]);
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        // Check if it's an authentication error
        if (result.authError) {
          console.log('Authentication error detected, showing error message instead of redirecting');
          setError('Authentication failed. Please refresh the page and try again.');
          return;
        }
        
        setError(result.data?.message || result.error || 'Failed to create ticket. Please try again.');
        console.log('Create ticket failed:', result.data);
      }
    } catch (error) {
      console.error('Create ticket error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container">
        <div className="modal-header">
          <h2>Create New Ticket</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>


        <form onSubmit={handleSubmit} className="ticket-form">
          <div className="form-section">
            <h3>Ticket Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter ticket title"
                />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  disabled={loadingPriorities}
                >
                  {loadingPriorities ? (
                    <option value="">Loading priorities...</option>
                  ) : (
                    priorities.map((priority) => (
                      <option key={priority.id || priority.name} value={priority.id || priority.name}>
                        {priority.name || priority.title || priority.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                placeholder="Describe the issue in detail"
                rows={2}
              />
            </div>

          </div>

          <div className="form-section">
            <h3>Attachments</h3>
            <div className="attachment-info">
              <p className="attachment-limit-message">
                📎 You can upload up to 2 attachments (Maximum 2 files allowed)
              </p>
            </div>
            <div className="form-group">
              <label>Add Files</label>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="file-input"
                id="file-input"
                disabled={attachments.length >= 2}
              />
              <label 
                htmlFor="file-input" 
                className={`file-input-label ${attachments.length >= 2 ? 'disabled' : ''}`}
              >
                📎 Choose Files {attachments.length >= 2 ? '(Limit Reached)' : ''}
              </label>
              {attachments.length >= 2 && (
                <p className="limit-reached-message">
                  ⚠️ Maximum of 2 attachments reached. Remove an attachment to add more.
                </p>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="attachments-list">
                <h4>Selected Files ({attachments.length}/2)</h4>
                {attachments.map((file, index) => (
                  <div key={index} className="attachment-item">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="remove-attachment-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              Ticket created successfully! Redirecting...
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;


