import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logoImage from './blacklogo.png';
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
    console.log('Login component mounted');
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    
    if (isAuth) {
      window.location.href = '/tickets';
    }
    
    // Ensure form elements are properly initialized
    setTimeout(() => {
      const inputs = document.querySelectorAll('.login-container input');
      const button = document.querySelector('.login-container button');
      console.log('Login form elements found:', { inputs: inputs.length, button: !!button });
      
      // Force enable pointer events
      inputs.forEach(input => {
        input.style.pointerEvents = 'auto';
        input.style.cursor = 'text';
      });
      
      if (button) {
        button.style.pointerEvents = 'auto';
        button.style.cursor = 'pointer';
      }
    }, 100);
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Input change detected:', e.target.name, e.target.value);
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('Form submit triggered');
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Check if user is already authenticated
    const isAlreadyAuth = localStorage.getItem('isAuthenticated') === 'true';
    
    if (isAlreadyAuth) {
      window.dispatchEvent(new CustomEvent('authChange'));
      window.location.href = '/tickets';
      return;
    }

    try {
      console.log('Attempting login with:', formData.username);
      const result = await ApiService.login(formData.username, formData.password);
      console.log('Login API result:', result);

      if (result.success && result.data.status === '1') {
        console.log('Login successful, storing auth data...');
        
        // Store authentication data
        localStorage.setItem('isAuthenticated', 'true');
        
        const token = result.data.token || 
                     result.data.auth_tokens || 
                     result.data.access_token || 
                     result.data.authToken;
        
        if (token) {
          localStorage.setItem('authToken', token);
          console.log('Token stored:', token);
        }
        
        // Store user data
        let userDataToStore = null;
        
        if (result.data.user) {
          userDataToStore = result.data.user;
        } else if (result.data.name || result.data.email || result.data.username || result.data.user_name) {
          userDataToStore = {
            name: result.data.name || result.data.username || result.data.user_name,
            email: result.data.email,
            id: result.data.id,
            username: result.data.username || result.data.user_name
          };
        }
        
        if (userDataToStore) {
          localStorage.setItem('userData', JSON.stringify(userDataToStore));
          console.log('User data stored:', userDataToStore);
        }

        console.log('Dispatching auth events...');
        // Dispatch custom event to notify App component
        window.dispatchEvent(new CustomEvent('authChange'));
        window.dispatchEvent(new CustomEvent('userDataUpdated'));

        console.log('Redirecting to tickets...');
        // Use a small delay to ensure localStorage is updated
        setTimeout(() => {
          window.location.href = '/tickets';
        }, 100);
      } else {
        console.log('Login failed:', result);
        setError(result.data?.message || result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="login-container" 
      onClick={() => setError('')}
      onMouseDown={(e) => {
        console.log('Login container clicked');
        // Ensure form elements are clickable
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'BUTTON') {
          target.style.pointerEvents = 'auto';
          target.style.cursor = target.tagName === 'INPUT' ? 'text' : 'pointer';
        }
      }}
    >
      {/* Clean professional background */}
      
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
            <h1 className="login-title">Welcome Back!</h1>
            <p className="login-subtitle">Enter your information to access your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleInputChange}
                required
                className="simple-input"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="simple-input"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={isLoading} className={`login-button ${isLoading ? 'loading' : ''}`}>
              {isLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  Signing In...
                </>
              ) : (
                'Log In'
              )}
            </button>

         
          </form>

         
        </div>
      </div>
    </div>
  );
};

export default Login;
