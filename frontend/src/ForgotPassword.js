import React, { useState } from 'react';
import axios from 'axios';

function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminName, setAdminName] = useState('');

  // Step 1: Send OTP to email
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('email', email);

      const response = await axios.post('https://smart-attendance-backend-f3my.onrender.com/admin/send-otp', formData);

      if (response.data.status === 'success') {
        setMessage('success:' + response.data.message);
        setTimeout(() => {
          setStep(2); // Move to OTP verification step
          setMessage('');
        }, 1500);
      } else {
        setMessage('error:' + response.data.message);
      }
    } catch (error) {
      setMessage('error:Failed to send OTP: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('otp', otp);

      const response = await axios.post('https://smart-attendance-backend-f3my.onrender.com/admin/verify-otp', formData);

      if (response.data.status === 'success') {
        setMessage('success:OTP verified successfully!');
        setAdminName(response.data.data.name);
        setTimeout(() => {
          setStep(3); // Move to password reset step
          setMessage('');
        }, 1500);
      } else {
        setMessage('error:' + response.data.message);
      }
    } catch (error) {
      setMessage('error:Verification failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage('error:Passwords do not match!');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('error:Password must be at least 6 characters!');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('otp', otp);
      formData.append('new_password', newPassword);

      const response = await axios.post('https://smart-attendance-backend-f3my.onrender.com/admin/reset-password-with-otp', formData);

      if (response.data.status === 'success') {
        setMessage('success:' + response.data.message);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
        }, 2000);
      } else {
        setMessage('error:' + response.data.message);
      }
    } catch (error) {
      setMessage('error:Failed to reset password: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getAlertClass = () => {
    if (!message) return '';
    return message.startsWith('success:') ? 'alert alert-success' : 'alert alert-error';
  };

  const getAlertMessage = () => {
    if (!message) return '';
    return message.split(':')[1];
  };

  const handleBack = () => {
    setMessage('');
    if (step === 2) {
      setOtp('');
      setStep(1);
    } else if (step === 3) {
      setNewPassword('');
      setConfirmPassword('');
      setStep(2);
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
        
        {/* Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: 'var(--space-xl)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--primary-blue)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-md)',
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--white)',
            letterSpacing: '-0.5px'
          }}>
            SA
          </div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--gray-900)',
            margin: '0'
          }}>
            Smart Attendance
          </h3>
        </div>

        {/* Progress Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-xl)',
          position: 'relative'
        }}>
          {/* Progress Line */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            right: '16px',
            height: '2px',
            background: 'var(--gray-300)',
            zIndex: '0'
          }}>
            <div style={{
              height: '100%',
              background: 'var(--primary-blue)',
              width: step === 1 ? '0%' : step === 2 ? '50%' : '100%',
              transition: 'width 0.3s ease'
            }}></div>
          </div>

          {/* Step 1 */}
          <div style={{ flex: '1', textAlign: 'center', position: 'relative', zIndex: '1' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: step >= 1 ? 'var(--primary-blue)' : 'var(--gray-300)',
              color: 'var(--white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-sm)',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}>
              1
            </div>
            <div style={{
              fontSize: '12px',
              fontWeight: '500',
              color: step >= 1 ? 'var(--gray-900)' : 'var(--gray-500)'
            }}>
              Email
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ flex: '1', textAlign: 'center', position: 'relative', zIndex: '1' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: step >= 2 ? 'var(--primary-blue)' : 'var(--gray-300)',
              color: 'var(--white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-sm)',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}>
              2
            </div>
            <div style={{
              fontSize: '12px',
              fontWeight: '500',
              color: step >= 2 ? 'var(--gray-900)' : 'var(--gray-500)'
            }}>
              Verify OTP
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ flex: '1', textAlign: 'center', position: 'relative', zIndex: '1' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: step >= 3 ? 'var(--primary-blue)' : 'var(--gray-300)',
              color: 'var(--white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-sm)',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}>
              3
            </div>
            <div style={{
              fontSize: '12px',
              fontWeight: '500',
              color: step >= 3 ? 'var(--gray-900)' : 'var(--gray-500)'
            }}>
              New Password
            </div>
          </div>
        </div>

        {/* Step 1: Email Input */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: 'var(--space-sm)',
                textAlign: 'center'
              }}>
                Reset Password
              </h1>
              <p style={{
                fontSize: '15px',
                color: 'var(--gray-700)',
                textAlign: 'center',
                margin: '0'
              }}>
                Enter your email address to receive an OTP
              </p>
            </div>

            <form onSubmit={handleSendOTP}>
              <div className="form-group">
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--space-sm)',
                  color: 'var(--gray-900)',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="admin@institute.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
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
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          </>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <>
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: 'var(--space-sm)',
                textAlign: 'center'
              }}>
                Enter OTP
              </h1>
              <p style={{
                fontSize: '15px',
                color: 'var(--gray-700)',
                textAlign: 'center',
                margin: '0'
              }}>
                We've sent a 6-digit code to<br />
                <strong>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifyOTP}>
              <div className="form-group">
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--space-sm)',
                  color: 'var(--gray-900)',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  OTP Code
                </label>
                <input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  autoFocus
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '24px',
                    background: 'var(--white)',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '6px',
                    color: 'var(--gray-900)',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontFamily: "'Courier New', monospace",
                    fontWeight: '700',
                    transition: 'all 0.2s'
                  }}
                />
                <p style={{
                  fontSize: '13px',
                  color: 'var(--gray-600)',
                  marginTop: 'var(--space-sm)',
                  textAlign: 'center'
                }}>
                  Code expires in 10 minutes
                </p>
              </div>

              <button 
                type="submit"
                className="btn btn-primary"
                disabled={loading || otp.length !== 6}
                style={{
                  width: '100%',
                  marginTop: 'var(--space-lg)',
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <button 
                type="button"
                className="btn btn-secondary"
                onClick={handleBack}
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: 'var(--space-md)',
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Back to Email
              </button>
            </form>

            {/* Resend OTP */}
            <div style={{
              textAlign: 'center',
              marginTop: 'var(--space-lg)',
              fontSize: '14px',
              color: 'var(--gray-700)'
            }}>
              Didn't receive the code?{' '}
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setStep(1);
                  setOtp('');
                  setMessage('');
                }}
                style={{
                  color: 'var(--primary-blue)',
                  textDecoration: 'none',
                  fontWeight: '600'
                }}
              >
                Resend OTP
              </a>
            </div>
          </>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <>
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: 'var(--space-sm)',
                textAlign: 'center'
              }}>
                Create New Password
              </h1>
              <p style={{
                fontSize: '15px',
                color: 'var(--gray-700)',
                textAlign: 'center',
                margin: '0'
              }}>
                Hello <strong>{adminName}</strong>, set your new password
              </p>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--space-sm)',
                  color: 'var(--gray-900)',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
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
                  Confirm New Password
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
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>

              <button 
                type="button"
                className="btn btn-secondary"
                onClick={handleBack}
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: 'var(--space-md)',
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Back to OTP
              </button>
            </form>
          </>
        )}

        {/* Message Alert */}
        {message && (
          <div className={getAlertClass()} style={{ marginTop: 'var(--space-lg)' }}>
            {getAlertMessage()}
          </div>
        )}

        {/* Back to Login Link */}
        {step === 1 && (
          <div style={{
            textAlign: 'center',
            marginTop: 'var(--space-xl)',
            fontSize: '15px',
            color: 'var(--gray-700)'
          }}>
            Remember your password?{' '}
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
              Back to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;