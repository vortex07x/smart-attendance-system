import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';

function CalendarModal({ isOpen, onClose, adminData }) {
  const [holidays, setHolidays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isAdmin = adminData && adminData.institute_id;

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchHolidays();
    }
  }, [isOpen, isAdmin]);

  const fetchHolidays = async () => {
    if (!isAdmin) return;

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/holidays/${adminData.institute_id}`);
      if (response.data.status === 'success') {
        setHolidays(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  };

  const handleRefresh = async () => {
    setMessage('');
    setReason('');
    setSelectedDate(null);
    await fetchHolidays();
  };

  const isDateHoliday = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Check if weekend (default behavior, but admin can override)
    const dayOfWeek = date.getDay(); // Sunday=0, Saturday=6
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Check custom holidays
    const holiday = holidays.find(h => h.date === dateStr);
    
    if (holiday) {
      // Admin has set custom status for this date
      return { 
        isHoliday: holiday.is_holiday, 
        reason: holiday.reason || (isWeekend ? 'Weekend' : 'Holiday'), 
        isWeekend: isWeekend,
        isCustom: true 
      };
    }

    // Default: weekends are holidays
    if (isWeekend) {
      return { isHoliday: true, reason: 'Weekend (Default)', isWeekend: true, isCustom: false };
    }

    return { isHoliday: false, reason: null, isWeekend: false, isCustom: false };
  };

  const handleDateClick = async (date) => {
    if (!isAdmin) return;

    setSelectedDate(date);
    
    const dateStr = date.toISOString().split('T')[0];
    const existing = holidays.find(h => h.date === dateStr);
    
    // Toggle holiday status
    const newStatus = existing ? !existing.is_holiday : true;
    
    await toggleHoliday(dateStr, newStatus);
  };

  const toggleHoliday = async (dateStr, isHoliday) => {
    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('institute_id', adminData.institute_id);
      formData.append('date', dateStr);
      formData.append('is_holiday', isHoliday);
      if (reason) {
        formData.append('reason', reason);
      }

      const response = await axios.post(`${process.env.REACT_APP_API_URL}/admin/toggle-holiday`, formData);
      
      if (response.data.status === 'success') {
        setMessage('success:' + response.data.message);
        await fetchHolidays(); // Refresh
        setReason(''); // Clear reason input
        
        // Auto-clear message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('error:' + response.data.message);
      }
    } catch (error) {
      setMessage('error:Failed to update holiday');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return '';

    const { isHoliday, isWeekend, isCustom } = isDateHoliday(date);
    
    // Custom override takes precedence
    if (isCustom) {
      if (isHoliday) {
        return isWeekend ? 'custom-weekend-holiday' : 'holiday-tile';
      } else {
        return 'custom-working-tile'; // Weekend marked as working day
      }
    }
    
    // Default behavior
    if (isWeekend) return 'weekend-tile';
    if (isHoliday) return 'holiday-tile';
    return 'working-tile';
  };

  const getTileContent = ({ date, view }) => {
    if (view !== 'month') return null;

    const { isHoliday, reason, isWeekend, isCustom } = isDateHoliday(date);
    
    if (isHoliday && reason && (isCustom || !isWeekend)) {
      return (
        <div className="tile-reason">
          {reason}
        </div>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div className="calendar-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-modal-header">
          <h3>📅 {isAdmin ? 'Manage Calendar' : 'View Calendar'}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isAdmin && (
              <button 
                className="modal-refresh-btn" 
                onClick={handleRefresh}
                title="Refresh Calendar"
              >
                🔄
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="calendar-modal-body">
          {isAdmin && (
            <div className="calendar-instructions">
              <p><strong>Click any date</strong> to toggle between holiday and working day.</p>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '8px' }}>
                💡 You can override weekends to make them working days if needed.
              </p>
            </div>
          )}

          {!isAdmin && (
            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              View-only mode. Contact your admin to manage calendar.
            </div>
          )}

          <div className="calendar-wrapper">
            <Calendar
              onClickDay={isAdmin ? handleDateClick : null}
              tileClassName={getTileClassName}
              tileContent={getTileContent}
              minDate={new Date()}
            />
          </div>

          {isAdmin && (
            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-color weekend-color"></span>
                <span>Weekend (Default Holiday)</span>
              </div>
              <div className="legend-item">
                <span className="legend-color holiday-color"></span>
                <span>Custom Holiday</span>
              </div>
              <div className="legend-item">
                <span className="legend-color working-color"></span>
                <span>Working Day</span>
              </div>
              <div className="legend-item">
                <span className="legend-color custom-working-color"></span>
                <span>Weekend → Working Day</span>
              </div>
            </div>
          )}

          {isAdmin && selectedDate && (
            <div className="reason-input-container">
              <label>Optional: Add reason for this date</label>
              <input
                type="text"
                placeholder="e.g., Diwali, Sports Day, Special Working Day"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="reason-input"
              />
            </div>
          )}

          {message && (
            <div className={message.startsWith('success:') ? 'alert alert-success' : 'alert alert-error'}>
              {message.split(':')[1]}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <div className="spinner"></div>
              <p className="loading-text">Updating calendar...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarModal;