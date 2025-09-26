export interface Ticket {
  id: string;
  helpDeskId: string;
  name: string;
  email: string;
  department: string;
  category: string;
  subject: string;
  description: string;
  status: 'New' | 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assignedTo?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'user';
}


