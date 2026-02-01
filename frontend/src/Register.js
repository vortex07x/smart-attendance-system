import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { toast } from 'react-toastify';

function Register() {
  const webcamRef = useRef(null);
  const [image, setImage] = useState(null);
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [instituteName, setInstituteName] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImage(imageSrc);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!image) {
      toast.error('Please capture your photo first!');
      return;
    }

    setLoading(true);

    try {
      setCurrentStep('Preparing image data...');
      const blob = await fetch(image).then(r => r.blob());
      
      const formData = new FormData();
      formData.append('name', name);
      formData.append('roll_number', rollNumber);
      formData.append('department', department);
      formData.append('institute_name', instituteName);
      formData.append('photo', blob, 'photo.jpg');

      setCurrentStep('Extracting facial features...');
      const response = await axios.post('http://127.0.0.1:8000/register-student', formData);
      
      if (response.data.status === 'success') {
        setCurrentStep('Registration complete');
        toast.success(response.data.message);
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setName('');
          setRollNumber('');
          setDepartment('');
          setInstituteName('');
          setImage(null);
          setCurrentStep('');
        }, 3000);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Registration failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
      if (currentStep !== 'Registration complete') {
        setCurrentStep('');
      }
    }
  };

  return (
    <div className="card">
      <h2>Student Registration</h2>
      <p style={{ color: 'var(--gray-700)', marginBottom: '32px' }}>
        Register your biometric data for automated attendance marking.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <div>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter student's full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Roll Number / Student ID</label>
              <input
                type="text"
                placeholder="Enter unique roll number"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                placeholder="e.g., Computer Science"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Institute Name</label>
              <input
                type="text"
                placeholder="Enter institute name"
                value={instituteName}
                onChange={(e) => setInstituteName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <div className="form-group">
              <label>Facial Biometric Capture</label>
              <p className="form-hint">
                Position your face clearly in the camera frame
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
                  <img src={image} alt="Captured face" />
                )}
              </div>
              <div className="webcam-controls">
                {!image ? (
                  <button 
                    type="button"
                    onClick={capture}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    Capture Photo
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setImage(null)}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    Retake Photo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading && currentStep && (
          <div className="process-steps">
            <div className={`process-step ${currentStep.includes('Preparing') ? 'active' : 'complete'}`}>
              <span className="step-icon">1</span>
              <span>Preparing image data</span>
            </div>
            <div className={`process-step ${currentStep.includes('Extracting') ? 'active' : currentStep.includes('complete') ? 'complete' : ''}`}>
              <span className="step-icon">2</span>
              <span>Extracting facial features</span>
            </div>
            <div className={`process-step ${currentStep.includes('complete') ? 'active' : ''}`}>
              <span className="step-icon">3</span>
              <span>Saving to database</span>
            </div>
          </div>
        )}

        <button 
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%', marginTop: '16px' }}
        >
          {loading ? 'Processing Registration...' : 'Complete Registration'}
        </button>
      </form>
    </div>
  );
}

export default Register;