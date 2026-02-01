import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const response = await axios.post('https://smart-attendance-backend-f3my.onrender.com/admin/login', formData);

      if (response.data.status === 'success') {
        toast.success('Login successful! Redirecting...');
        setTimeout(() => {
          onLogin(response.data.data);
        }, 1000);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Login failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--white)',
      padding: 'var(--space-lg)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--white)',
        border: '1px solid var(--gray-300)',
        borderRadius: '8px',
        padding: 'var(--space-2xl)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        
        {/* Logo - NOW WITH IMAGE */}
        <div style={{
          textAlign: 'center',
          marginBottom: 'var(--space-xl)'
        }}>
          <img 
            src="/logo.jpeg" 
            alt="Smart Attendance Logo"
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain',
              margin: '0 auto var(--space-md)',
              display: 'block',
              borderRadius: '12px'
            }}
            onError={(e) => {
              // Fallback to text logo if image fails
              e.target.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.style.cssText = `
                width: 64px;
                height: 64px;
                background: var(--primary-blue);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto var(--space-md);
                fontSize: 24px;
                font-weight: 700;
                color: var(--white);
                letter-spacing: -0.5px;
              `;
              fallback.textContent = 'SA';
              e.target.parentElement.insertBefore(fallback, e.target);
            }}
          />
          {/* <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--gray-900)',
            margin: '0'
          }}>
            Smart Attendance
          </h3> */}
        </div>

        {/* Title */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '600',
            color: 'var(--gray-900)',
            marginBottom: 'var(--space-sm)',
            textAlign: 'center'
          }}>
            Admin Login
          </h1>
          <p style={{
            fontSize: '15px',
            color: 'var(--gray-700)',
            textAlign: 'center',
            margin: '0'
          }}>
            Access your institute's dashboard
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{
              display: 'block',
              marginBottom: 'var(--space-sm)',
              color: 'var(--gray-900)',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              Email
            </label>
            <input
              type="email"
              placeholder="admin@institute.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                background: 'var(--white)',
                border: '1px solid var(--gray-300)',
                borderRadius: '6px',
                color: 'var(--gray-900)',
                transition: 'all 0.2s'
              }}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
              <label style={{
                color: 'var(--gray-900)',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                Password
              </label>
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'forgot-password' }));
                }}
                style={{
                  color: 'var(--primary-blue)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                background: 'var(--white)',
                border: '1px solid var(--gray-300)',
                borderRadius: '6px',
                color: 'var(--gray-900)',
                transition: 'all 0.2s'
              }}
            />
          </div>

          <button 
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 'var(--space-lg)',
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            {loading ? 'Logging in...' : 'Continue'}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          margin: 'var(--space-xl) 0',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            left: '0',
            right: '0',
            top: '50%',
            height: '1px',
            background: 'var(--gray-300)'
          }}></div>
          <span style={{
            position: 'relative',
            background: 'var(--white)',
            padding: '0 var(--space-md)',
            fontSize: '14px',
            color: 'var(--gray-500)',
            fontWeight: '500'
          }}>
            OR
          </span>
        </div>

        {/* Register Link */}
        <div style={{
          textAlign: 'center',
          fontSize: '15px',
          color: 'var(--gray-700)'
        }}>
          Don't have an account?{' '}
          <a 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'admin-register' }));
            }}
            style={{
              color: 'var(--primary-blue)',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            Register here
          </a>
        </div>
      </div>
    </div>
  );
}

export default Login;