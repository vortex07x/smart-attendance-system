import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { toast } from 'react-toastify';

function MarkAttendance() {
  const webcamRef = useRef(null);
  const [image, setImage] = useState(null);
  const [instituteName, setInstituteName] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [currentStep, setCurrentStep] = useState('');
  const [holidayStatus, setHolidayStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const checkHolidayStatus = async () => {
    if (!instituteName.trim()) {
      toast.error('Please enter your institute name first!');
      return;
    }

    setCheckingStatus(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/check-holiday/${encodeURIComponent(instituteName.trim())}`
      );
      
      if (response.data.status === 'success') {
        setHolidayStatus(response.data);
        console.log('[DEBUG] Holiday status:', response.data);
        
        if (response.data.is_holiday) {
          toast.warning(`Today is a holiday (${response.data.reason})`);
        } else {
          toast.success('Today is a working day. You can mark attendance!');
        }
      }
    } catch (error) {
      console.error('Failed to check holiday status:', error);
      toast.error('Failed to check status. Please try again.');
      setHolidayStatus(null);
    } finally {
      setCheckingStatus(false);
    }
  };

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImage(imageSrc);
    setAttendanceData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!image) {
      toast.error('Please capture your photo first!');
      return;
    }

    if (!instituteName.trim()) {
      toast.error('Please enter your institute name!');
      return;
    }

    // Check status before allowing attendance
    if (!holidayStatus) {
      toast.error('Please check the status first using the "Check Status" button!');
      return;
    }

    if (holidayStatus.is_holiday) {
      toast.error(`Today is a holiday (${holidayStatus.reason}). Cannot mark attendance.`);
      return;
    }

    setLoading(true);
    setAttendanceData(null);

    try {
      setCurrentStep('Preparing verification...');
      const blob = await fetch(image).then(r => r.blob());
      
      const formData = new FormData();
      formData.append('institute_name', instituteName.trim());
      formData.append('photo', blob, 'attendance.jpg');

      setCurrentStep('Matching facial features...');
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/mark-attendance`, formData);
      
      if (response.data.status === 'success') {
        setCurrentStep('Verifying dress code...');
        setTimeout(() => {
          setCurrentStep('Attendance marked successfully');
          toast.success(response.data.message);
          setAttendanceData(response.data.data);
          
          // Auto reset after 8 seconds
          setTimeout(() => {
            setImage(null);
            setInstituteName('');
            setAttendanceData(null);
            setCurrentStep('');
            setHolidayStatus(null);
          }, 8000);
        }, 500);
      } else if (response.data.status === 'warning') {
        setCurrentStep('Attendance marked with warning');
        toast.warning(response.data.message);
        setAttendanceData(response.data.data);
        
        // Auto reset after 10 seconds
        setTimeout(() => {
          setImage(null);
          setInstituteName('');
          setAttendanceData(null);
          setCurrentStep('');
          setHolidayStatus(null);
        }, 10000);
      } else {
        toast.error(response.data.message);
        setCurrentStep('');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Attendance marking failed';
      toast.error(errorMsg);
      console.error('[ERROR] Attendance failed:', errorMsg);
      setCurrentStep('');
    } finally {
      setLoading(false);
    }
  };

  const renderDressCodeResults = () => {
    if (!attendanceData || !attendanceData.dress_code_details) return null;

    const dressCode = attendanceData.dress_code_details;

    // If no dress code requirements
    if (dressCode.message && dressCode.message.includes("No dress code")) {
      return (
        <div className="alert alert-info" style={{ marginTop: '16px' }}>
          No dress code requirements configured
        </div>
      );
    }

    // If error in dress code check
    if (dressCode.error) {
      return (
        <div className="alert alert-warning" style={{ marginTop: '16px' }}>
          Dress code check skipped (technical issue)
        </div>
      );
    }

    // Full dress code verification results
    return (
      <div className="details-card" style={{ marginTop: '16px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            Dress Code Verification
          </h4>
          <span className={dressCode.all_items_matched ? 'badge badge-success' : 'badge badge-warning'}>
            {dressCode.all_items_matched ? 'PASSED' : 'VIOLATION'}
          </span>
        </div>

        <div className="stats-grid" style={{ marginBottom: '16px' }}>
          <div style={{ 
            padding: '12px', 
            background: 'var(--gray-100)', 
            borderRadius: '6px',
            textAlign: 'center' 
          }}>
            <div style={{ fontSize: '12px', color: 'var(--gray-700)', marginBottom: '4px' }}>
              Total Items
            </div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--primary-blue)' }}>
              {dressCode.total_items}
            </div>
          </div>
          <div style={{ 
            padding: '12px', 
            background: 'var(--gray-100)', 
            borderRadius: '6px',
            textAlign: 'center' 
          }}>
            <div style={{ fontSize: '12px', color: 'var(--gray-700)', marginBottom: '4px' }}>
              Matched
            </div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--success-green)' }}>
              {dressCode.matched_items}
            </div>
          </div>
        </div>

        {dressCode.items && dressCode.items.length > 0 && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {dressCode.items.map((item, index) => (
              <div 
                key={index}
                className="detail-row"
                style={{ 
                  padding: '12px',
                  background: 'var(--white)',
                  borderRadius: '6px',
                  border: `1px solid ${item.matched ? 'var(--success-green)' : 'var(--warning-orange)'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '16px' }}>
                    {item.matched ? '✓' : '✗'}
                  </span>
                  <div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '500',
                      color: item.matched ? 'var(--success-green)' : 'var(--warning-orange)'
                    }}>
                      {item.dress_type}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                      {item.matched ? 'Detected' : 'Not detected'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>
                  {item.confidence}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render status badge
  const renderStatusBadge = () => {
    if (!holidayStatus) return null;

    if (holidayStatus.is_holiday) {
      return (
        <div className="status-badge-container holiday-status">
          <span className="status-icon">🎉</span>
          <div className="status-text">
            <div className="status-label">Holiday</div>
            <div className="status-reason">{holidayStatus.reason}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="status-badge-container working-status">
        <span className="status-icon">✓</span>
        <div className="status-text">
          <div className="status-label">Working Day</div>
          <div className="status-reason">You can mark attendance</div>
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <h2>Mark Attendance</h2>
      <p style={{ color: 'var(--gray-700)', marginBottom: '32px' }}>
        Verify your identity through facial recognition and dress code compliance.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Institute Name</label>
          <div className="institute-input-group">
            <input
              type="text"
              placeholder="Enter your institute name"
              value={instituteName}
              onChange={(e) => {
                setInstituteName(e.target.value);
                setHolidayStatus(null); // Reset status when name changes
              }}
              required
              disabled={loading}
              className="institute-input"
            />
            <button
              type="button"
              onClick={checkHolidayStatus}
              disabled={checkingStatus || loading || !instituteName.trim()}
              className="btn btn-check-status"
            >
              {checkingStatus ? (
                <>
                  <span className="spinner-small"></span>
                  Checking...
                </>
              ) : (
                <>
                  <span>📅</span>
                  Check Status
                </>
              )}
            </button>
          </div>
          <p className="form-hint">
            Click "Check Status" to verify if today is a working day
          </p>
        </div>

        {/* Status Badge Display */}
        {holidayStatus && renderStatusBadge()}

        {/* FIXED: Show webcam immediately, hide with overlay if holiday */}
        <div className="form-group">
          <label>Facial Verification</label>
          <p className="form-hint">
            Look directly at the camera for accurate recognition
          </p>
          
          {/* Webcam Container - Always visible */}
          <div className="webcam-container" style={{ position: 'relative' }}>
            {!image ? (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width="100%"
                videoConstraints={{
                  facingMode: "user"
                }}
              />
            ) : (
              <img src={image} alt="Verification capture" />
            )}
            
            {/* Overlay if holiday (after status check) */}
            {holidayStatus && holidayStatus.is_holiday && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 140, 0, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                textAlign: 'center',
                padding: '20px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                  Holiday Today
                </div>
                <div style={{ fontSize: '16px', opacity: 0.9 }}>
                  {holidayStatus.reason}
                </div>
                <div style={{ fontSize: '14px', marginTop: '12px', opacity: 0.8 }}>
                  Attendance marking is disabled
                </div>
              </div>
            )}
          </div>
          
          {/* Controls - Only show if NOT holiday */}
          {(!holidayStatus || !holidayStatus.is_holiday) && (
            <div className="webcam-controls">
              {!image ? (
                <button 
                  type="button"
                  onClick={capture}
                  className="btn btn-secondary"
                  disabled={loading || (holidayStatus && holidayStatus.is_holiday)}
                >
                  📸 Capture for Verification
                </button>
              ) : (
                <>
                  <button 
                    type="button"
                    onClick={() => setImage(null)}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    🔄 Retake Photo
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Verifying...' : '✓ Mark Attendance'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Show message when status not checked yet */}
        {!holidayStatus && instituteName.trim() && (
          <div className="alert alert-info" style={{ marginTop: '16px' }}>
            <strong>ℹ️ Action Required:</strong> Please click "Check Status" button to verify if today is a working day before marking attendance.
          </div>
        )}
      </form>

      {loading && currentStep && (
        <div className="process-steps">
          <div className={`process-step ${currentStep.includes('Preparing') ? 'active' : 'complete'}`}>
            <span className="step-icon">1</span>
            <span>Preparing verification</span>
          </div>
          <div className={`process-step ${currentStep.includes('Matching') ? 'active' : currentStep.includes('Verifying') || currentStep.includes('marked') ? 'complete' : ''}`}>
            <span className="step-icon">2</span>
            <span>Matching facial features</span>
          </div>
          <div className={`process-step ${currentStep.includes('Verifying') ? 'active' : currentStep.includes('marked') ? 'complete' : ''}`}>
            <span className="step-icon">3</span>
            <span>Verifying dress code</span>
          </div>
          <div className={`process-step ${currentStep.includes('marked') ? 'active' : ''}`}>
            <span className="step-icon">4</span>
            <span>Marking attendance</span>
          </div>
        </div>
      )}

      {attendanceData && (
        <div className="details-card">
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Attendance Details</h3>
          <div className="details-grid">
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{attendanceData.student}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Roll Number:</span>
              <span className="detail-value">{attendanceData.roll_number}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Department:</span>
              <span className="detail-value">{attendanceData.department}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">
                <span className={attendanceData.status.includes('Violation') ? 'badge badge-warning' : 'badge badge-success'}>
                  {attendanceData.status}
                </span>
              </span>
            </div>
            {attendanceData.match_confidence && (
              <div className="detail-row">
                <span className="detail-label">Face Match:</span>
                <span className="detail-value" style={{ color: 'var(--success-green)' }}>
                  {attendanceData.match_confidence}
                </span>
              </div>
            )}
          </div>

          {renderDressCodeResults()}
        </div>
      )}
    </div>
  );
}

export default MarkAttendance;