import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function DressCodeManager({ adminData }) {
  const [dressType, setDressType] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dressCodes, setDressCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processStep, setProcessStep] = useState('');

  useEffect(() => {
    if (adminData) {
      fetchDressCodes();
    }
  }, [adminData]);

  const fetchDressCodes = async () => {
    try {
      const response = await axios.get(`https://smart-attendance-backend-f3my.onrender.com/admin/dress-codes/${adminData.institute_id}`);
      
      if (response.data.status === 'success') {
        setDressCodes(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch dress codes:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select an image!');
      return;
    }

    setLoading(true);

    try {
      setProcessStep('Uploading image...');
      
      const formData = new FormData();
      formData.append('institute_id', adminData.institute_id);
      formData.append('dress_type', dressType);
      formData.append('photo', selectedFile);

      const response = await axios.post('https://smart-attendance-backend-f3my.onrender.com/admin/dress-code/upload', formData);

      if (response.data.status === 'success') {
        setProcessStep('Upload complete');
        toast.success(response.data.message);
        setDressType('');
        setSelectedFile(null);
        setPreviewUrl(null);
        fetchDressCodes();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Upload failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
      setProcessStep('');
    }
  };

  const handleDelete = async (dressCodeId) => {
    if (!window.confirm('Are you sure you want to delete this dress code?')) {
      return;
    }

    try {
      const response = await axios.delete(`https://smart-attendance-backend-f3my.onrender.com/admin/dress-code/${dressCodeId}`);
      
      if (response.data.status === 'success') {
        toast.success('Dress code deleted successfully!');
        fetchDressCodes();
      }
    } catch (error) {
      toast.error('Delete failed: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="card">
      <h2>👔 Manage Dress Codes</h2>
      <p style={{ color: 'var(--gray-700)', marginBottom: '24px' }}>
        Institute: <strong>{adminData?.institute_name}</strong>
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label style={{
            display: 'block',
            marginBottom: 'var(--space-sm)',
            color: 'var(--gray-900)',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            Dress Type / Description
          </label>
          <input
            type="text"
            placeholder="e.g., Formal Shirt, Lab Coat, Uniform"
            value={dressType}
            onChange={(e) => setDressType(e.target.value)}
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              background: 'var(--white)',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              color: 'var(--gray-900)'
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
            Upload Image (PNG, JPG)
          </label>
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleFileChange}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              background: 'var(--white)',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            required
            disabled={loading}
          />
          <p style={{ 
            fontSize: '13px', 
            color: 'var(--gray-600)', 
            marginTop: 'var(--space-sm)' 
          }}>
            💡 Tip: Upload photos of people wearing the dress code items for best results
          </p>
        </div>

        {previewUrl && (
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <img 
              src={previewUrl} 
              alt="Preview" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '300px', 
                borderRadius: '8px',
                border: '1px solid var(--gray-300)'
              }} 
            />
          </div>
        )}

        {loading && processStep && (
          <div className="alert alert-info" style={{ marginBottom: '16px' }}>
            {processStep}
          </div>
        )}

        <button 
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Uploading...' : '📤 Upload Dress Code'}
        </button>
      </form>

      <div style={{ marginTop: '48px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '20px', color: 'var(--gray-900)' }}>
          📸 Uploaded Dress Codes ({dressCodes.length})
        </h3>

        {dressCodes.length === 0 ? (
          <div className="alert alert-warning">
            No dress codes uploaded yet. Upload some reference images above.
          </div>
        ) : (
          <div className="image-grid">
            {dressCodes.map((dc) => (
              <div key={dc.id} className="image-card">
                <img 
                  src={`data:image/jpeg;base64,${dc.image_data}`}
                  alt={dc.dress_type}
                />
                <h4>{dc.dress_type}</h4>
                <button
                  onClick={() => handleDelete(dc.id)}
                  className="btn btn-danger"
                  style={{ width: '100%', padding: '8px', marginTop: '12px' }}
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DressCodeManager;