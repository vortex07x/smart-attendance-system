import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function ViewAttendance({ adminData }) {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (adminData) {
      fetchAttendance();
    }
  }, [adminData]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`https://smart-attendance-backend-f3my.onrender.com//admin/attendance/${adminData.institute_id}/today`);
      
      if (response.data.status === 'success') {
        setAttendance(response.data.data || []);
      } else {
        toast.error('Failed to load attendance');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAttendance = async () => {
    if (!window.confirm('WARNING: This will DELETE ALL attendance records for your institute!\n\nThis action cannot be undone. Are you sure?')) {
      return;
    }

    setClearing(true);

    try {
      const response = await axios.delete(`https://smart-attendance-backend-f3my.onrender.com//admin/attendance/${adminData.institute_id}/clear`);
      
      if (response.data.status === 'success') {
        toast.success(response.data.message);
        setAttendance([]);
        
        setTimeout(() => {
          fetchAttendance();
        }, 2000);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to clear attendance');
    } finally {
      setClearing(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);

    try {
      console.log('[DEBUG] Downloading Excel report...');
      
      const response = await axios.get(
        `https://smart-attendance-backend-f3my.onrender.com//admin/export-attendance/${adminData.institute_id}`,
        {
          responseType: 'blob',
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Attendance_Report_${adminData.institute_name}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel report downloaded successfully!');
      
      console.log('[DEBUG] Download complete:', filename);
      
    } catch (error) {
      console.error('[ERROR] Download failed:', error);
      toast.error(error.response?.data?.message || 'Failed to download Excel report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card">
      <h2>📊 Today's Attendance</h2>
      <p style={{ color: 'var(--gray-700)', marginBottom: '20px' }}>
        Institute: <strong>{adminData?.institute_name}</strong>
      </p>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner"></div>
          <p className="loading-text">Loading attendance records...</p>
        </div>
      ) : attendance.length === 0 ? (
        <div className="alert alert-warning">
          No attendance records for today in your institute.
        </div>
      ) : (
        <>
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">Date</div>
              <div className="stat-number" style={{ fontSize: '18px' }}>
                {new Date().toLocaleDateString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{attendance.length}</div>
              <div className="stat-label">Present Today</div>
            </div>
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Roll Number</th>
                  <th>Department</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{record.student_name}</td>
                    <td>{record.roll_number}</td>
                    <td>{record.department}</td>
                    <td>{record.time}</td>
                    <td>
                      <span className={record.status === 'Present' ? 'badge badge-success' : 'badge badge-warning'}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={handleDownloadExcel}
              className="btn btn-primary"
              disabled={downloading || clearing}
              style={{ minWidth: '200px' }}
            >
              {downloading ? '⏳ Generating...' : '📥 Download Excel Report'}
            </button>
            
            <button 
              onClick={fetchAttendance}
              className="btn btn-secondary"
              disabled={clearing || downloading}
            >
              🔄 Refresh Records
            </button>
            
            <button 
              onClick={handleClearAttendance}
              className="btn btn-danger"
              disabled={clearing || downloading}
            >
              {clearing ? 'Clearing...' : '🗑️ Clear All Attendance'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ViewAttendance;