import React, { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './Home';
import Login from './Login';
import AdminRegister from './AdminRegister';
import ForgotPassword from './ForgotPassword';
import Register from './Register';
import MarkAttendance from './MarkAttendance';
import ViewStudents from './ViewStudents';
import ViewAttendance from './ViewAttendance';
import DressCodeManager from './DressCodeManager';
import CalendarModal from './CalendarModal';
import './App.css';

function App() {
  const [connected, setConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    // Test backend connection
    fetch('https://smart-attendance-backend-f3my.onrender.com//test')
      .then(res => res.json())
      .then(data => {
        setConnected(true);
      })
      .catch(err => {
        setConnected(false);
      });

    // Check for existing admin session
    const storedAdmin = localStorage.getItem('adminData');
    if (storedAdmin) {
      setAdminData(JSON.parse(storedAdmin));
      setIsAdminLoggedIn(true);
    }

    // Handle navigation from login/register links
    const handleNavigationEvent = (e) => {
      setCurrentPage(e.detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('navigate', handleNavigationEvent);
    
    return () => {
      window.removeEventListener('navigate', handleNavigationEvent);
    };
  }, []);

  const handleLogin = (admin) => {
    setAdminData(admin);
    setIsAdminLoggedIn(true);
    localStorage.setItem('adminData', JSON.stringify(admin));
    setCurrentPage('home');
  };

  const handleLogout = () => {
    setAdminData(null);
    setIsAdminLoggedIn(false);
    localStorage.removeItem('adminData');
    setCurrentPage('home');
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    switch(currentPage) {
      case 'login':
        return <Login onLogin={handleLogin} />;
      
      case 'admin-register':
        return <AdminRegister />;
      
      case 'forgot-password':
        return <ForgotPassword />;
      
      case 'register':
        return <Register />;
      
      case 'attendance':
        return <MarkAttendance />;
      
      case 'students':
        if (!isAdminLoggedIn) {
          return (
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <h2>Access Restricted</h2>
              <p style={{ fontSize: '16px', marginBottom: '24px', color: 'var(--gray-700)' }}>
                This page is only accessible to authenticated administrators.
              </p>
              <button className="btn btn-primary" onClick={() => handleNavigate('login')}>
                Login as Admin
              </button>
            </div>
          );
        }
        return <ViewStudents adminData={adminData} />;
      
      case 'records':
        if (!isAdminLoggedIn) {
          return (
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <h2>Access Restricted</h2>
              <p style={{ fontSize: '16px', marginBottom: '24px', color: 'var(--gray-700)' }}>
                This page is only accessible to authenticated administrators.
              </p>
              <button className="btn btn-primary" onClick={() => handleNavigate('login')}>
                Login as Admin
              </button>
            </div>
          );
        }
        return <ViewAttendance adminData={adminData} />;
      
      case 'dress-codes':
        if (!isAdminLoggedIn) {
          return (
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <h2>Access Restricted</h2>
              <p style={{ fontSize: '16px', marginBottom: '24px', color: 'var(--gray-700)' }}>
                This page is only accessible to authenticated administrators.
              </p>
              <button className="btn btn-primary" onClick={() => handleNavigate('login')}>
                Login as Admin
              </button>
            </div>
          );
        }
        return <DressCodeManager adminData={adminData} />;
      
      default:
        return <Home isAdminLoggedIn={isAdminLoggedIn} adminData={adminData} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="App">
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        style={{ marginTop: '60px' }}
      />

      {/* Field-Site Inspired Header */}
      <header className="field-header">
        <div className="field-header-container"> 
         {/* Logo Box - NOW WITH IMAGE - NO BORDER FIX */}
          <div 
            onClick={() => handleNavigate('home')} 
            style={{ 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              outline: 'none'
            }}
          >
            <img 
              src="/logo.jpeg" 
              alt="Smart Attendance Logo" 
              style={{
                height: '40px',
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
                border: 'none',
                outline: 'none',
                boxShadow: 'none'
              }}
              onError={(e) => {
                // Fallback to text if image fails to load
                e.target.style.display = 'none';
                const textNode = document.createTextNode('Smart Attendance');
                const wrapper = document.createElement('span');
                wrapper.appendChild(textNode);
                wrapper.style.cssText = 'font-weight: 700; font-size: 18px; color: var(--gray-900);';
                e.target.parentElement.appendChild(wrapper);
              }}
            />
          </div>
          
          {/* Navigation Links */}
          <nav className="field-nav">
            <button 
              className={currentPage === 'register' ? 'field-nav-link active' : 'field-nav-link'}
              onClick={() => handleNavigate('register')}
            >
              Register
            </button>
            <button 
              className={currentPage === 'attendance' ? 'field-nav-link active' : 'field-nav-link'}
              onClick={() => handleNavigate('attendance')}
            >
              Attendance
            </button>
            
            {isAdminLoggedIn ? (
              <>
                <button 
                  className={currentPage === 'students' ? 'field-nav-link active' : 'field-nav-link'}
                  onClick={() => handleNavigate('students')}
                >
                  Students
                </button>
                <button 
                  className={currentPage === 'records' ? 'field-nav-link active' : 'field-nav-link'}
                  onClick={() => handleNavigate('records')}
                >
                  Records
                </button>
                <button 
                  className={currentPage === 'dress-codes' ? 'field-nav-link active' : 'field-nav-link'}
                  onClick={() => handleNavigate('dress-codes')}
                >
                  Dress Codes
                </button>
                <button 
                  className="field-nav-link logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button 
                  className={currentPage === 'admin-register' ? 'field-nav-link active' : 'field-nav-link'}
                  onClick={() => handleNavigate('admin-register')}
                >
                  Admin Register
                </button>
                <button 
                  className={currentPage === 'login' ? 'field-nav-link active' : 'field-nav-link'}
                  onClick={() => handleNavigate('login')}
                >
                  Login
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="field-main">
        {currentPage === 'home' ? (
          renderPage()
        ) : (
          <div className="content-container">
            {renderPage()}
          </div>
        )}
      </main>

      {/* Floating Calendar Icon - Hidden on login and admin-register pages */}
      {currentPage !== 'login' && currentPage !== 'admin-register' && (
        <button
          className="floating-calendar-btn"
          onClick={() => setShowCalendar(true)}
          title={isAdminLoggedIn ? "Manage Calendar" : "View Calendar"}
        >
          📅
        </button>
      )}

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        adminData={adminData}
      />
    </div>
  );
}

export default App;