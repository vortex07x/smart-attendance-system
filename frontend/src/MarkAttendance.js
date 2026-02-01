import React, { useRef, useState, useEffect } from 'react';
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
  const [checkingHoliday, setCheckingHoliday] = useState(false);

  // Check if today is a holiday whenever institute name changes
  useEffect(() => {
    if (instituteName.trim()) {
      checkHolidayStatus();
    } else {
      setHolidayStatus(null);
    }
  }, [instituteName]);

  const checkHolidayStatus = async () => {
    setCheckingHoliday(true);
    try {
      const response = await axios.get(`https://smart-attendance-backend-f3my.onrender.com/check-holiday/${instituteName}`);
      if (response.data.status === 'success') {
        setHolidayStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to check holiday status:', error);
      setHolidayStatus(null);
    } finally {
      setCheckingHoliday(false);
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

    // Check if today is a holiday before proceeding
    if (holidayStatus && holidayStatus.is_holiday) {
      toast.error(`Today is a holiday (${holidayStatus.reason}). Attendance marking is disabled.`);
      return;
    }

    setLoading(true);
    setAttendanceData(null);

    try {
      setCurrentStep('Preparing verification...');
      const blob = await fetch(image).then(r => r.blob());
      
      const formData = new FormData();
      formData.append('institute_name', instituteName);
      formData.append('photo', blob, 'attendance.jpg');

      setCurrentStep('Matching facial features...');
      const response = await axios.post('https://smart-attendance-backend-f3my.onrender.com/mark-attendance', formData);
      
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
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Attendance marking failed');
    } finally {
      setLoading(false);
      if (currentStep !== 'Attendance marked successfully' && currentStep !== 'Attendance marked with warning') {
        setCurrentStep('');
      }
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

  // Render holiday banner if today is a holiday
  const renderHolidayBanner = () => {
    if (!holidayStatus) return null;

    if (holidayStatus.is_holiday) {
      return (
        <div className="alert alert-warning" style={{ marginBottom: '24px' }}>
          <strong>🎉 Today is a holiday</strong> ({holidayStatus.reason})
          <br />
          <span style={{ fontSize: '14px' }}>Attendance marking is disabled for today.</span>
        </div>
      );
    }

    return (
      <div className="alert alert-success" style={{ marginBottom: '24px' }}>
        <strong>✅ Today is a working day</strong>
        <br />
        <span style={{ fontSize: '14px' }}>You can mark your attendance.</span>
      </div>
    );
  };

  return (
    <div className="card">
      <h2>Mark Attendance</h2>
      <p style={{ color: 'var(--gray-700)', marginBottom: '32px' }}>
        Verify your identity through facial recognition and dress code compliance.
      </p>

      {/* Holiday Status Banner */}
      {instituteName.trim() && !checkingHoliday && renderHolidayBanner()}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Institute Name</label>
          <input
            type="text"
            placeholder="Enter your institute name"
            value={instituteName}
            onChange={(e) => setInstituteName(e.target.value)}
            required
            disabled={loading}
          />
          {checkingHoliday && (
            <p className="form-hint" style={{ color: 'var(--primary-blue)', marginTop: '8px' }}>
              Checking holiday status...
            </p>
          )}
        </div>

        {/* Only show webcam if not a holiday */}
        {(!holidayStatus || !holidayStatus.is_holiday) && (
          <div className="form-group">
            <label>Facial Verification</label>
            <p className="form-hint">
              Look directly at the camera for accurate recognition
            </p>
            <div className="webcam-container">
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
            </div>
            <div className="webcam-controls">
              {!image ? (
                <button 
                  type="button"
                  onClick={capture}
                  className="btn btn-secondary"
                  disabled={loading || !instituteName.trim()}
                >
                  Capture for Verification
                </button>
              ) : (
                <>
                  <button 
                    type="button"
                    onClick={() => setImage(null)}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    Retake Photo
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Verifying...' : 'Mark Attendance'}
                  </button>
                </>
              )}
            </div>
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