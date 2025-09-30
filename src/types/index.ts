export interface Ticket {
  id: string;
  helpDeskId?: string;
  name?: string;
  email?: string;
  department?: string;
  category?: string;
  subject?: string;
  description?: string;
  status: 'New' | 'Open' | 'In Progress' | 'Resolved' | 'Closed' | 'Active' | 'On-hold' | 'Overdue' | 'Assigned' | 'Suspend';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  priority_name?: string;
  priority_bg_color?: string;
  priority_text_color?: string;
  status_name?: string;
  status_bg_color?: string;
  status_text_color?: string;
  assignedTo?: string;
  createdAt: string;
  requester?: string;
  issue?: string;
  time?: string;
  badge?: number;
  attachments?: number;
  isOffline?: boolean;
  priorityBgColor?: string;
  priorityTextColor?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'user';
}


