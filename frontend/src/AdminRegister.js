import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function AdminRegister() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [instituteName, setInstituteName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters!');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('institute_name', instituteName);

      const response = await axios.post(`${process.env.REACT_APP_API_URL}/admin/register`, formData);

      if (response.data.status === 'success') {
        toast.success(response.data.message);
        // Reset form
        setTimeout(() => {
          setName('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setInstituteName('');
        }, 2000);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Registration failed: ' + (error.response?.data?.message || error.message));
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
        maxWidth: '520px',
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
            Admin Registration
          </h1>
          <p style={{
            fontSize: '15px',
            color: 'var(--gray-700)',
            textAlign: 'center',
            margin: '0'
          }}>
            Create an account to manage your institute
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{
              display: 'block',
              marginBottom: 'var(--space-sm)',
              color: 'var(--gray-900)',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
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
            <label style={{
              display: 'block',
              marginBottom: 'var(--space-sm)',
              color: 'var(--gray-900)',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              Institute Name
            </label>
            <input
              type="text"
              placeholder="Enter your institute name"
              value={instituteName}
              onChange={(e) => setInstituteName(e.target.value)}
              required
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
            <label style={{
              display: 'block',
              marginBottom: 'var(--space-sm)',
              color: 'var(--gray-900)',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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
            <label style={{
              display: 'block',
              marginBottom: 'var(--space-sm)',
              color: 'var(--gray-900)',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
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
            {loading ? 'Creating Account...' : 'Create Account'}
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

        {/* Login Link */}
        <div style={{
          textAlign: 'center',
          fontSize: '15px',
          color: 'var(--gray-700)'
        }}>
          Already have an account?{' '}
          <a 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
            }}
            style={{
              color: 'var(--primary-blue)',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            Login here
          </a>
        </div>
      </div>
    </div>
  );
}

export default AdminRegister;