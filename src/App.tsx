import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import Header from './components/Layout/Header';
import TicketList from './pages/TicketList/TicketList';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      // Check if user is already authenticated
      const isAuth = localStorage.getItem('isAuthenticated') === 'true';
      const token = localStorage.getItem('authToken');
      
      console.log('App auth check on mount:', {
        isAuth,
        token: token ? 'exists' : 'missing',
        allLocalStorage: {
          isAuthenticated: localStorage.getItem('isAuthenticated'),
          authToken: localStorage.getItem('authToken'),
          userData: localStorage.getItem('userData')
        }
      });
      
      if (isAuth && token) {
        setIsAuthenticated(true);
        console.log('User is authenticated - staying logged in');
        console.log('Authentication will persist across page refreshes');
      } else {
        setIsAuthenticated(false);
        console.log('User is not authenticated - showing login page');
        // Clear any invalid authentication data
        if (isAuth && !token) {
          console.log('Clearing invalid auth data (isAuth=true but no token)');
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('userData');
        }
      }
      
      setIsLoading(false);
    };

    // Add a small delay to ensure localStorage is fully available
    const timeoutId = setTimeout(checkAuth, 100);
    
    return () => clearTimeout(timeoutId);

    // Listen for storage changes (logout from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isAuthenticated') {
        setIsAuthenticated(e.newValue === 'true');
      }
    };

    // Listen for custom authentication events from the same tab
    const handleAuthChange = () => {
      const authStatus = localStorage.getItem('isAuthenticated');
      console.log('Auth change event received, authStatus:', authStatus);
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
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  console.log('App render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="app">
      <Header onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Navigate to="/tickets" replace />} />
        <Route path="/tickets" element={<TicketList />} />
        <Route path="*" element={<Navigate to="/tickets" replace />} />
      </Routes>
      
    </div>
  );
}

export default App;