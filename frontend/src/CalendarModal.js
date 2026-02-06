import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';

function CalendarModal({ isOpen, onClose, adminData }) {
  const [holidays, setHolidays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
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

  const isDateHoliday = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const holiday = holidays.find(h => h.date === dateStr);
    
    if (holiday) {
      return { 
        isHoliday: holiday.is_holiday, 
        reason: holiday.reason,
        isCustom: true 
      };
    }

    if (isWeekend) {
      return { 
        isHoliday: true, 
        reason: dayOfWeek === 0 ? 'Sunday' : 'Saturday',
        isCustom: false 
      };
    }

    return { isHoliday: false, reason: null, isCustom: false };
  };

  const handleDateClick = (date) => {
    if (!isAdmin || loading) return;

    const dateStr = date.toISOString().split('T')[0];
    const dateInfo = isDateHoliday(date);
    
    setSelectedDate(date);
    
    // Set current status
    if (dateInfo.isHoliday) {
      setSelectedStatus('holiday');
    } else {
      setSelectedStatus('working');
    }
    
    // Set existing reason if any
    const existing = holidays.find(h => h.date === dateStr);
    setReason(existing?.reason || '');
    
    // Clear message
    setMessage('');
  };

  const handleApplyChanges = async () => {
    if (!selectedDate || !selectedStatus) return;

    setLoading(true);
    setMessage('');

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const isHoliday = selectedStatus === 'holiday';

      const formData = new FormData();
      formData.append('institute_id', adminData.institute_id);
      formData.append('date', dateStr);
      formData.append('is_holiday', isHoliday);
      if (reason.trim()) {
        formData.append('reason', reason.trim());
      }

      const response = await axios.post(`${process.env.REACT_APP_API_URL}/admin/toggle-holiday`, formData);
      
      if (response.data.status === 'success') {
        setMessage('success:' + response.data.message);
        await fetchHolidays();
        
        setTimeout(() => {
          setMessage('');
          setSelectedDate(null);
          setSelectedStatus('');
          setReason('');
        }, 2000);
      } else {
        setMessage('error:' + response.data.message);
      }
    } catch (error) {
      setMessage('error:Failed to update');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedDate(null);
    setSelectedStatus('');
    setReason('');
    setMessage('');
  };

  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return '';

    const { isHoliday, isCustom } = isDateHoliday(date);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Highlight selected date
    if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
      return 'selected-tile';
    }
    
    if (isCustom) {
      if (isHoliday) {
        return 'holiday-tile';
      } else {
        return 'custom-working-tile';
      }
    }
    
    if (isWeekend) return 'weekend-tile';
    return 'working-tile';
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return '';
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return selectedDate.toLocaleDateString('en-US', options);
  };

  const getCurrentStatus = () => {
    if (!selectedDate) return '';
    
    const dateInfo = isDateHoliday(selectedDate);
    const dayOfWeek = selectedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (dateInfo.isCustom) {
      return dateInfo.isHoliday ? 'Custom Holiday' : `Custom Working Day${isWeekend ? ' (Weekend Override)' : ''}`;
    }
    
    if (isWeekend) {
      return `Weekend (${dateInfo.reason})`;
    }
    
    return 'Regular Working Day';
  };

  if (!isOpen) return null;

  return (
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div className="calendar-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-modal-header">
          <h3>📅 {isAdmin ? 'Manage Calendar' : 'View Calendar'}</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="calendar-modal-body">
          {isAdmin && (
            <div className="calendar-instructions">
              <p><strong>Click any date</strong> to view and change its status.</p>
            </div>
          )}

          {!isAdmin && (
            <div className="alert alert-info">
              View-only mode. Contact your admin to manage calendar.
            </div>
          )}

          <div className="calendar-wrapper">
            <Calendar
              onClickDay={isAdmin ? handleDateClick : null}
              tileClassName={getTileClassName}
              minDate={new Date()}
              tileDisabled={() => loading}
            />
          </div>

          {isAdmin && (
            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-color weekend-color"></span>
                <span>Weekend</span>
              </div>
              <div className="legend-item">
                <span className="legend-color holiday-color"></span>
                <span>Holiday</span>
              </div>
              <div className="legend-item">
                <span className="legend-color working-color"></span>
                <span>Working Day</span>
              </div>
              <div className="legend-item">
                <span className="legend-color custom-working-color"></span>
                <span>Weekend Override</span>
              </div>
            </div>
          )}

          {/* Beautiful Dropdown Panel */}
          {isAdmin && selectedDate && (
            <div className="date-edit-panel">
              <div className="panel-header">
                <div className="panel-date">{formatSelectedDate()}</div>
                <div className="panel-current-status">
                  Current: <span className="status-badge">{getCurrentStatus()}</span>
                </div>
              </div>

              <div className="panel-body">
                <div className="form-group">
                  <label>Set Status</label>
                  <div className="status-options">
                    <button
                      type="button"
                      className={`status-option ${selectedStatus === 'working' ? 'active working' : ''}`}
                      onClick={() => setSelectedStatus('working')}
                      disabled={loading}
                    >
                      <span className="option-icon">✓</span>
                      <span className="option-text">Working Day</span>
                    </button>
                    <button
                      type="button"
                      className={`status-option ${selectedStatus === 'holiday' ? 'active holiday' : ''}`}
                      onClick={() => setSelectedStatus('holiday')}
                      disabled={loading}
                    >
                      <span className="option-icon">🎉</span>
                      <span className="option-text">Holiday</span>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Diwali, Sports Day, Special Event"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="reason-input"
                    disabled={loading}
                  />
                </div>

                <div className="panel-actions">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyChanges}
                    className="btn btn-primary"
                    disabled={loading || !selectedStatus}
                  >
                    {loading ? 'Saving...' : 'Apply Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className={message.startsWith('success:') ? 'alert alert-success' : 'alert alert-error'} style={{ marginTop: '16px' }}>
              {message.split(':')[1]}
            </div>
          )}

          {loading && !selectedDate && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <div className="spinner"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarModal;