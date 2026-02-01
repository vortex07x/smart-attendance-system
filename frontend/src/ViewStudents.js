import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function ViewStudents({ adminData }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (adminData) {
      fetchStudents();
    }
  }, [adminData]);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`https://smart-attendance-backend-f3my.onrender.com/admin/students/${adminData.institute_id}`);
      
      if (response.data.status === 'success') {
        setStudents(response.data.data || []);
      } else {
        toast.error('Failed to load students');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>👥 Registered Students</h2>
      <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px' }}>
        Institute: <strong>{adminData?.institute_name}</strong>
      </p>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner"></div>
          <p className="loading-text">Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="alert alert-warning">
          No students registered yet in your institute.
        </div>
      ) : (
        <>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px' }}>
            Total Students: <strong>{students.length}</strong>
          </p>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Roll Number</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student.id}>
                    <td>{index + 1}</td>
                    <td>{student.name}</td>
                    <td>{student.roll_number}</td>
                    <td>{student.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ViewStudents;