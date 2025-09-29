import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import CreateTicketModal from '../CreateTicketModal/CreateTicketModal';
import logoImage from '../../assets/logo.webp';
import ApiService from '../../services/api';
import './Header.css';

interface HeaderProps {
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Initialize with user data from localStorage if available
  const getInitialUserName = () => {
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        return user.name || user.username || user.user_name || user.displayName || user.firstName || user.email || 'Admin';
      }
    } catch (error) {
      console.error('Error reading initial user data:', error);
    }
    return 'Admin';
  };

  const [userName, setUserName] = useState<string>(getInitialUserName());
  const userMenuRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Ensure user name is set correctly on mount
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const name = user.name || user.username || user.user_name || user.displayName || user.firstName || user.email || 'Admin';
        if (name !== userName) {
          console.log('🔍 Header: Updating userName from', userName, 'to', name);
          setUserName(name);
        }
      } catch (error) {
        console.error('Error parsing user data on mount:', error);
      }
    }
  }, []);

  // Get user name from localStorage
  useEffect(() => {
    const getUserName = () => {
      try {
        const userData = localStorage.getItem('userData');
        console.log('🔍 Header: Raw userData from localStorage:', userData);
        
        if (userData) {
          const user = JSON.parse(userData);
          console.log('🔍 Header: Parsed user object:', user);
          
          const name = user.name || 
                      user.username || 
                      user.user_name || 
                      user.displayName ||
                      user.firstName ||
                      user.email || 
                      'Admin';
          setUserName(name);
          console.log('🔍 Header: User name set to:', name);
        } else {
          console.log('🔍 Header: No user data found, using default');
          setUserName('Admin');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUserName('Admin');
      }
    };

    getUserName();
    
    // Listen for storage changes (when user data is updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userData') {
        console.log('🔍 Header: userData changed in localStorage');
        getUserName();
      }
    };
    
    // Listen for custom user data update event
    const handleUserDataUpdate = () => {
      console.log('🔍 Header: userData updated event received');
      getUserName();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userDataUpdated', handleUserDataUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleUserDataUpdate);
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await ApiService.logout();
      // Dispatch custom event to notify App component
      window.dispatchEvent(new CustomEvent('authChange'));
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still proceed with logout even if API call fails
      window.dispatchEvent(new CustomEvent('authChange'));
      if (onLogout) {
        onLogout();
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/dashboard" className="logo">
          <img src={logoImage} alt="Logo" className="logo-image" />
        </Link>

        <div className="header-actions" onClick={(e) => e.stopPropagation()}>
          <button 
            className="create-ticket-btn" 
            onClick={() => setShowCreateModal(true)}
            title="Create New Ticket"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Create Ticket
          </button>


          <div className="user-menu" ref={userMenuRef}>
            <button
              className="user-menu-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <span className="user-greeting">Hi, {userName}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <Link to="/profile" className="dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  My Profile
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="dropdown-item logout"
                  disabled={isLoggingOut}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2"/>
                    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showCreateModal && (
        <CreateTicketModal onClose={() => setShowCreateModal(false)} />
      )}
    </header>
  );
};

export default Header;
