import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logoImage from '../../assets/logo.webp';
import ApiService from '../../services/api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    const token = localStorage.getItem('authToken');
    
    if (isAuth && token) {
      console.log('User is already authenticated, redirecting to tickets');
      // Force redirect to ensure proper authentication state
      window.location.href = '/tickets';
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Check if user is already authenticated
    const isAlreadyAuth = localStorage.getItem('isAuthenticated') === 'true';
    const hasToken = localStorage.getItem('authToken');
    
    if (isAlreadyAuth && hasToken) {
      console.log('User is already authenticated, redirecting to tickets');
      window.dispatchEvent(new CustomEvent('authChange'));
      window.location.href = '/tickets';
      return;
    }

    // Clear any browser selection issues
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }

    try {
      const result = await ApiService.login(formData.username, formData.password);

      if (result.success && result.data.status === '1') {
        // Store authentication token
        localStorage.setItem('isAuthenticated', 'true');
        
        // Try to get token from different possible fields in the response
        console.log('🔍 Login API Response Fields:', {
          'result.data.token': result.data.token,
          'result.data.auth_tokens': result.data.auth_tokens,
          'result.data.access_token': result.data.access_token,
          'result.data.authToken': result.data.authToken,
          'All response keys': Object.keys(result.data)
        });
        
        const token = result.data.token || 
                     result.data.auth_tokens || 
                     result.data.access_token || 
                     result.data.authToken || 
                     'ebdb2d';
        
        localStorage.setItem('authToken', token);
        console.log('Stored token:', token);
        console.log('Full login response:', result.data);
        console.log('🔍 Login API Response Analysis:', {
          hasUser: !!result.data.user,
          hasName: !!result.data.name,
          hasEmail: !!result.data.email,
          hasUsername: !!result.data.username,
          hasUserName: !!result.data.user_name,
          userObject: result.data.user,
          allKeys: Object.keys(result.data),
          nameValue: result.data.name,
          emailValue: result.data.email
        });
        
        // Store user data if provided
        let userDataToStore = null;
        
        if (result.data.user) {
          console.log('🔍 Using result.data.user:', result.data.user);
          userDataToStore = result.data.user;
        } else if (result.data.name || result.data.email || result.data.username || result.data.user_name) {
          console.log('🔍 Creating user data from main response');
          userDataToStore = {
            name: result.data.name || result.data.username || result.data.user_name,
            email: result.data.email,
            id: result.data.id,
            username: result.data.username || result.data.user_name
          };
        }
        
        if (userDataToStore) {
          localStorage.setItem('userData', JSON.stringify(userDataToStore));
          console.log('✅ Stored userData:', userDataToStore);
        } else {
          console.log('❌ No user data found in API response');
        }

        console.log('Login successful:', result.data);

        // Dispatch custom event to notify App component
        window.dispatchEvent(new CustomEvent('authChange'));

        // Force a page reload to ensure authentication state is properly updated
        window.location.href = '/tickets';
      } else {
        setError(result.data?.message || result.error || 'Login failed. Please check your credentials.');
        console.log('Login failed:', result.data);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Check if it's a connection error (backend down)
      if (error.message && error.message.includes('ERR_CONNECTION_CLOSED')) {
        console.log('Backend server is down. Using offline mode.');
        
        // Use offline mode with mock authentication
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('authToken', 'offline_token_12345');
        localStorage.setItem('userData', JSON.stringify({
          name: 'Offline User',
          email: 'offline@example.com'
        }));
        
        // Redirect to tickets page
        window.location.href = '/tickets';
        return;
      }
      
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container" onClick={() => setError('')}>
      {/* Elegant floating orbs */}
      <div className="floating-particle"></div>
      <div className="floating-particle"></div>
      <div className="floating-particle"></div>
      <div className="floating-particle"></div>
      
      {/* Geometric shapes */}
      <div className="help-desk-icon"></div>
      <div className="help-desk-icon"></div>
      <div className="help-desk-icon"></div>
      <div className="help-desk-icon"></div>
      
      <div className="">
        <div className="login-card" onClick={(e) => e.stopPropagation()}>
          <div className="login-header">
            <div className="login-logo">
              <img 
                src={logoImage} 
                alt="Helpdesk Logo" 
                className="logo-image"
              />
            </div>
            <p className="login-subtitle">Your Support Hub</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <div className="input-container">
                <div className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="login-input"
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="input-container">
                <div className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="login-input"
                  autoComplete="current-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className={`login-button ${isLoading ? 'loading' : ''}`}>
              {isLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
