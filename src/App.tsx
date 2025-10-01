import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import Login from './pages/Login/Login';
import Header from './components/Layout/Header';
import TicketList from './pages/TicketList/TicketList';
import TicketDetail from './pages/TicketDetail/TicketDetail';
import CreateTicketModal from './components/CreateTicketModal/CreateTicketModal';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import Loading from './components/Loading/Loading';
import ApiService from './services/api';

// Wrapper component to handle URL parameters for TicketDetail
const TicketDetailWrapper = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  
  const handleClose = () => {
    // Navigate to ticket list page
    window.location.href = '/tickets';
  };
  
  const handleTicketChange = (newTicketId: string) => {
    window.location.href = `/tickets/${newTicketId}`;
  };
  
  return (
    <TicketDetail 
      ticketId={ticketId || ''} 
      onClose={handleClose}
      onTicketChange={handleTicketChange}
    />
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = localStorage.getItem('isAuthenticated') === 'true';
      const token = localStorage.getItem('authToken');
      
      console.log('App auth check:', { isAuth, token: token ? 'exists' : 'missing' });
      
      // More lenient authentication check
      if (isAuth) {
        setIsAuthenticated(true);
        console.log('User authenticated, setting to true');
      } else {
        setIsAuthenticated(false);
        console.log('User not authenticated, setting to false');
        // Clear any invalid authentication data
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
      
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (logout from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isAuthenticated') {
        setIsAuthenticated(e.newValue === 'true');
      }
    };

    // Listen for custom authentication events from the same tab
    const handleAuthChange = () => {
      const authStatus = localStorage.getItem('isAuthenticated');
      setIsAuthenticated(authStatus === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChange', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return <Loading message="Initializing application..." size="large" />;
  }


  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Login />
      </ErrorBoundary>
    );
  }

        return (
          <ErrorBoundary>
            <div className="app">
              <Header onLogout={handleLogout} onCreateTicket={() => setShowCreateModal(true)} />
              <Routes>
                <Route path="/" element={<Navigate to="/tickets" replace />} />
                <Route path="/tickets" element={<TicketList />} />
                <Route path="/tickets/:ticketId" element={<TicketDetailWrapper />} />
                <Route path="*" element={<Navigate to="/tickets" replace />} />
              </Routes>
              
              {showCreateModal && (
                <CreateTicketModal onClose={() => setShowCreateModal(false)} />
              )}
              
            </div>
          </ErrorBoundary>
        );
}

export default App;